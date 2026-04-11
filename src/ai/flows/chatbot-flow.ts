import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { whatsapp } from '@/lib/whatsapp';

/**
 * Prompt del Sistema proporcionado por el usuario
 */
const SYSTEM_PROMPT = `
🧠 Personalidad y Rol
Eres Ela, la asistente virtual de ÉLAPIEL.
Tu personalidad es cálida, cercana, profesional y persuasiva, como una asesora estética experta.

No eres un bot.
Eres una especialista en tratamientos estéticos, enfocada en resultados visibles y en ayudar a cada cliente a tomar la mejor decisión.

Tu objetivo es:
Entender al cliente
Recomendar el tratamiento ideal
Generar confianza
Resolver dudas
Cerrar la cita

💬 Estilo de comunicación
Habla de forma natural, humana y amigable
Usa lenguaje sencillo (no técnico)
Respuestas cortas o medias (no largas)
Evita sonar robotizada
Usa frases como:
“Te explico 😊”
“En tu caso te ayudaría mucho…”
“Vas a notar resultados desde…”

❤️ Empatía
Siempre valida al cliente:
“Es súper normal…”
“Muchas clientas vienen por lo mismo…”
“No te preocupes, eso tiene solución 😊”
Nunca juzgues ni contradigas de forma brusca.

🎯 Estrategia de conversación
Sigue este flujo:
Detectar necesidad
Hacer 1–2 preguntas clave
Recomendar tratamiento
Explicar beneficios (no técnicos)
Generar deseo
Llevar al cierre

🧲 Enfoque comercial
Habla en términos de beneficios, no características
Ejemplos:
“Te ayuda a reafirmar la piel”
“Reduce grasa localizada”
“Mejora la textura y luminosidad”

🚫 REGLA CLAVE SOBRE PRECIOS
❌ NO des precios directamente en el chat
Si el cliente pregunta precio, responde de forma estratégica:
“Te explico 😊 el valor depende de la zona y lo que necesites trabajar”
“Tenemos promociones activas en este momento”
“Lo ideal es valorarte para darte el precio exacto”
👉 Luego dirige SIEMPRE a evaluación o agendamiento: “Si quieres te ayudo a agendar y te explicamos todo completo 😊”

📍 Sucursales ÉLAPIEL
Menciona de forma natural cuando sea necesario:
📍 ÉLAPIEL Matriz: Sector Plaza de Toros
📍 ÉLAPIEL Valle: San Rafael
Ejemplo: “Tenemos atención en Plaza de Toros y en el Valle (San Rafael) 😊 ¿Cuál te queda mejor?”

🧠 Manejo de objeciones
No contradigas directamente. Responde con empatía + valor.
Ejemplo de cliente: “Está caro” -> Respuesta: “Entiendo totalmente 😊 pero este tratamiento trabaja directamente en… y los resultados realmente valen la pena”

⚡ Cierre de ventas
Siempre busca cerrar:
“¿Te gustaría agendar?”
“Tengo espacios esta semana 😊”
“Te puedo ayudar a reservar tu cita”

🧩 Ejemplo de respuesta ideal: “Hola 😊 soy Ela de ÉLAPIEL. Cuéntame, ¿qué te gustaría mejorar o tratar?”
`;

export async function runChatbotFlow(input: { phone: string; text: string }) {
  try {
    console.log(`🤖 Iniciando Flow Genkit para el número: ${input.phone}`);

    // === NUEVO: Fetch configuración dinámica del Cerebro (Asistente IA) ===
    let dynamicSystemPrompt = SYSTEM_PROMPT;
    let modelTemperature = 0.7;

    try {
      if (!adminDb) throw new Error("adminDb not initialized");
      const astSnapshot = await adminDb.collection('crm_ai_assistants')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (!astSnapshot.empty) {
        const astData = astSnapshot.docs[0].data();
        if (astData.systemPrompt) {
          dynamicSystemPrompt = astData.systemPrompt;
          console.log(`🧠 Cerebro Activo Detectado: Usando prompt dinámico de la base de datos.`);
        }
        if (astData.temperature !== undefined) {
          modelTemperature = astData.temperature;
        }

        // === INGESTA DE CONOCIMIENTO (RAG BÁSICO) ===
        if (astData.sources && Array.isArray(astData.sources)) {
          const textSources = astData.sources.filter((s: any) => s.type === 'text' && s.status === 'ready');
          if (textSources.length > 0) {
            let contextString = "\n\n<Contexto_Institucional_Actualizado>\n";
            contextString += "La siguiente es información actualizada de la empresa. Úsala como base si te preguntan sobre horarios, precios, reglas u otros detalles:\n\n";
            
            textSources.forEach((s: any) => {
               contextString += `--- NOTA: ${s.name} ---\n${s.content}\n\n`;
            });
            
            contextString += "</Contexto_Institucional_Actualizado>\n\nREGLA: Usa la información dentro de <Contexto_Institucional_Actualizado> para responder con precisión, pero SIEMPRE mantén tu personalidad persuasiva.";
            dynamicSystemPrompt += contextString;
            console.log(`📚 Se inyectaron ${textSources.length} notas de contexto RAG.`);
          }
        }
      } else {
        console.log(`⚠️ No se encontró Cerebro Activo, usando Prompt estático de respaldo.`);
      }
    } catch (err) {
      console.warn("⚠️ Error cargando el Cerebro dinámico. Se usará configuración por defecto.", err);
    }

    // 1. Recuperar el historial de conversación desde Firestore
    const querySnapshot = await adminDb!.collection('crm_messages')
      .where('chatId', '==', input.phone)
      .get();
    
    // Sort en Javascript para esquivar el Index Compuesto de Firestore y llevarnos los 10 últimos
    const historyDocs = querySnapshot.docs
      .sort((a, b) => {
         const tA = a.data().timestamp?.toMillis ? a.data().timestamp.toMillis() : 0;
         const tB = b.data().timestamp?.toMillis ? b.data().timestamp.toMillis() : 0;
         return tB - tA; // Descending
      })
      .slice(0, 10)
      .reverse();

    // 2. Formatear el historial para Genkit
    const messagesParams: any[] = [];
    historyDocs.forEach(doc => {
      const data = doc.data();
      const role = data.isIncoming ? 'user' : 'model';
      if (data.body) {
        messagesParams.push({
          role,
          content: [{ text: data.body }]
        });
      }
    });

    // 3. Llamar a Genkit Gemini
    const { text: aiResponse } = await ai.generate({
      system: dynamicSystemPrompt,
      messages: messagesParams,
      config: {
        temperature: modelTemperature
      }
    });

    console.log(`🤖 Genkit generó la respuesta: ${aiResponse}`);

    if (aiResponse) {
      // 4. Guardar la respuesta saliente en Firestore (con el formato de la UI)
      await adminDb!.collection("crm_messages").add({
        chatId: input.phone,
        from: 'business',
        to: input.phone,
        body: aiResponse,
        type: 'text',
        isIncoming: false,
        status: 'sent',
        timestamp: FieldValue.serverTimestamp()
      });
      
      // Actualizar el hilo (Thread) del chat
      await adminDb!.collection("crm_chats").doc(input.phone).update({
         lastMessage: aiResponse,
         lastTimestamp: FieldValue.serverTimestamp()
      });

      // 5. Enviar mensaje por WhatsApp
      await whatsapp.sendText(input.phone, aiResponse);
      console.log(`✅ Respuesta enviada a WhatsApp exitosamente a ${input.phone}`);
    }

  } catch (error) {
    console.error("❌ Error en runChatbotFlow:", error);
  }
}
