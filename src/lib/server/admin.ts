import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      // Vercel stocke la clé sur une ligne, avec des \n littéraux.
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: required("FIREBASE_STORAGE_BUCKET"),
  });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
export const adminBucket = () => getStorage(adminApp()).bucket();
