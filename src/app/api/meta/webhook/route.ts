import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { runChatbotFlow } from "@/ai/flows/chatbot-flow";
import { evaluateVisualBot } from "@/lib/visual-bot-engine";

// Verificación del Webhook de Meta (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ META_WEBHOOK_VERIFIED (Facebook/Instagram)");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error("❌ Verificación de webhook fallida");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

// Recepción de mensajes (POST) para Facebook e Instagram
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📩 Payload entrante de Meta (FB/IG):", JSON.stringify(body, null, 2));

    if (body.object === "page" || body.object === "instagram") {
      for (const entry of body.entry || []) {
        
        // 1. Mensajes Directos (DMs) de Facebook Messenger o Instagram
        if (entry.messaging) {
          for (const messageEvent of entry.messaging) {
            if (messageEvent.message && !messageEvent.message.is_echo) {
              const senderId = messageEvent.sender.id;
              const messageText = messageEvent.message.text || "";
              const channel = body.object === "instagram" ? "instagram" : "facebook"; // Para 'page' asumimos FB
              
              await processIncomingMessage(senderId, messageText, channel, 'text', messageEvent);
            }
          }
        }

        // 2. Comentarios Públicos en Facebook o Instagram Docs "changes"
        if (entry.changes) {
          for (const change of entry.changes) {
            // Instagram comments
            if (change.field === "comments" && change.value) {
              const senderId = change.value.from?.id;
              const messageText = change.value.text || "";
              const commentId = change.value.id; // Lo usamos para responder (reply) directamente
              
              if (senderId) {
                await processIncomingMessage(senderId, messageText, "instagram_comment", "comment", change.value, commentId);
              }
            } 
            // Facebook Feed (Comentarios)
            else if (change.field === "feed" && change.value?.item === "comment" && change.value.verb === "add") {
              const senderId = change.value.from?.id;
              const messageText = change.value.message || "";
              const commentId = change.value.comment_id;

              // Evitar procesar nuestros propios comentarios si nos damos una respuesta.
              if (senderId) {
                await processIncomingMessage(senderId, messageText, "facebook_comment", "comment", change.value, commentId);
              }
            }
          }
        }
      }
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } else {
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("❌ Error interno en Webhook Meta", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Función central para procesar y guardar los mensajes de Meta en el CRM
 */
async function processIncomingMessage(senderId: string, messageText: string, channel: string, type: string, payload: any, commentId?: string) {
  if (!adminDb) {
     console.error("Firebase Admin no inicializado.");
     return;
  }

  // Prevenir mensajes vacíos si mandaron fotos sin caption.
  if(!messageText && type === "text") return;

  try {
     const chatId = `${channel}_${senderId}`; // Ej: instagram_12345
     
     // 1. Guardar Hilo (Thread) del Chat en crm_chats
     const chatRef = adminDb.collection("crm_chats").doc(chatId);
     const chatDoc = await chatRef.get();
     let isBotPaused = false;
     
     const contactName = payload?.from?.username || payload?.from?.name || `Usuario ${channel}`;

     if (chatDoc.exists) {
       const data = chatDoc.data();
       isBotPaused = data?.botPaused === true;
       await chatRef.update({
         lastMessage: messageText || "Recibió un adjunto o acción",
         lastTimestamp: FieldValue.serverTimestamp(),
         unreadCount: FieldValue.increment(1),
         status: 'open',
         channel: channel
       });
     } else {
       await chatRef.set({
         waId: senderId, // Reutilizado lógicamente para identificar el ID nativo del canal
         name: contactName,
         lastMessage: messageText || "Recibió un adjunto o acción",
         lastTimestamp: FieldValue.serverTimestamp(),
         status: 'open',
         unreadCount: 1,
         countryCode: '',
         channel: channel
       });
     }

     // 2. Guardar el nuevo mensaje (crm_messages)
     await adminDb.collection("crm_messages").add({
       chatId: chatId,
       from: senderId,
       to: 'business',
       body: messageText,
       type: type,
       isIncoming: true,
       status: 'delivered',
       timestamp: FieldValue.serverTimestamp(),
       channel: channel,
       commentId: commentId || null, // Se guardará si existe, útil para responder el comentario exacto
       rawPayload: payload
     });

     console.log(`💾 (${channel}) Chat guardado en Firestore: ${chatId}`);

     // 3. Ejecutar Lógica de Chatbots
     if (!isBotPaused) {
         // Omitimos evaluar el bot visual por ahora en FB/IG porque no está adaptado para enviar botones multicanal.
         // Podríamos hacerlo adaptando evaulateVisualBot si lo quisiéramos.
         const intercepted = false; 

         if (!intercepted) {
            runChatbotFlow({ phone: chatId, text: messageText, channel: channel, commentId: commentId }).catch((err: any) => {
              console.error(`Error procesando Genkit flow para ${channel}:`, err);
            });
         }
     } else {
         console.log(`⏸️ Bot pausado en ${channel}. Ignorando auto-respuesta.`);
     }

  } catch (error) {
     console.error(`Error guardando ${channel} mensaje en Firestore`, error);
  }
}
