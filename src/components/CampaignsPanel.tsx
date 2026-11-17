"use client";

import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, mediaUrl } from "@/lib/firebase-client";
import type { AppDoc, CampaignDoc, CampaignStatus, ClipDoc, Identified } from "@/lib/types";
import { PhonePreview } from "./PhonePreview";
import { ConfirmDialog, StatusPill, btnDanger, btnPrimary, btnSecondary } from "./ui";

interface CampaignsPanelProps {
  campaigns: Identified<CampaignDoc>[];
  apps: Identified<AppDoc>[];
  clips: Identified<ClipDoc>[];
  onNew: () => void;
  onEdit: (campaign: Identified<CampaignDoc>) => void;
  /** Appelé après chaque modification pour republier les catalogues. */
  onChanged: () => void;
}

const GRID = "md:grid-cols-[1.6fr_1fr_110px_70px_1.6fr]";

function formatPeriod(item: CampaignDoc): string {
  const format = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "…");
  return item.startsAt || item.endsAt ? `${format(item.startsAt)} → ${format(item.endsAt)}` : "Sans limite";
}

export function CampaignsPanel({ campaigns, apps, clips, onNew, onEdit, onChanged }: CampaignsPanelProps) {
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Identified<CampaignDoc> | null>(null);

  const appName = (id: string) => apps.find((item) => item.id === id)?.data.name ?? id;
  const clipsOf = (campaign: CampaignDoc) =>
    (campaign.clipIds ?? []).flatMap((id) => {
      const clip = clips.find((item) => item.id === id);
      return clip ? [clip] : [];
    });

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
      // Les clips restent dans la bibliothèque : seule la campagne disparaît.
      await deleteDoc(doc(db, "campaigns", item.id));
      setToDelete(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function openPreview(clip: Identified<ClipDoc>) {
    setPreview({ name: appName(clip.data.appId), url: mediaUrl(clip.data.storagePath) });
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
          <span>Clips</span>
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
                  <span className="font-mono text-accent-teal">{c.locale.toUpperCase()}</span> · dans{" "}
                  {c.hostAppId ? appName(c.hostAppId) : "ancien format, à enregistrer à nouveau"}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {clipsOf(c).map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      className="truncate text-[13px] text-accent-violet hover:underline"
                      title="Aperçu du clip"
                      onClick={() => openPreview(clip)}
                    >
                      ▶ {clip.data.name}
                    </button>
                  ))}
                </span>
              </span>
              <span className="text-[#a1a1a1]">{formatPeriod(c)}</span>
              <StatusPill status={c.status} />
              <span className="text-[#a1a1a1]">{(c.clipIds ?? []).length}</span>
              <span className="flex flex-wrap gap-2">
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
          message={`« ${toDelete.data.title} » sera supprimée définitivement. Ses clips restent dans la bibliothèque.`}
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
