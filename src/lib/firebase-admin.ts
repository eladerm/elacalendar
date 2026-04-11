import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let db: Firestore | null = null;
let adminAuthInstance: Auth | null = null;
let adminApp;

try {
  const serviceAccountFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const config = serviceAccountFromEnv ? JSON.parse(serviceAccountFromEnv) : {};

  if (!getApps().length) {
    if (Object.keys(config).length > 0) {
      adminApp = initializeApp({
        credential: cert(config)
      });
    } else {
      adminApp = initializeApp();
    }
  } else {
    adminApp = getApps()[0];
  }
  
  db = getFirestore(adminApp);
  adminAuthInstance = getAuth(adminApp);
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

export { adminApp, db as adminDb, adminAuthInstance as adminAuth };
