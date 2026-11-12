/** Application JavaChrist (promue et/ou jeu diffuseur). Collection `apps`. */
export interface AppDoc {
  name: string;
  androidPackage: string;
  playStoreUrl: string | null;
  /** « Diffuse les promos » : ce jeu affiche les clips des autres applications. Nom de champ historique, conservé. */
  enabledAsSource: boolean;
}

export type CampaignStatus = "draft" | "active" | "inactive" | "archived";

/** Campagne, brouillons compris. Collection `campaigns`, jamais lue par les jeux. */
export interface CampaignDoc {
  title: string;
  promotedAppId: string;
  sourceAppIds: string[];
  status: CampaignStatus;
  audience: "adult";
  locale: string;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
  videoStoragePath: string;
  videoDurationMs: number;
  destinationUrl: string;
}

/** Clip de la bibliothèque, déposé une fois et réutilisable dans plusieurs campagnes. Collection `clips`. */
export interface ClipDoc {
  name: string;
  /** Application que présente le clip, pour filtrer le choix dans les campagnes. */
  appId: string | null;
  storagePath: string;
  durationMs: number;
  sizeBytes: number;
}

/** Dossier Storage de la bibliothèque. Un fichier ici n'appartient à aucune campagne : on ne l'efface jamais depuis une campagne. */
export const LIBRARY_PREFIX = "library/";

export function isLibraryPath(path: string): boolean {
  return path.startsWith(LIBRARY_PREFIX);
}

export interface Identified<T> {
  id: string;
  data: T;
}

export const MAX_DURATION_MS = 15_000;
export const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
export const PLAY_STORE_HOST = "play.google.com";

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Brouillon",
  active: "Active",
  inactive: "Désactivée",
  archived: "Archivée",
};

export function isPlayStoreUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === PLAY_STORE_HOST;
  } catch {
    return false;
  }
}
