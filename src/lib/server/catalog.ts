import { FieldValue } from "firebase-admin/firestore";
import {
  MAX_DURATION_MS,
  MAX_VIDEO_BYTES,
  isPlayStoreUrl,
  type AppDoc,
  type CampaignDoc,
} from "@/lib/types";
import { adminBucket, adminDb } from "./admin";

export interface PublishReport {
  /** Nombre de campagnes publiées par jeu source. */
  published: Record<string, number>;
  /** Campagnes actives qui n'ont pas pu être publiées, avec la raison. */
  skipped: { campaignId: string; title: string; reason: string }[];
}

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

/** Vérifie une campagne active ; renvoie la raison du refus, ou null si elle peut être publiée. */
async function problemWith(campaign: CampaignDoc, apps: Map<string, AppDoc>): Promise<string | null> {
  if (!apps.has(campaign.promotedAppId)) return "Application promue introuvable";
  if (campaign.sourceAppIds.length === 0) return "Aucun jeu source choisi";
  if (!isPlayStoreUrl(campaign.destinationUrl)) return "Le lien doit être une fiche play.google.com";
  if (!(campaign.videoDurationMs > 0 && campaign.videoDurationMs <= MAX_DURATION_MS)) {
    return `Durée de la vidéo hors limite (${MAX_DURATION_MS / 1000} s maximum)`;
  }
  if (!isIsoDate(campaign.startsAt) || !isIsoDate(campaign.endsAt)) return "Date invalide";

  const bucket = adminBucket();
  let metadata;
  try {
    [metadata] = await bucket.file(campaign.videoStoragePath).getMetadata();
  } catch (error) {
    // Distingue un fichier absent d'un accès refusé ou d'un mauvais bucket, qui donnaient le même message.
    const code = (error as { code?: number | string }).code;
    const message = error instanceof Error ? error.message : String(error);
    console.error("Lecture Storage impossible", bucket.name, campaign.videoStoragePath, error);
    if (code === 404) return `Fichier vidéo introuvable dans Storage (bucket ${bucket.name}, chemin ${campaign.videoStoragePath})`;
    return `Lecture de la vidéo impossible (bucket ${bucket.name}, code ${code ?? "?"}) : ${message}`;
  }
  if (metadata.contentType !== "video/mp4") return "La vidéo n'est pas un MP4";
  if (Number(metadata.size) > MAX_VIDEO_BYTES) return "La vidéo dépasse 10 Mo";
  return null;
}

/**
 * Régénère `public_catalogs/{jeu}` à partir des apps et campagnes. Seul point d'écriture de ces
 * documents : les jeux ne lisent que cette projection, jamais les brouillons.
 */
export async function publishCatalogs(): Promise<PublishReport> {
  const db = adminDb();
  const [appsSnap, campaignsSnap, catalogsSnap] = await Promise.all([
    db.collection("apps").get(),
    db.collection("campaigns").get(),
    db.collection("public_catalogs").get(),
  ]);

  const apps = new Map(appsSnap.docs.map((item) => [item.id, item.data() as AppDoc]));
  const sources = [...apps].filter(([, app]) => app.enabledAsSource).map(([id]) => id);
  const catalogs = new Map<string, CatalogCampaign[]>(sources.map((id) => [id, []]));
  const report: PublishReport = { published: {}, skipped: [] };
  const bucketName = adminBucket().name;

  for (const item of campaignsSnap.docs) {
    const campaign = item.data() as CampaignDoc;
    if (campaign.status !== "active") continue;

    const problem = await problemWith(campaign, apps);
    if (problem) {
      report.skipped.push({ campaignId: item.id, title: campaign.title, reason: problem });
      continue;
    }

    const promoted = apps.get(campaign.promotedAppId)!;
    for (const source of campaign.sourceAppIds) {
      // Un jeu ne se promeut jamais lui-même ; un jeu non activé comme source ne reçoit rien.
      if (source === campaign.promotedAppId || !catalogs.has(source)) continue;
      catalogs.get(source)!.push({
        id: item.id,
        name: promoted.name,
        audience: "adult",
        locale: campaign.locale,
        videoUrl: mediaUrl(bucketName, campaign.videoStoragePath),
        durationMs: campaign.videoDurationMs,
        destinationUrl: campaign.destinationUrl,
        weight: Math.max(1, Math.round(campaign.weight) || 1),
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      });
    }
  }

  // Les catalogues de jeux qui ne sont plus sources sont vidés, pas laissés périmés.
  const stale = catalogsSnap.docs.map((item) => item.id).filter((id) => !catalogs.has(id));
  const batch = db.batch();
  for (const [source, campaigns] of catalogs) {
    report.published[source] = campaigns.length;
    batch.set(db.collection("public_catalogs").doc(source), {
      schemaVersion: 1,
      sourceAppId: source,
      catalogVersion: Date.now(),
      generatedAt: FieldValue.serverTimestamp(),
      campaigns,
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
