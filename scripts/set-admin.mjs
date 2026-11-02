// Donne le rôle administrateur à un compte Google qui s'est déjà connecté une fois au back-office.
// Usage (PowerShell) :
//   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\chemin\vers\compte-de-service.json"
//   node scripts/set-admin.mjs contact@javachrist.fr
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("Usage : node scripts/set-admin.mjs <email>");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: "motissimo-456ba" });

const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { admin: true });
console.log(`Rôle admin accordé à ${email} (${user.uid}). Reconnecte-toi au back-office.`);
