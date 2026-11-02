import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/** URL publique d'un média, identique à celle publiée dans le catalogue. */
export function mediaUrl(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
}
