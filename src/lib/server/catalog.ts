import { FieldValue } from "firebase-admin/firestore";
import {
  MAX_DURATION_MS,
  MAX_VIDEO_BYTES,
  isPlayStoreUrl,
  type AppDoc,
  type CampaignDoc,
  type ClipDoc,
} from "@/lib/types";
import { adminBucket, adminDb } from "./admin";

export interface PublishReport {
  /** Nombre de clips publiés par application où ils s'affichent. */
  published: Record<string, number>;
  /** Campagnes ou clips actifs qui n'ont pas pu être publiés, avec la raison. */
  skipped: { campaignId: string; title: string; reason: string }[];
}

/** Une entrée du catalogue lu par un jeu : un clip, avec l'application qu'il présente. Format inchangé. */
interface CatalogCampaign {
  id: string;
  name: string;
  audience: "adult";
  locale: string;
  videoUrl: string;
  durationMs: number;
  destinationUrl: string;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
}

function mediaUrl(bucket: string, path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

function isIsoDate(value: string | null): boolean {
  return value === null || !Number.isNaN(Date.parse(value));
}

/** Vérifie le fichier d'un clip dans Storage ; renvoie la raison du refus, ou null s'il est publiable. */
async function fileProblem(clip: ClipDoc): Promise<string | null> {
  if (!(clip.durationMs > 0 && clip.durationMs <= MAX_DURATION_MS)) {
    return `Durée de la vidéo hors limite (${MAX_DURATION_MS / 1000} s maximum)`;
  }
  const [metadata] = await adminBucket()
    .file(clip.storagePath)
    .getMetadata()
    .catch(() => [null]);
  if (!metadata) return "Fichier vidéo introuvable dans Storage";
  if (metadata.contentType !== "video/mp4") return "La vidéo n'est pas un MP4";
  if (Number(metadata.size) > MAX_VIDEO_BYTES) return "La vidéo dépasse 10 Mo";
  return null;
}

/**
 * Régénère `public_catalogs/{application}` à partir des apps, des clips et des campagnes. Seul point
 * d'écriture de ces documents : les jeux ne lisent que cette projection, jamais les brouillons.
 */
export async function publishCatalogs(): Promise<PublishReport> {
  const db = adminDb();
  const [appsSnap, clipsSnap, campaignsSnap, catalogsSnap] = await Promise.all([
    db.collection("apps").get(),
    db.collection("clips").get(),
    db.collection("campaigns").get(),
    db.collection("public_catalogs").get(),
  ]);

  const apps = new Map(appsSnap.docs.map((item) => [item.id, item.data() as AppDoc]));
  const clips = new Map(clipsSnap.docs.map((item) => [item.id, item.data() as ClipDoc]));
  // Toute application a son catalogue, vide tant qu'aucune campagne n'y affiche de clip.
  const catalogs = new Map<string, CatalogCampaign[]>([...apps.keys()].map((id) => [id, []]));
  const report: PublishReport = { published: {}, skipped: [] };
  const bucketName = adminBucket().name;
  const files = new Map<string, Promise<string | null>>();

  for (const item of campaignsSnap.docs) {
    const campaign = item.data() as CampaignDoc;
    if (campaign.status !== "active") continue;

    const skip = (reason: string, clipName?: string) =>
      report.skipped.push({ campaignId: item.id, title: clipName ? `${campaign.title} › ${clipName}` : campaign.title, reason });

    if (!campaign.hostAppId || !Array.isArray(campaign.clipIds)) {
      skip("Ancien format : ouvre la campagne et enregistre-la à nouveau");
      continue;
    }
    if (!catalogs.has(campaign.hostAppId)) {
      skip("Application où les clips s'affichent introuvable");
      continue;
    }
    if (campaign.clipIds.length === 0) {
      skip("Aucun clip choisi");
      continue;
    }
    if (!isIsoDate(campaign.startsAt) || !isIsoDate(campaign.endsAt)) {
      skip("Date invalide");
      continue;
    }

    for (const clipId of campaign.clipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        skip("Clip introuvable");
        continue;
      }
      const promoted = clip.appId ? apps.get(clip.appId) : undefined;
      if (!promoted) {
        skip("Le clip n'est lié à aucune application existante", clip.name);
        continue;
      }
      // Une application ne se promeut jamais elle-même.
      if (clip.appId === campaign.hostAppId) continue;
      if (!promoted.playStoreUrl || !isPlayStoreUrl(promoted.playStoreUrl)) {
        skip(`La fiche Google Play de ${promoted.name} est manquante ou invalide`, clip.name);
        continue;
      }
      if (!files.has(clip.storagePath)) files.set(clip.storagePath, fileProblem(clip));
      const problem = await files.get(clip.storagePath)!;
      if (problem) {
        skip(problem, clip.name);
        continue;
      }

      catalogs.get(campaign.hostAppId)!.push({
        id: `${item.id}_${clipId}`,
        name: promoted.name,
        audience: "adult",
        locale: campaign.locale,
        videoUrl: mediaUrl(bucketName, clip.storagePath),
        durationMs: clip.durationMs,
        destinationUrl: promoted.playStoreUrl,
        weight: Math.max(1, Math.round(campaign.weight) || 1),
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      });
    }
  }

  // Les catalogues d'applications supprimées sont vidés, pas laissés périmés.
  const stale = catalogsSnap.docs.map((item) => item.id).filter((id) => !catalogs.has(id));
  const batch = db.batch();
  for (const [host, entries] of catalogs) {
    report.published[host] = entries.length;
    batch.set(db.collection("public_catalogs").doc(host), {
      schemaVersion: 1,
      sourceAppId: host,
      catalogVersion: Date.now(),
      generatedAt: FieldValue.serverTimestamp(),
      campaigns: entries,
    });
  }
  for (const id of stale) {
    batch.set(db.collection("public_catalogs").doc(id), {
      schemaVersion: 1,
      sourceAppId: id,
      catalogVersion: Date.now(),
      generatedAt: FieldValue.serverTimestamp(),
      campaigns: [],
    });
  }
  await batch.commit();
  return report;
}
