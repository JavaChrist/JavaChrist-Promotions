/** Application JavaChrist (promue et/ou jeu source). Collection `apps`. */
export interface AppDoc {
  name: string;
  androidPackage: string;
  playStoreUrl: string | null;
  /** Ce jeu peut afficher des promotions. */
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
