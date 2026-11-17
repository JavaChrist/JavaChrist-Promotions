/** Application JavaChrist. Collection `apps`. Toute application peut présenter des clips (via son lien Google Play) et en recevoir (dans ses campagnes). */
export interface AppDoc {
  name: string;
  androidPackage: string;
  /** Fiche Google Play : c'est le lien ouvert quand on touche un clip qui présente cette application. */
  playStoreUrl: string | null;
}

export type CampaignStatus = "draft" | "active" | "inactive" | "archived";

/**
 * Campagne : « dans cette application, afficher ces clips ». Brouillons compris. Collection `campaigns`, jamais lue par les jeux.
 * L'application présentée et le lien Google Play viennent de chaque clip, pas de la campagne.
 */
export interface CampaignDoc {
  title: string;
  /** Application où les clips s'affichent. */
  hostAppId: string;
  /** Clips affichés dans cette application (collection `clips`). */
  clipIds: string[];
  status: CampaignStatus;
  audience: "adult";
  locale: string;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
}

/** Clip de la bibliothèque, déposé une fois et réutilisable dans plusieurs campagnes. Collection `clips`. */
export interface ClipDoc {
  name: string;
  /** Application que présente le clip (obligatoire) : son lien Google Play est la destination du clip. */
  appId: string;
  storagePath: string;
  durationMs: number;
  sizeBytes: number;
}

/** Dossier Storage des clips déposés depuis l'onglet Clips. */
export const LIBRARY_PREFIX = "library/";

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

/** Langues des campagnes : un jeu (GéoFR, GéoDE…) ne garde que les campagnes de sa `locale`. */
export const LOCALES: Record<string, string> = {
  fr: "Français",
  de: "Allemand",
  es: "Espagnol",
  it: "Italien",
  en: "Anglais",
  nl: "Néerlandais",
  pt: "Portugais",
};

export function isPlayStoreUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === PLAY_STORE_HOST;
  } catch {
    return false;
  }
}
