import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { whatsapp } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const { chatId, to, message, type = 'text', templateName } = await req.json();

    if (!chatId || !to) {
      return NextResponse.json({ error: 'chatId y to son requeridos' }, { status: 400 });
    }

    if (!adminDb) throw new Error("Firebase Admin no inicializado");

    let waResponse: any;

    // Enviar mensaje según el tipo
    if (type === 'template' && templateName) {
      waResponse = await whatsapp.sendTemplate(to, templateName);
    } else {
      if (!message) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
      waResponse = await whatsapp.sendText(to, message);
    }

    const waId = waResponse?.messages?.[0]?.id || null;

    // Guardar mensaje enviado en Firestore
    await adminDb.collection('crm_messages').add({
      chatId,
      waId,
      from: 'business',
      to,
      body: message || `[Plantilla: ${templateName}]`,
      type,
      isIncoming: false,
      status: 'sent',
      timestamp: FieldValue.serverTimestamp()
    });

    // Actualizar el hilo del chat con el último mensaje
    if (chatId !== 'new') {
        await adminDb.collection('crm_chats').doc(chatId).update({
          lastMessage: message || `[Plantilla: ${templateName}]`,
          lastTimestamp: FieldValue.serverTimestamp()
        });
    }

    return NextResponse.json({ success: true, messageId: waId });
  } catch (error: any) {
    console.error('Send Message Error:', error);
    return NextResponse.json({ error: error.message || 'Error al enviar el mensaje' }, { status: 500 });
  }
}
