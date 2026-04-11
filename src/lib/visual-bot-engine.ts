import { FieldValue } from 'firebase-admin/firestore';

export async function evaluateVisualBot(
  messageText: string, 
  chatId: string, 
  adminDb: any, 
  whatsapp: any
): Promise<{ intercepted: boolean }> {
  try {
    const textNormalized = messageText.trim().toLowerCase();
    
    const chatRef = adminDb.collection("crm_chats").doc(chatId);
    const chatSnap = await chatRef.get();
    
    let activeBotId: string | null = null;
    let currentNodeId: string | null = null;
    
    const chatData = chatSnap.data() || {};
    if (chatData.visualBotState) {
       activeBotId = chatData.visualBotState.activeBotId;
       currentNodeId = chatData.visualBotState.currentNodeId;
    }

    let botData: any = null;
    let botConfig: any = null;

    // 1. Si no hay flujo activo, chequear si el mensaje detona algún Gatillo de flujos activos
    if (!activeBotId) {
      const botsSnap = await adminDb.collection('crm_chatbots')
        .where('isActive', '==', true)
        .get();
        
      for (const bSnap of botsSnap.docs) {
        const bot = bSnap.data();
        if (!bot.nodes) continue;
        
        // Buscar nodos trigger
        const triggerNodes = bot.nodes.filter((n: any) => n.type === 'trigger');
        for (const tNode of triggerNodes) {
          const condition = (tNode.data?.label || "").trim().toLowerCase();
          // Lógica simple: Si la condición existe y el mensaje incluye la condición
          if (condition && textNormalized.includes(condition)) {
             activeBotId = bSnap.id;
             botConfig = bot;
             
             // Buscar qué nodo sigue después del trigger
             const edge = bot.edges?.find((e: any) => e.source === tNode.id);
             if (edge) {
                currentNodeId = edge.target;
             }
             break; // Salir del loop de triggers
          }
        }
        if (activeBotId) break; // Salir del loop de bots
      }

      // Si ningún trigger coincidió, retornar false para que actúe la IA (Genkit)
      if (!activeBotId || !currentNodeId) {
         return { intercepted: false };
      }
    } else {
      // 2. Si ya hay flujo activo, cargar ese bot
      const botReq = await adminDb.collection('crm_chatbots').doc(activeBotId).get();
      if (botReq.exists) {
         botConfig = botReq.data();
      } else {
         // El bot fue borrado
         await chatRef.update({ visualBotState: FieldValue.delete() });
         return { intercepted: false };
      }

      // 3. Evaluar la respuesta del usuario respecto al "currentNodeId" (que suele ser un OptionNode)
      const currentNode = botConfig.nodes?.find((n: any) => n.id === currentNodeId);
      
      if (currentNode?.type === 'option') {
          const options = currentNode.data?.options || [];
          let matchedIndex = -1;
          
          // Buscar si el texto coincide con el texto de la opción o el número
          options.forEach((opt: string, i: number) => {
             const optNormalized = opt.trim().toLowerCase();
             if (textNormalized === optNormalized || textNormalized === String(i + 1)) {
                 matchedIndex = i;
             }
          });

          if (matchedIndex !== -1) {
             // Encontrar a dónde lo lleva esta opción específica
             const handleId = `opt-${matchedIndex}`;
             const edge = botConfig.edges?.find((e: any) => e.source === currentNode.id && e.sourceHandle === handleId);
             
             if (edge) {
                 currentNodeId = edge.target;
             } else {
                 // Si no hay edge para esta opción, terminar el flujo
                 await chatRef.update({ visualBotState: FieldValue.delete() });
                 return { intercepted: true }; // Terminó
             }
          } else {
             // Opción no válida
             const fallbackMsg = "Por favor, selecciona una opción válida respondiendo con el nombre o el número de la opción.";
             await guardarMensajeYEnviar(chatId, fallbackMsg, adminDb, whatsapp);
             return { intercepted: true };
          }
      } else {
          // Si estaba atrapado en algo que no era opción o se rompió la sincro
          await chatRef.update({ visualBotState: FieldValue.delete() });
          return { intercepted: false };
      }
    }

    // 4. Bucle principal de ejecución del flujo usando el currentNodeId
    // Esto es un while loop porque un mensaje puede ser seguido inmediatamente por otro mensaje
    let iterating = true;
    let stateSaved = false;

    while (iterating && currentNodeId) {
       const node = botConfig.nodes?.find((n: any) => n.id === currentNodeId);
       
       if (!node) {
          await chatRef.update({ visualBotState: FieldValue.delete() });
          break; // Fallback
       }

       if (node.type === 'message') {
           const msg = node.data?.label || '';
           if (msg) {
              await guardarMensajeYEnviar(chatId, msg, adminDb, whatsapp);
           }
           // Avanzar automáticamente al siguiente nodo
           const nextEdge = botConfig.edges?.find((e: any) => e.source === node.id);
           if (nextEdge) {
              currentNodeId = nextEdge.target;
           } else {
              // Fin de flujo
              await chatRef.update({ visualBotState: FieldValue.delete() });
              iterating = false;
              stateSaved = true;
           }
       } 
       else if (node.type === 'option') {
           const options = node.data?.options || [];
           let menuText = "Por favor, elija una opción:\n\n";
           options.forEach((opt: string, i: number) => {
              menuText += `${i + 1}. ${opt}\n`;
           });
           
           await guardarMensajeYEnviar(chatId, menuText.trim(), adminDb, whatsapp);
           
           // STOP! El flujo se pausa aquí esperando la respuesta del usuario
           await chatRef.update({ 
               visualBotState: {
                  activeBotId: botConfig.id || activeBotId,
                  currentNodeId: node.id
               }
           });
           iterating = false;
           stateSaved = true;
       } else {
           // Nodo no reconocido
           await chatRef.update({ visualBotState: FieldValue.delete() });
           iterating = false;
           stateSaved = true;
       }
    }

    // Seguridad, limpiar estado si no se guardó
    if (!stateSaved) {
       await chatRef.update({ visualBotState: FieldValue.delete() });
    }

    return { intercepted: true };

  } catch (err) {
      console.error("Error en motor de bot visual:", err);
      return { intercepted: false };
  }
}

// Función helper para guardar en crm_messages y enviar real por whatsapp
async function guardarMensajeYEnviar(chatId: string, texto: string, adminDb: any, whatsapp: any) {
    if (!texto) return;
    
    await adminDb.collection("crm_messages").add({
        chatId: chatId,
        from: 'business',
        to: chatId,
        body: texto,
        type: 'text',
        isIncoming: false,
        status: 'sent',
        timestamp: FieldValue.serverTimestamp()
    });
    
    // Actualizar el hilo
    await adminDb.collection("crm_chats").doc(chatId).update({
        lastMessage: texto,
        lastTimestamp: FieldValue.serverTimestamp()
    });

    // Enviar a WhatsApp API
    await whatsapp.sendText(chatId, texto);
}
