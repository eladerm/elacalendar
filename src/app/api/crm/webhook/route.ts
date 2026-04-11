import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

/**
 * GET: Verificación de Webhook para Meta.
 * Meta envía una petición GET con un token de verificación y un challenge.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST: Recepción de eventos de WhatsApp (mensajes, estados, etc.).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verificamos que sea un evento de cuenta comercial de WhatsApp
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!adminDb) throw new Error("Firebase Admin no inicializado");

      // 1. Manejo de MENSAJES entrantes
      if (value?.messages) {
        const message = value.messages[0];
        const contact = value.contacts[0];
        
        await handleIncomingMessage(message, contact);
      }

      // 2. Manejo de ESTADOS (sent, delivered, read)
      if (value?.statuses) {
        const statusUpdate = value.statuses[0];
        await handleStatusUpdate(statusUpdate);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not a WhatsApp event' }, { status: 404 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Función para procesar y guardar mensajes en Firestore usando Admin SDK.
 */
async function handleIncomingMessage(message: any, contact: any) {
  if (!adminDb) return;
  const waId = contact.wa_id;
  const name = contact.profile.name;
  const messageType = message.type;
  
  // Buscar o crear hilo de chat
  const chatRef = adminDb.collection('crm_chats');
  const querySnapshot = await chatRef.where('waId', '==', waId).get();
  
  let chatId: string;
  
  if (querySnapshot.empty) {
    // Si no existe el chat, lo creamos
    const newChat = await chatRef.add({
      waId,
      name,
      lastMessage: getMessagePreview(message),
      lastTimestamp: FieldValue.serverTimestamp(),
      status: 'open',
      unreadCount: 1,
      createdAt: FieldValue.serverTimestamp()
    });
    chatId = newChat.id;
    
    // También creamos el contacto en el CRM si no existe
    const contactRef = adminDb.collection('crm_contacts');
    const cSnap = await contactRef.where('waId', '==', waId).get();
    
    if (cSnap.empty) {
      await contactRef.add({
        waId,
        name,
        tags: [],
        lastInteraction: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      });
    }
  } else {
    // Si existe, actualizamos el último mensaje y contador
    chatId = querySnapshot.docs[0].id;
    const chatDoc = chatRef.doc(chatId);
    await chatDoc.update({
      lastMessage: getMessagePreview(message),
      lastTimestamp: FieldValue.serverTimestamp(),
      unreadCount: querySnapshot.docs[0].data().unreadCount + 1
    });
  }

  // Guardar el mensaje individual
  await adminDb.collection('crm_messages').add({
    chatId,
    waId: message.id,
    from: waId,
    to: 'business',
    body: message.text?.body || '',
    type: messageType,
    isIncoming: true,
    status: 'delivered',
    timestamp: FieldValue.serverTimestamp(),
    mediaMetadata: messageType !== 'text' ? message[messageType] : null
  });
}

/**
 * Función para actualizar el estado de los mensajes enviados usando Admin SDK.
 */
async function handleStatusUpdate(statusUpdate: any) {
  if (!adminDb) return;
  const messageWaId = statusUpdate.id;
  const newStatus = statusUpdate.status;

  const messagesRef = adminDb.collection('crm_messages');
  const querySnapshot = await messagesRef.where('waId', '==', messageWaId).get();

  if (!querySnapshot.empty) {
    const messageDoc = messagesRef.doc(querySnapshot.docs[0].id);
    await messageDoc.update({
      status: newStatus
    });
  }
}

/**
 * Helper para obtener previsualización del mensaje según el tipo.
 */
function getMessagePreview(message: any) {
  switch (message.type) {
    case 'text': return message.text.body;
    case 'image': return '📷 Imagen';
    case 'video': return '🎥 Video';
    case 'audio': return '🎵 Audio';
    case 'document': return '📁 Archivo';
    default: return 'Mensaje de WhatsApp';
  }
}
