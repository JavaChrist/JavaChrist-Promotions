"use client";

import { useState } from "react";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { isPlayStoreUrl, type AppDoc, type Identified } from "@/lib/types";
import { ConfirmDialog, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

interface AppsPanelProps {
  apps: Identified<AppDoc>[];
  /** Appelé après chaque modification pour republier les catalogues. */
  onChanged: () => void;
}

const ID_PATTERN = /^[a-z0-9-]+$/;

export function AppsPanel({ apps, onChanged }: AppsPanelProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [androidPackage, setAndroidPackage] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [enabledAsSource, setEnabledAsSource] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Identified<AppDoc> | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!ID_PATTERN.test(id)) return setError("Identifiant : minuscules, chiffres et tirets seulement.");
    if (apps.some((item) => item.id === id)) return setError("Cet identifiant existe déjà.");
    if (!name.trim()) return setError("Le nom est obligatoire.");
    if (playStoreUrl && !isPlayStoreUrl(playStoreUrl)) return setError("Le lien doit être une fiche play.google.com.");

    const data: AppDoc = {
      name: name.trim(),
      androidPackage: androidPackage.trim(),
      playStoreUrl: playStoreUrl.trim() || null,
      enabledAsSource,
    };
    await setDoc(doc(db, "apps", id), data);
    setId("");
    setName("");
    setAndroidPackage("");
    setPlayStoreUrl("");
    setEnabledAsSource(false);
    setError("");
    onChanged();
  }

  async function toggleSource(item: Identified<AppDoc>) {
    await updateDoc(doc(db, "apps", item.id), { enabledAsSource: !item.data.enabledAsSource });
    onChanged();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteDoc(doc(db, "apps", toDelete.id));
    setToDelete(null);
    onChanged();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-[#262626]">
        <div className="hidden grid-cols-[1fr_1.2fr_140px_250px] gap-4 border-b border-[#262626] px-4 py-3 text-[13px] text-[#a1a1a1] md:grid">
          <span>Application</span>
          <span>Package Android</span>
          <span>Diffuse les promos</span>
          <span />
        </div>
        {apps.length === 0 && <p className="px-4 py-6 text-sm text-[#a1a1a1]">Aucune application pour le moment.</p>}
        {apps.map((item) => (
          <div
            key={item.id}
            className="grid min-h-14 items-center gap-2 border-b border-[#262626] px-4 py-3 text-sm last:border-b-0 hover:bg-[#0a0a0a] md:grid-cols-[1fr_1.2fr_140px_250px] md:gap-4"
          >
            <span className="truncate">
              {item.data.name} <code className="ml-2 text-[13px] text-[#a1a1a1]">{item.id}</code>
            </span>
            <code className="truncate text-[13px] text-[#a1a1a1]">{item.data.androidPackage || "—"}</code>
            <span className="text-[#a1a1a1]">{item.data.enabledAsSource ? "Oui" : "Non"}</span>
            <span className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={() => toggleSource(item)}>
                {item.data.enabledAsSource ? "Arrêter la diffusion" : "Activer la diffusion"}
              </button>
              <button type="button" className={btnDanger} onClick={() => setToDelete(item)}>
                Supprimer
              </button>
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="max-w-xl space-y-4">
        <h2 className="section-title text-base font-medium">Ajouter une application</h2>
        <Field label="Identifiant" hint="Définitif. Pour un jeu diffuseur, il doit correspondre à celui codé dans le jeu (Motissimo : motissimo).">
          <input className={inputClass} value={id} onChange={(e) => setId(e.target.value)} placeholder="motissimo" />
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
        <Field label="Fiche Google Play" hint="Laisser vide tant que l'application n'est pas publiée.">
          <input
            className={inputClass}
            value={playStoreUrl}
            onChange={(e) => setPlayStoreUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=…"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabledAsSource} onChange={(e) => setEnabledAsSource(e.target.checked)} />
          Ce jeu diffuse les promos (il affiche les clips des autres applications)
        </label>
        {error && <p className="text-sm text-[#f33a4a]">{error}</p>}
        <button type="submit" className={btnPrimary}>
          Ajouter
        </button>
      </form>

      {toDelete && (
        <ConfirmDialog
          title="Supprimer l'application"
          message={`« ${toDelete.data.name} » sera supprimée de la liste.`}
          confirmLabel="Supprimer"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
