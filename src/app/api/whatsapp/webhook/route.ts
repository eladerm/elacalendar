import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { runChatbotFlow } from "@/ai/flows/chatbot-flow";
import { evaluateVisualBot } from "@/lib/visual-bot-engine";
import { whatsapp } from "@/lib/whatsapp";

// Verificación del Webhook de Meta (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  // Si Meta nos hace ping con el token correcto, devolvemos el challenge
  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error("❌ Verificación de webhook fallida");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

// Recepción de mensajes (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("📩 Payload entrante de WhatsApp:", JSON.stringify(body, null, 2));

    // Validar si es un evento de cuenta de WhatsApp Business
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          if (value?.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const senderPhone = message.from;
            const messageText = message.text?.body || "";

            console.log(`💬 Mensaje recibido de ${senderPhone}: ${messageText}`);

            // === FASE INICIAL: GUARDAR EL MENSAJE EN FIRESTORE ===
            if (!adminDb) {
               console.error("Firebase Admin no inicializado.");
               return new NextResponse("Internal Server Error", { status: 500 });
            }

            try {
               const chatId = senderPhone; // Usaremos el nro de teléfono como ID único de la sala de chat
               
               // 1. Guardar o Actualizar el Hilo (Thread) del Chat en crm_chats
               const chatRef = adminDb.collection("crm_chats").doc(chatId);
               const chatDoc = await chatRef.get();
               let isBotPaused = false;
               
               if (chatDoc.exists) {
                 const data = chatDoc.data();
                 isBotPaused = data?.botPaused === true;
                 await chatRef.update({
                   lastMessage: messageText,
                   lastTimestamp: FieldValue.serverTimestamp(),
                   unreadCount: FieldValue.increment(1),
                   status: 'open' // re-abre el caso automáticamente
                 });
               } else {
                 await chatRef.set({
                   waId: senderPhone,
                   name: `Cliente +${senderPhone}`, // Nombre por defecto hasta que lo cambiemos
                   lastMessage: messageText,
                   lastTimestamp: FieldValue.serverTimestamp(),
                   status: 'open',
                   unreadCount: 1,
                   countryCode: 'EC'
                 });
               }

               // 2. Guardar el nuevo mensaje (crm_messages) con el formato exacto que la UI lee
               await adminDb.collection("crm_messages").add({
                 chatId: chatId,
                 from: senderPhone,
                 to: 'business',
                 body: messageText,
                 type: message.type || 'text',
                 isIncoming: true,
                 status: 'delivered', // Entregado porque lo acabamos de capturar
                 timestamp: FieldValue.serverTimestamp(),
                 rawPayload: message
               });

               console.log("💾 Mensaje y Chat guardados correctamente en Firestore");

               // 3. Ejecutar Lógica de Chatbots
               if (!isBotPaused) {
                   // A. Intentar Ejecutar Motor Estructurado Visual
                   const { intercepted } = await evaluateVisualBot(messageText, chatId, adminDb, whatsapp);

                   // B. Si el flujo estructurado no interceptó el mensaje (ni estaba activo ni detonó), ejecutar IA
                   if (!intercepted) {
                      runChatbotFlow({ phone: senderPhone, text: messageText }).catch((err: any) => {
                        console.error("Error procesando Genkit flow:", err);
                      });
                   } else {
                      console.log("🔀 Motor Visual interceptó y gestionó el flujo estructurado.");
                   }
               } else {
                   console.log("⏸️ Bot pausado para este chat. Ignorando auto-respuesta.");
               }

            } catch (error) {
               console.error("Error guardando mensaje en Firestore", error);
            }

          }

          // Meta también envía actualizaciones de lectura/entrega (statuses)
          if (value?.statuses && value.statuses.length > 0) {
            const status = value.statuses[0];
            console.log(`✉️ Estado del mensaje actualizado: ${status.status} (ID: ${status.id})`);
          }
        }
      }
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } else {
      // Devolver a Meta 404 si el objeto no corresponde a whatsapp
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("❌ Error interno en Webhook WhatsApp", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
