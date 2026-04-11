
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  if (!adminDb) {
    console.error("Firestore is not initialized. Check server configuration.");
    return NextResponse.json({ error: 'Error interno del servidor: la base de datos no está configurada.' }, { status: 500 });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Correo electrónico no proporcionado.' }, { status: 400 });
    }

    const usersCollection = adminDb.collection('users');
    const q = usersCollection.where('email', '==', email);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json({ exists: false, error: "No se encontró ningún usuario con esa dirección de correo electrónico." }, { status: 404 });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    return NextResponse.json({ exists: true, user: { name: userData.name, email: userData.email } });

  } catch (error: any) {
    console.error('Error checking user existence:', error);
    if (error.code === 'permission-denied') {
        return NextResponse.json({ error: 'Permisos insuficientes en el servidor.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
