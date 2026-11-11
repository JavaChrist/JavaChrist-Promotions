import { createRequire } from "node:module";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());

const raw = process.env.FIREBASE_PRIVATE_KEY ?? "";
const key = raw.replace(/\\n/g, "\n");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: key,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const users = await getAuth().listUsers(100);
console.log(
  JSON.stringify(
    users.users.map((user) => ({
      admin: user.customClaims?.admin === true,
      providers: user.providerData.map((item) => item.providerId),
    })),
  ),
);
const apps = await getFirestore().collection("apps").limit(3).get();
console.log(
  JSON.stringify({
    authOk: true,
    userSample: users.users.length,
    apps: apps.size,
    appIds: apps.docs.map((doc) => doc.id),
  }),
);

const campaigns = await getFirestore().collection("campaigns").get();
console.log(
  JSON.stringify(
    campaigns.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        sources: Array.isArray(data.sourceAppIds) ? data.sourceAppIds.length : 0,
        hasVideo: Boolean(data.videoStoragePath),
      };
    }),
  ),
);
