"use client";

import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, mediaUrl, storage } from "@/lib/firebase-client";
import { isLibraryPath, type AppDoc, type CampaignDoc, type CampaignStatus, type Identified } from "@/lib/types";
import { PhonePreview } from "./PhonePreview";
import { ConfirmDialog, StatusPill, btnDanger, btnPrimary, btnSecondary } from "./ui";

interface CampaignsPanelProps {
  campaigns: Identified<CampaignDoc>[];
  apps: Identified<AppDoc>[];
  onNew: () => void;
  onEdit: (campaign: Identified<CampaignDoc>) => void;
  /** Appelé après chaque modification pour republier les catalogues. */
  onChanged: () => void;
}

const GRID = "md:grid-cols-[1.4fr_1fr_110px_90px_1.6fr]";

function formatPeriod(item: CampaignDoc): string {
  const format = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "…");
  return item.startsAt || item.endsAt ? `${format(item.startsAt)} → ${format(item.endsAt)}` : "Sans limite";
}

export function CampaignsPanel({ campaigns, apps, onNew, onEdit, onChanged }: CampaignsPanelProps) {
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Identified<CampaignDoc> | null>(null);

  const appName = (id: string) => apps.find((item) => item.id === id)?.data.name ?? id;

  async function setStatus(item: Identified<CampaignDoc>, status: CampaignStatus) {
    setBusy(true);
    try {
      await updateDoc(doc(db, "campaigns", item.id), { status });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const item = toDelete;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "campaigns", item.id));
      // Un clip de la bibliothèque reste disponible pour d'autres campagnes.
      if (!isLibraryPath(item.data.videoStoragePath)) {
        await deleteObject(ref(storage, item.data.videoStoragePath)).catch(() => undefined);
      }
      setToDelete(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function openPreview(item: Identified<CampaignDoc>) {
    setPreview({ name: appName(item.data.promotedAppId), url: mediaUrl(item.data.videoStoragePath) });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className={btnPrimary} onClick={onNew}>
          Nouvelle campagne
        </button>
      </div>

      <div className="rounded-lg border border-[#262626]">
        <div className={`hidden gap-4 border-b border-[#262626] px-4 py-3 text-[13px] text-[#a1a1a1] md:grid ${GRID}`}>
          <span>Campagne</span>
          <span>Période</span>
          <span>Statut</span>
          <span>Durée</span>
          <span />
        </div>
        {campaigns.length === 0 && <p className="px-4 py-6 text-sm text-[#a1a1a1]">Aucune campagne pour le moment.</p>}
        {campaigns.map((item) => {
          const c = item.data;
          return (
            <div
              key={item.id}
              className={`grid min-h-14 items-center gap-2 border-b border-[#262626] px-4 py-3 text-sm last:border-b-0 hover:bg-[#0a0a0a] md:gap-4 ${GRID}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-accent-pink">{c.title}</span>
                <span className="block truncate text-[13px] text-[#a1a1a1]">
                  {appName(c.promotedAppId)} dans {c.sourceAppIds.map(appName).join(", ")}
                </span>
              </span>
              <span className="text-[#a1a1a1]">{formatPeriod(c)}</span>
              <StatusPill status={c.status} />
              <span className="text-[#a1a1a1]">{(c.videoDurationMs / 1000).toFixed(1)} s</span>
              <span className="flex flex-wrap gap-2">
                <button type="button" className={btnSecondary} onClick={() => openPreview(item)}>
                  Aperçu
                </button>
                <button type="button" className={btnSecondary} onClick={() => onEdit(item)}>
                  Modifier
                </button>
                {c.status === "active" ? (
                  <button type="button" className={btnSecondary} disabled={busy} onClick={() => setStatus(item, "inactive")}>
                    Désactiver
                  </button>
                ) : c.status !== "archived" ? (
                  <button type="button" className={btnSecondary} disabled={busy} onClick={() => setStatus(item, "active")}>
                    Activer
                  </button>
                ) : null}
                {c.status !== "archived" && (
                  <button type="button" className={btnSecondary} disabled={busy} onClick={() => setStatus(item, "archived")}>
                    Archiver
                  </button>
                )}
                <button type="button" className={btnDanger} disabled={busy} onClick={() => setToDelete(item)}>
                  Supprimer
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {preview && <PhonePreview name={preview.name} videoUrl={preview.url} onClose={() => setPreview(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer la campagne"
          message={
            isLibraryPath(toDelete.data.videoStoragePath)
              ? `« ${toDelete.data.title} » sera supprimée définitivement. Son clip reste dans la bibliothèque.`
              : `« ${toDelete.data.title} » et sa vidéo seront supprimées définitivement.`
          }
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
