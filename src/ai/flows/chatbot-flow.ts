import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { whatsapp } from '@/lib/whatsapp';

/**
 * Prompt del Sistema - Fallback estático de ÉLAPIEL
 * Se usa ÚNICAMENTE cuando no hay ningún Asistente IA activo configurado en Firestore.
 * El prompt dinámico configurado por el usuario siempre tiene prioridad.
 */
const SYSTEM_PROMPT = `
# IDENTIDAD
Eres Gia, la asistente virtual oficial de ÉLAPIEL — una clínica estética especializada en depilación láser y rejuvenecimiento facial con sede en Ecuador.

Eres cálida, profesional, empática y orientada a resultados. Hablas como una asesora real, no como un bot. Tu misión es: entender la necesidad del cliente → recomendar el tratamiento ideal → generar confianza → agendar una evaluación gratuita.

# ESTILO DE COMUNICACIÓN
- Mensajes cortos (máximo 3 oraciones por respuesta)
- Tono amigable y cercano, jamás robótico
- Usa emojis con moderación (😊 ✨ 💆‍♀️) para calidez
- Nunca envíes bloques largos de texto en un solo mensaje
- Espera la respuesta del cliente antes de avanzar al siguiente tema

# SERVICIOS PRINCIPALES DE ÉLAPIEL

## Depilación Láser
- Tecnología de última generación, apta para todo tipo de piel
- Zonas disponibles: axilas, bikini, piernas, bigote, espalda, abdomen y más
- Resultados visibles desde la 3ra sesión
- Sin dolor intenso, sin irritación post-depilación

## Rejuvenecimiento Facial
- Tratamientos para mejorar textura, luminosidad y firmeza de la piel
- Reducción de manchas, poros y líneas de expresión
- Resultados progresivos y duraderos

## Tratamientos Corporales
- Reducción de grasa localizada
- Reafirmación de piel (piernas, abdomen, brazos)
- Tratamiento de celulitis

# UBICACIONES Y HORARIOS
📍 ÉLAPIEL Matriz — Sector Plaza de Toros, Quito
📍 ÉLAPIEL San Rafael — Valle de los Chillos

⏰ Horario de atención: Lunes a Sábado, 9:00 AM a 6:00 PM
🚫 Domingos y feriados: Cerrado

Si te contactan fuera de horario, responde:
"Hola 😊 Gia por aquí. En este momento estamos fuera de horario, pero te escribo el lunes para coordinar tu evaluación gratuita. ¿Te parece?"

# FLUJO DE CONVERSACIÓN
1. SALUDO (solo si el cliente saluda primero): "Hola 😊 soy Gia de ÉLAPIEL. ¿En qué te puedo ayudar?"
2. DETECCIÓN DE NECESIDAD: Hacer 1-2 preguntas breves para entender qué necesita
3. RECOMENDACIÓN: Mencionar el tratamiento más adecuado y 1-2 beneficios clave
4. EVALUACIÓN GRATUITA: Proponer la cita sin costo como siguiente paso natural
5. DATOS DE AGENDAMIENTO: SOLO pedir nombre + sucursal + día/hora cuando el cliente confirme que SÍ quiere agendar

# REGLAS OBLIGATORIAS DE COMPORTAMIENTO

## Sobre precios:
- NUNCA des precios exactos por chat
- Si preguntan precio, responde: "El valor depende de la zona y el diagnóstico 😊 lo ideal es que vengas a tu evaluación gratuita donde te explicamos todo con detalle"
- Siempre menciona evaluación gratuita y/o promociones vigentes

## Sobre agendamiento:
- NO pidas nombre, sucursal ni horario hasta que el cliente confirme explícitamente que quiere agendar
- Una vez que confirmen: "Perfecto 🎉 ¿Me puedes dar tu nombre completo, qué sucursal te queda mejor (Plaza de Toros o San Rafael) y qué día y hora prefieres?"

## Sobre el tono:
- Valida siempre: "Es muy normal 😊", "Muchas clientas vienen por lo mismo"
- Ante objeciones de precio: "Entiendo totalmente 😊 pero los resultados realmente valen la pena. Además tenemos planes de pago muy cómodos"
- Si el cliente tiene condición médica (embarazo, diabetes, enfermedad de piel): "Para tu seguridad, lo mejor es que una especialista te evalúe primero. ¿Te agendo una cita gratuita de valoración?"

## Sobre continuidad:
- Si el cliente deja de responder después de mostrar interés: retomar con "Hola 😊 ¿Aún te interesa saber más sobre la evaluación gratuita?"
- Siempre termina con una pregunta o llamado a la acción

# CIERRE
Siempre busca cerrar con una de estas frases:
- "¿Te gustaría agendar tu evaluación gratuita esta semana? 😊"
- "Tengo espacios disponibles, te ayudo a reservar en 2 minutos"
- "La evaluación no tiene costo, ¿cuál sucursal te queda más cómoda?"
`;

