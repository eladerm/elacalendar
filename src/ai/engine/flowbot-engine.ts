import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { whatsapp } from '@/lib/whatsapp';
import { runChatbotFlow } from '@/ai/flows/chatbot-flow';

export interface BotState {
  botId: string | null;
  activeNodeId: string | null;
  lastUpdated: any;
}

export async function processFlowbotMessage(input: { phone: string; text: string; channel?: string; referral?: any }) {
  const { phone, text, channel = 'whatsapp', referral } = input;
  console.log(`🤖 [Flowbot Engine] Analizando mensaje de ${phone}: "${text}". Anuncios unidos: ${referral ? 'SÍ' : 'NO'}`);
  
  if (!adminDb) {
    console.error("Firebase Admin no inicializado");
    return;
  }

  // 1. Obtener estado del usuario
  const chatRef = adminDb.collection('crm_chats').doc(phone);
  const chatSnapshot = await chatRef.get();
  
  if (!chatSnapshot.exists) {
     console.error(`Chat ${phone} no existe para el Flowbot Engine.`);
     return;
  }
  
  const chatData = chatSnapshot.data() || {};
  if (chatData.botPaused) {
     console.log(`[Flowbot Engine] Bot pausado (Handoff manual o automático). Ignorando.`);
     return;
  }

  let botState: BotState = chatData.botState || { botId: null, activeNodeId: null, lastUpdated: null };

  // 2. Cargar todos los flujos activos (temporalmente cargaremos todos los de crm_chatbots y asumiremos que queremos evaluar gatillos globales)
  // En producción, podrías filtrar solo isPublic == true
  const botsSnapshot = await adminDb.collection('crm_chatbots').get();
  const activeBots = botsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  // Helper para buscar un nodo por ID
  const findNode = (botId: string, nodeId: string) => {
    const bot = activeBots.find(b => b.id === botId);
    return bot?.nodes?.find((n: any) => n.id === nodeId);
  };

  // Helper para encontrar el SIGUIENTE nodo (edges originados desde este nodeId)
  const findNextEdges = (botId: string, sourceId: string) => {
    const bot = activeBots.find(b => b.id === botId);
    if (!bot || !bot.edges) return [];
    return bot.edges.filter((e: any) => e.source === sourceId);
  };

  // ============================================
  // LÓGICA DE GATILLOS GLOBALES (Si no hay flujo activo)
  // ============================================
  if (!botState.botId || !botState.activeNodeId) {
    let triggered = false;

    // Buscar entre todos los bots si el mensaje dispara algún gatillo
    for (const bot of activeBots) {
      if (!bot.nodes || bot.isActive === false) continue; // Solo bots activos
      const triggers = bot.nodes.filter((n: any) => n.type === 'trigger');
      
      for (const t of triggers) {
        const condition = (t.data?.label || "").trim().toLowerCase();
        
        let textToMatch = text.toLowerCase();
        if (referral?.headline) {
           textToMatch = `${referral.headline} ${text}`.toLowerCase();
        }
        
        // Soporte para catch-all o coincidencia de palabra clave
        if (condition === "" || condition === "cualquier interacción" || (condition && textToMatch.includes(condition))) {
          // GATILLO ACCIONADO
          console.log(`⚡ Gatillo activado: Bot [${bot.id}], Nodo [${t.id}] por [${condition}] contra [${textToMatch}].`);
          botState = { botId: bot.id, activeNodeId: t.id, lastUpdated: FieldValue.serverTimestamp() };
          triggered = true;
          break;
        }
      }
      if (triggered) break;
    }

    if (!triggered) {
      // MODO HÍBRIDO: No hay flujo activo y no se activó gatillo. Pasamos el mando a Genkit (Gemini).
      console.log(`[Flowbot Engine] No se disparó ningún gatillo. Transfiriendo a Gemini (Híbrido)`);
      await runChatbotFlow({ ...input, phone: chatData.waId || phone });
      return;
    }
  }

  // ============================================
  // EJECUCIÓN DEL FLUJO ACTIVO
  // ============================================
  // Entramos aquí si hay un gatillo activado recién o si el usuario ya venía atascado en un nodo.
  // En Mercately, si estás atorado en un nodo de Menú, se espera que elijas un número/condición.

  let currentNode = botState.botId ? findNode(botState.botId, botState.activeNodeId!) : undefined;
  
  if (botState.botId && !currentNode) {
     console.error("Nodo activo o bot no encontrado (quizás fue eliminado). Reiniciando estado del bot.");
     await chatRef.update({ botState: null });
     botState = { botId: null, activeNodeId: null, lastUpdated: null };
     
     // Intentar evaluar gatillos globales de nuevo ya que reseteamos
     let triggered = false;
     for (const bot of activeBots) {
       if (!bot.nodes) continue;
       const triggers = bot.nodes.filter((n: any) => n.type === 'trigger');
       for (const t of triggers) {
         const keywordsRegex = t.data?.label || "";
         const keywords = keywordsRegex.split(',').map((k: string) => k.trim().toLowerCase());
         let textToMatch = text.toLowerCase();
         if (referral?.headline) textToMatch = `${referral.headline} ${text}`.toLowerCase();
         if (keywords.some((k: string) => k.length > 0 && textToMatch.includes(k))) {
           botState = { botId: bot.id, activeNodeId: t.id, lastUpdated: FieldValue.serverTimestamp() };
           currentNode = findNode(botState.botId!, botState.activeNodeId!);
           triggered = true;
           break;
         }
       }
       if (triggered) break;
     }

     if (!triggered) {
       console.log(`[Flowbot Engine] No se disparó ningún gatillo tras el reset. Transfiriendo a Gemini (Híbrido)`);
       await runChatbotFlow({ ...input, phone: chatData.waId || phone });
       return;
     }
  }

  const { botId } = botState;

  // Si ESTÁBAMOS esperando una respuesta interactiva en el paso anterior
  // Ejemplo: Estábamos en un "ButtonMessage", evaluemos las opciones
  if (currentNode.type === 'buttonMessage') {
      const nextEdges = findNextEdges(botId!, currentNode.id);
      
      // Aquí se debería hacer match entre lo que tipeó el usuario y los labels/handles del edge.
      // Mercately usualmente espera 1, 2, 3 o el texto exacto.
      // Por simplicidad para el engine:
      // Trataremos de verificar si el usuario eligió una opción válida por la etiqueta del Edge (sourceHandle o etiqueta de validación).
      // PERO, la UI de ReactFlow no asocia las respuestas del botón directamente siempre.
      // MODO HÍBRIDO: si no se puede rutear o el menú falla, lanzamos Gemini dándole contexto.
      console.log(`[Flowbot Engine] Usuario estaba en nodo ButtonMessage. Verificando condición: "${text}"`);
      
      // Asumiremos que el botón elegido avanza. Como no hemos configurado SourceHandles complejos en la UI aún,
      // PONGAMOS A GEMINI A EVALUAR por nosotros de forma híbrida e inteligente en vez de hacer reglas duras tontas.
      
      // [Bypass Híbrido Temporal]
      // Si el edge simplemente avanza a un Condition o a un Message genérico sin importar la respuesta.
      if (nextEdges.length > 0) {
         // Hay un camino a seguir. Si es 1 solo camino, lo seguimos obligatoriamente.
         if (nextEdges.length === 1) {
             botState.activeNodeId = nextEdges[0].target;
             currentNode = findNode(botId!, botState.activeNodeId!);
         } else {
             // Si hay múltiples caminos (condiciones), Gemini debería ayudar si no hay un parser fuerte.
             // Para la primera V1, lo pasaremos a Gemini como Fallback si es complejo.
             console.log(`[Flowbot Engine] Múltiples caminos detectados. Handoff a IA Híbrido.`);
             await runChatbotFlow({ ...input, phone: chatData.waId || phone });
             return;
         }
      } else {
         // No hay más camino, terminamos flujo
         console.log(`[Flowbot Engine] Flujo termina aquí.`);
         await chatRef.update({ botState: null });
         return;
      }
  }

  // Bucle de Ejecución Continua (Salta nodos hasta que requiera esperar input de usuario)
  let awaitUserInput = false;
  let safetyLoop = 0;

  while (currentNode && !awaitUserInput && safetyLoop < 10) {
    safetyLoop++;
    console.log(`⚙️ Evaluando Nodo [${currentNode.id}] Tipo: ${currentNode.type}`);

    switch (currentNode.type) {
      case 'trigger': {
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }

      case 'message': {
        // Reemplazar variables dinámicas en el texto
        let msgText = currentNode.data?.label || 'Sin mensaje';
        msgText = msgText
          .replace(/\{\{nombre\}\}/g, chatData.name || phone)
          .replace(/\{\{telefono\}\}/g, phone)
          .replace(/\{\{email\}\}/g, chatData.email || '');

        await sendWhatsAppAndSave(phone, chatData.waId || phone, msgText, channel);
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }

      case 'buttonMessage':
      case 'option': {
        // Nodos interactivos con múltiples opciones — esperamos la respuesta del usuario
        const msgText = currentNode.data?.label || 'Elige una opción:';
        const buttons: string[] = currentNode.data?.buttons || currentNode.data?.options || [];
        let formattedMsg = msgText + '\n';
        buttons.forEach((b: string, i: number) => { formattedMsg += `\n${i + 1}. ${b}`; });
        await sendWhatsAppAndSave(phone, chatData.waId || phone, formattedMsg, channel);
        awaitUserInput = true;
        break;
      }

      case 'capture': {
        // Pregunta y espera respuesta para guardar en campo CRM
        const question = currentNode.data?.question || '¿Cuál es tu respuesta?';
        await sendWhatsAppAndSave(phone, chatData.waId || phone, question, channel);
        awaitUserInput = true;
        break;
      }

      case 'tag': {
        // Asignar etiquetas al chat sin interrumpir el flujo
        const tags: string[] = currentNode.data?.tags || [];
        if (tags.length > 0) {
          const existing: string[] = chatData.tags || [];
          const merged = Array.from(new Set([...existing, ...tags]));
          await chatRef.update({ tags: merged });
          console.log(`[Flowbot] Tags asignados: ${merged.join(', ')}`);
        }
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }

      case 'assign': {
        // Asignar el chat a un equipo/departamento
        const dept = currentNode.data?.department || '';
        if (dept) await chatRef.update({ assignedDept: dept });
        console.log(`[Flowbot] Chat asignado al departamento: ${dept}`);
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }

      case 'apiCall': {
        // Llamada HTTP POST a endpoint externo
        const apiUrl = currentNode.data?.apiUrl;
        const bodyVars: { key: string; value: string }[] = currentNode.data?.body || [];
        if (apiUrl) {
          try {
            const bodyPayload: Record<string, string> = {};
            bodyVars.forEach(b => {
              const val = b.value
                .replace(/\{\{nombre\}\}/g, chatData.name || phone)
                .replace(/\{\{telefono\}\}/g, phone)
                .replace(/\{\{email\}\}/g, chatData.email || '');
              bodyPayload[b.key] = val;
            });
            const apiRes = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload)
            });
            console.log(`[Flowbot] API call to ${apiUrl} - status: ${apiRes.status}`);
          } catch (err) {
            console.error(`[Flowbot] API call failed:`, err);
          }
        }
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }

      case 'closeTicket': {
        // Cierra el chat y para todo el flujo
        await chatRef.update({ status: 'closed', botState: null });
        console.log(`[Flowbot] Chat ${phone} cerrado automáticamente por nodo closeTicket.`);
        currentNode = undefined;
        break;
      }

      case 'botHandoff': {
        // Pausa el bot y pasa a humano (estado espera)
        await chatRef.update({ botPaused: true, status: 'pending', botState: null });
        console.log(`[Flowbot] Chat ${phone} pasado a humano (botHandoff).`);
        currentNode = undefined;
        break;
      }

      case 'wait': {
        console.log(`Nodo Espera alcanzado. Deteniendo flujo (requeriría Cron Job).`);
        awaitUserInput = true;
        break;
      }

      default: {
        console.log(`Nodo desconocido: ${currentNode.type}. Saltando.`);
        const edges = findNextEdges(botId!, currentNode.id);
        if (edges.length > 0) {
           botState.activeNodeId = edges[0].target as string;
           currentNode = findNode(botId!, botState.activeNodeId as string);
        } else { currentNode = undefined; }
        break;
      }
    }
  }

  // 3. Guardar estado final de este tick
  if (currentNode && awaitUserInput) {
    await chatRef.update({ botState: { ...botState, lastUpdated: FieldValue.serverTimestamp() } });
  } else {
    // Terminó el flujo
    await chatRef.update({ botState: null });
  }

}

async function sendWhatsAppAndSave(chatId: string, waId: string, text: string, channel: string) {
    if (channel === 'whatsapp') {
      try {
        console.log(`📤 Enviando mensaje a WA: ${waId}`);
        await whatsapp.sendText(waId, text);
      } catch (err) {
        console.error(`[WhatsApp API] Error al enviar mensaje real a ${waId}:`, err);
      }
    } 

    await adminDb!.collection("crm_messages").add({
      chatId: chatId,
      from: 'business',
      to: waId,
      body: text,
      type: 'text',
      isIncoming: false,
      status: 'sent',
      channel: channel,
      timestamp: FieldValue.serverTimestamp()
    });
    
    await adminDb!.collection("crm_chats").doc(phone).update({
       lastMessage: text,
       lastTimestamp: FieldValue.serverTimestamp()
    });
}
