
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db: any;
let adminApp;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (Object.keys(serviceAccount).length > 0 && !getApps().length) {
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore(adminApp);
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

export async function POST(req: NextRequest) {
  if (!db) {
    console.error("Firestore is not initialized. Check server configuration.");
    return NextResponse.json({ error: 'Error interno del servidor: la base de datos no está configurada.' }, { status: 500 });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Correo electrónico no proporcionado.' }, { status: 400 });
    }

    const usersCollection = db.collection('users');
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