export async function runChatbotFlow(input: { phone: string; text: string; channel?: string; commentId?: string }) {
  try {
    const channel = input.channel || "whatsapp";
    console.log(`🤖 Iniciando Flow Genkit para el ID: ${input.phone} en canal: ${channel}`);

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

        // === INYECCIÓN DE PERSONALIDAD (Tone, Length, Language) ===
        const toneMap: Record<string, string> = {
          amistoso: 'amigable, cálido y cercano',
          profesional: 'formal, corporativo y estructurado',
          casual: 'relajado, informal, usa expresiones coloquiales',
          persuasivo: 'convincente, orientado a la venta, con llamados a la acción',
          empatico: 'comprensivo, atento a las emociones del cliente',
        };
        const lengthMap: Record<string, string> = {
          corta: 'Responde de forma CONCISA, máximo 2-3 oraciones por mensaje. No uses párrafos largos.',
          media: 'Responde con un nivel moderado de detalle, 3-5 oraciones.',
          larga: 'Responde con detalle completo cuando sea necesario.',
        };
        const langMap: Record<string, string> = {
          es: 'Español',
          en: 'English',
          pt: 'Português',
        };

        const tone = astData.tone || 'amistoso';
        const length = astData.responseLength || 'corta';
        const lang = astData.language || 'es';

        let personalityBlock = `\n\n<Configuracion_Personalidad>`;
        personalityBlock += `\nTONO DE VOZ: Usa un tono ${toneMap[tone] || toneMap.amistoso}.`;
        personalityBlock += `\nLONGITUD: ${lengthMap[length] || lengthMap.corta}`;
        personalityBlock += `\nIDIOMA: Responde SIEMPRE en ${langMap[lang] || 'Español'}.`;
        personalityBlock += `\nNOMBRE: Tu nombre es Gia.`;
        personalityBlock += `\n</Configuracion_Personalidad>`;
        dynamicSystemPrompt += personalityBlock;

        // === INYECCIÓN DE PAUTAS (Guidelines) ===
        if (astData.guidelines && Array.isArray(astData.guidelines) && astData.guidelines.length > 0) {
          let guidelinesBlock = `\n\n<Pautas_Obligatorias>`;
          guidelinesBlock += `\nEstas son instrucciones OBLIGATORIAS que debes cumplir en CADA mensaje que envíes:\n`;
          astData.guidelines.forEach((g: string, i: number) => {
            guidelinesBlock += `\n${i + 1}. ${g}`;
          });
          guidelinesBlock += `\n</Pautas_Obligatorias>`;
          dynamicSystemPrompt += guidelinesBlock;
          console.log(`📋 Se inyectaron ${astData.guidelines.length} pautas de comportamiento.`);
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
            
            contextString += "</Contexto_Institucional_Actualizado>\n\nREGLA: Usa la información dentro de <Contexto_Institucional_Actualizado> para responder con precisión, pero SIEMPRE mantén tu personalidad y pautas configuradas.";
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
    console.log(`🔍 Buscando historial para ${input.phone}...`);
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

    console.log(`📚 Se encontraron ${historyDocs.length} mensajes en el historial.`);

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

    // Asegurarse de que el mensaje actual esté incluido (por si Firestore aún no lo indexó)
    if (messagesParams.length === 0 || (messagesParams[messagesParams.length - 1].role === 'model')) {
       console.log("🆕 El historial no incluía el mensaje actual o terminó en respuesta del bot. Añadiendo el texto actual.");
       messagesParams.push({
         role: 'user',
         content: [{ text: input.text }]
       });
    }

    // 3. Llamar a Genkit Gemini
    const { output: aiResponse } = await ai.generate({
      system: dynamicSystemPrompt + "\n\nREGLA: Analiza si el cliente está frustrado o pide explícitamente a un humano. Si es así, marca requiereHumano en true.",
      messages: messagesParams,
      output: {
        schema: z.object({
          mensajeCliente: z.string().describe("El mensaje que se le enviará al cliente. Si requiereHumano es true, puede ser breve indicando que lo transferirás."),
          requiereHumano: z.boolean().describe("true si el cliente está frustrado, tiene queja médica o exige a un humano."),
          resumenContexto: z.string().describe("Breve resumen interno de por qué se transfiere el chat al asesor. Ej: Queja de precio.")
        })
      },
      config: {
        temperature: modelTemperature
      }
    });

    console.log(`🤖 Genkit generó la respuesta estructurada:`, aiResponse);

    if (aiResponse) {
      // 3.5. Evaluar Handoff automático
      if (aiResponse.requiereHumano) {
         await adminDb!.collection("crm_chats").doc(input.phone).update({
            botPaused: true,
            aiSummary: aiResponse.resumenContexto || "Transferido a humano por la IA.",
            lastTimestamp: FieldValue.serverTimestamp()
         });
         console.log(`⏸️ BOT PAUSADO por Handoff Automático para ${input.phone}`);
         
         if (!aiResponse.mensajeCliente || aiResponse.mensajeCliente.trim() === "") {
             return; // Stop here if no message to send
         }
      }

      const textToSend = aiResponse.mensajeCliente;
      if (!textToSend || textToSend.trim() === "") return;

      // Import the meta router here to prevent circular dependencies if needed, or put at top.
      const { metaGraph } = await import('@/lib/meta-graph');

      // 4. Enviar mensaje por el canal correcto primero
      try {
        if (channel === 'instagram_comment' || channel === 'facebook_comment') {
          if (!input.commentId) throw new Error("Falta commentId para poder responder al comentario.");
          await metaGraph.replyToComment(input.commentId, textToSend);
        } else if (channel === 'instagram' || channel === 'facebook') {
          const senderId = input.phone.replace(`${channel}_`, '');
          await metaGraph.sendDirectMessage(senderId, textToSend);
        } else {
          await whatsapp.sendText(input.phone, textToSend);
        }
        console.log(`✅ Respuesta enviada exitosamente por el canal [${channel}] a ${input.phone}`);
      } catch (sendError) {
        console.error(`❌ Error al enviar mensaje real a ${input.phone} (¿token expirado?):`, sendError);
        // Continuamos para asegurarnos de que quede registrado en el CRM
      }

      // 5. Guardar la respuesta saliente en Firestore (con el formato de la UI)
      await adminDb!.collection("crm_messages").add({
        chatId: input.phone,
        from: 'business',
        to: input.phone,
        body: textToSend,
        type: 'text',
        isIncoming: false,
        status: 'sent',
        channel: channel,
        timestamp: FieldValue.serverTimestamp()
      });
      
      // Actualizar el hilo (Thread) del chat
      await adminDb!.collection("crm_chats").doc(input.phone).update({
         lastMessage: textToSend,
         lastTimestamp: FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    console.error("❌ Error en runChatbotFlow:", error);
  }
}
