// Migre les campagnes de l'ancien modèle (1 vidéo, application promue, jeux sources) vers le nouveau
// (application hôte + clips). Simulation par défaut ; `--apply` écrit dans Firestore.
//
//   node scripts/migrate-campaigns.mjs           # simulation
//   node scripts/migrate-campaigns.mjs --apply   # écriture
//
// Additif : les anciens champs restent dans les documents, donc l'ancienne version de l'admin continue de
// fonctionner jusqu'au déploiement de la nouvelle. Relançable sans danger (les campagnes déjà migrées sont ignorées).
import { createRequire } from "node:module";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();
const [appsSnap, clipsSnap, campaignsSnap] = await Promise.all([
  db.collection("apps").get(),
  db.collection("clips").get(),
  db.collection("campaigns").get(),
]);
const apps = new Map(appsSnap.docs.map((d) => [d.id, d.data()]));
const clips = new Map(clipsSnap.docs.map((d) => [d.id, d.data()]));

console.log(apply ? "MODE ÉCRITURE\n" : "SIMULATION (rien n'est écrit, ajoute --apply pour appliquer)\n");
console.log(`${apps.size} application(s), ${clips.size} clip(s), ${campaignsSnap.size} campagne(s)\n`);

// Option retenue : une campagne par application hôte, période commune à toutes les anciennes campagnes
// (début le plus tardif, fin la plus précoce).
const olds = campaignsSnap.docs.filter((d) => !(Array.isArray(d.data().clipIds) && d.data().hostAppId) && d.data().status !== "archived");
console.log(`${olds.length} ancienne(s) campagne(s) à migrer
`);
if (olds.length === 0) process.exit(0);

const hostClips = new Map(); // hôte -> Set de clipIds
const appPatches = new Map();
const clipOps = []; // [id, "set"|"update", data]
let startsAt = null;
let endsAt = null;
let anyActive = false;

for (const item of olds) {
  const old = item.data();
  const label = `« ${old.title} »`;
  if (!old.videoStoragePath || !old.promotedAppId) {
    console.log(`! ${label} : vidéo ou application promue manquante, ignorée`);
    continue;
  }
  let clipId = [...clips].find(([, c]) => c.storagePath === old.videoStoragePath)?.[0];
  if (!clipId) {
    clipId = db.collection("clips").doc().id;
    const [meta] = await bucket.file(old.videoStoragePath).getMetadata().catch(() => [null]);
    const clip = { name: `Clip-${apps.get(old.promotedAppId)?.name ?? old.title}`, appId: old.promotedAppId, storagePath: old.videoStoragePath, durationMs: old.videoDurationMs, sizeBytes: Number(meta?.size ?? 0), createdAt: FieldValue.serverTimestamp() };
    clips.set(clipId, clip);
    clipOps.push([clipId, "set", clip]);
    console.log(`+ clip créé « ${clip.name} » (${clip.storagePath}) présente ${clip.appId}`);
  } else if (!clips.get(clipId).appId) {
    clips.get(clipId).appId = old.promotedAppId;
    clipOps.push([clipId, "update", { appId: old.promotedAppId }]);
    console.log(`~ clip « ${clips.get(clipId).name} » → présente ${old.promotedAppId}`);
  }
  const promoted = apps.get(old.promotedAppId);
  if (promoted && !promoted.playStoreUrl && old.destinationUrl) {
    appPatches.set(old.promotedAppId, { playStoreUrl: old.destinationUrl });
    console.log(`~ ${old.promotedAppId} reçoit le lien ${old.destinationUrl}`);
  }
  for (const host of old.sourceAppIds ?? []) {
    if (host === old.promotedAppId) continue;
    if (!hostClips.has(host)) hostClips.set(host, new Set());
    hostClips.get(host).add(clipId);
  }
  if (old.startsAt && (!startsAt || old.startsAt > startsAt)) startsAt = old.startsAt;
  if (old.endsAt && (!endsAt || old.endsAt < endsAt)) endsAt = old.endsAt;
  if (old.status === "active") anyActive = true;
}

console.log(`
Période commune : ${startsAt} → ${endsAt}
`);
const created = [];
for (const [host, set] of hostClips) {
  const id = `migrated-${host}`;
  const data = {
    title: `Clips dans ${apps.get(host)?.name ?? host}`,
    hostAppId: host,
    clipIds: [...set],
    status: anyActive ? "active" : "draft",
    audience: "adult",
    locale: "fr",
    startsAt,
    endsAt,
    weight: 1,
    updatedAt: FieldValue.serverTimestamp(),
  };
  created.push([id, data]);
  console.log(`> campagne ${id} : ${data.title}, ${set.size} clip(s) : ${[...set].map((c) => clips.get(c).name).join(", ")}`);
}
console.log(`
${olds.length} ancienne(s) campagne(s) seront archivées (non supprimées).`);

if (apply) {
  for (const [id, kind, data] of clipOps) await db.collection("clips").doc(id)[kind === "set" ? "set" : "update"](data);
  for (const [id, patch] of appPatches) await db.collection("apps").doc(id).update(patch);
  for (const [id, data] of created) await db.collection("campaigns").doc(id).set(data);
  for (const item of olds) await item.ref.update({ status: "archived" });
  console.log("Migration écrite.");
} else console.log("Simulation : rien écrit.");
