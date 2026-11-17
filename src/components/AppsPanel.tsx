"use client";

import { useState } from "react";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { isPlayStoreUrl, type AppDoc, type CampaignDoc, type ClipDoc, type Identified } from "@/lib/types";
import { ConfirmDialog, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

interface AppsPanelProps {
  apps: Identified<AppDoc>[];
  clips: Identified<ClipDoc>[];
  campaigns: Identified<CampaignDoc>[];
  /** Appelé après chaque modification pour republier les catalogues. */
  onChanged: () => void;
}

const ID_PATTERN = /^[a-z0-9-]+$/;
const GRID = "md:grid-cols-[1fr_1.2fr_1.2fr_200px]";

export function AppsPanel({ apps, clips, campaigns, onChanged }: AppsPanelProps) {
  // `editingId` est l'identifiant de l'application en cours de modification (il ne change jamais), ou null pour un ajout.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [androidPackage, setAndroidPackage] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Identified<AppDoc> | null>(null);

  function reset() {
    setEditingId(null);
    setId("");
    setName("");
    setAndroidPackage("");
    setPlayStoreUrl("");
    setError("");
  }

  function startEdit(item: Identified<AppDoc>) {
    setEditingId(item.id);
    setId(item.id);
    setName(item.data.name);
    setAndroidPackage(item.data.androidPackage);
    setPlayStoreUrl(item.data.playStoreUrl ?? "");
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) {
      if (!ID_PATTERN.test(id)) return setError("Identifiant : minuscules, chiffres et tirets seulement.");
      if (apps.some((item) => item.id === id)) return setError("Cet identifiant existe déjà.");
    }
    if (!name.trim()) return setError("Le nom est obligatoire.");
    if (playStoreUrl && !isPlayStoreUrl(playStoreUrl)) return setError("Le lien doit être une fiche play.google.com.");

    const data: AppDoc = {
      name: name.trim(),
      androidPackage: androidPackage.trim(),
      playStoreUrl: playStoreUrl.trim() || null,
    };
    if (editingId) await updateDoc(doc(db, "apps", editingId), { ...data });
    else await setDoc(doc(db, "apps", id), data);
    reset();
    onChanged();
  }

  const usage = (appId: string) => ({
    clips: clips.filter((item) => item.data.appId === appId).length,
    campaigns: campaigns.filter((item) => item.data.hostAppId === appId).length,
  });

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteDoc(doc(db, "apps", toDelete.id));
    setToDelete(null);
    onChanged();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-[#262626]">
        <div className={`hidden gap-4 border-b border-[#262626] px-4 py-3 text-[13px] text-[#a1a1a1] md:grid ${GRID}`}>
          <span>Application</span>
          <span>Package Android</span>
          <span>Fiche Google Play · utilisation</span>
          <span />
        </div>
        {apps.length === 0 && <p className="px-4 py-6 text-sm text-[#a1a1a1]">Aucune application pour le moment.</p>}
        {apps.map((item) => {
          const used = usage(item.id);
          return (
            <div key={item.id} className={`grid min-h-14 items-center gap-2 border-b border-[#262626] px-4 py-3 text-sm last:border-b-0 hover:bg-[#0a0a0a] md:gap-4 ${GRID}`}>
              <span className="truncate">
                <span className="font-medium text-accent-blue">{item.data.name}</span> <code className="ml-2 text-[13px] text-[#a1a1a1]">{item.id}</code>
              </span>
              <code className="truncate text-[13px] text-[#a1a1a1]">{item.data.androidPackage || "—"}</code>
              <span className="min-w-0 text-[13px] text-[#a1a1a1]">
                <span className="block truncate">
                  {item.data.playStoreUrl ? "Lien renseigné" : <span className="text-[#f5a623]">Lien manquant : ses clips ne seront pas publiés</span>}
                </span>
                <span className="block truncate">
                  {used.clips} clip{used.clips > 1 ? "s" : ""} qui la présente{used.clips > 1 ? "nt" : ""} · {used.campaigns} campagne{used.campaigns > 1 ? "s" : ""} où elle affiche des clips
                </span>
              </span>
              <span className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => startEdit(item)}>
                  Modifier
                </button>
                <button type="button" className={btnDanger} onClick={() => setToDelete(item)}>
                  Supprimer
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={save} className="max-w-xl space-y-4">
        <h2 className="section-title text-base font-medium">{editingId ? `Modifier ${editingId}` : "Ajouter une application"}</h2>
        <Field label="Identifiant" hint="Définitif. Pour une application qui affiche des clips, il doit correspondre à celui codé dans le jeu (Motissimo : motissimo).">
          <input className={inputClass} value={id} onChange={(e) => setId(e.target.value)} placeholder="motissimo" disabled={editingId !== null} />
        </Field>
        <Field label="Nom affiché">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Motissimo" />
        </Field>
        <Field label="Package Android">
          <input
            className={inputClass}
            value={androidPackage}
            onChange={(e) => setAndroidPackage(e.target.value)}
            placeholder="fr.javachrist.motissimo"
          />
        </Field>
        <Field label="Fiche Google Play" hint="Nécessaire pour que les clips qui présentent cette application soient publiés : c'est le lien ouvert au toucher du clip.">
          <input
            className={inputClass}
            value={playStoreUrl}
            onChange={(e) => setPlayStoreUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=…"
          />
        </Field>
        {error && <p className="text-sm text-[#f33a4a]">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className={btnPrimary}>
            {editingId ? "Enregistrer" : "Ajouter"}
          </button>
          {editingId && (
            <button type="button" className={btnSecondary} onClick={reset}>
              Annuler
            </button>
          )}
        </div>
      </form>

      {toDelete && (
        <ConfirmDialog
          title="Supprimer l'application"
          message={`« ${toDelete.data.name} » sera supprimée de la liste. Ses clips et ses campagnes ne seront pas publiés tant que tu ne les as pas changés.`}
          confirmLabel="Supprimer"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
