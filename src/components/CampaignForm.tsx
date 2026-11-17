"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { LOCALES, type AppDoc, type CampaignDoc, type ClipDoc, type Identified } from "@/lib/types";
import { Field, btnPrimary, btnSecondary, inputClass } from "./ui";

interface CampaignFormProps {
  apps: Identified<AppDoc>[];
  clips: Identified<ClipDoc>[];
  initial?: Identified<CampaignDoc>;
  onSaved: () => void;
  onCancel: () => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CampaignForm({ apps, clips, initial, onSaved, onCancel }: CampaignFormProps) {
  const start = initial?.data;
  const [title, setTitle] = useState(start?.title ?? "");
  const [hostAppId, setHostAppId] = useState(start?.hostAppId ?? "");
  const [clipIds, setClipIds] = useState<string[]>(start?.clipIds ?? []);
  const [locale, setLocale] = useState(start?.locale ?? "fr");
  const [weight, setWeight] = useState(String(start?.weight ?? 1));
  const [startsAt, setStartsAt] = useState(toLocalInput(start?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(start?.endsAt ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const appName = (id: string) => apps.find((item) => item.id === id)?.data.name ?? "Sans application";
  // Une application ne se promeut jamais elle-même : ses propres clips ne sont pas proposés.
  const choices = clips
    .filter((item) => item.data.appId !== hostAppId)
    .sort((a, b) => appName(a.data.appId).localeCompare(appName(b.data.appId), "fr") || a.data.name.localeCompare(b.data.name, "fr"));

  function chooseHost(id: string) {
    setHostAppId(id);
    const ownClips = new Set(clips.filter((item) => item.data.appId === id).map((item) => item.id));
    setClipIds((current) => current.filter((clipId) => !ownClips.has(clipId)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const weightValue = Number(weight);
    if (!title.trim()) return setError("Le titre interne est obligatoire.");
    if (!hostAppId) return setError("Choisis l'application où les clips s'afficheront.");
    if (clipIds.length === 0) return setError("Choisis au moins un clip à afficher.");
    if (!Number.isInteger(weightValue) || weightValue < 1 || weightValue > 10) return setError("Le poids est un entier de 1 à 10.");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return setError("La fin doit suivre le début.");

    setSaving(true);
    try {
      const id = initial?.id ?? doc(collection(db, "campaigns")).id;
      const data: CampaignDoc = {
        title: title.trim(),
        hostAppId,
        clipIds,
        status: start?.status ?? "draft",
        audience: "adult",
        locale,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        weight: weightValue,
      };
      await setDoc(doc(db, "campaigns", id), { ...data, updatedAt: serverTimestamp() });
      onSaved();
    } catch {
      setSaving(false);
      setError("Enregistrement impossible. Réessaie.");
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <h2 className="section-title text-base font-medium">{initial ? "Modifier la campagne" : "Nouvelle campagne"}</h2>
      <Field label="Titre interne" hint="Pour te repérer dans la liste. Les joueurs ne le voient jamais.">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Clips dans RideCloud" />
      </Field>
      <Field label="Application où les clips s'affichent" hint="C'est dans cette application que les joueurs verront les clips.">
        <select className={inputClass} value={hostAppId} onChange={(e) => chooseHost(e.target.value)}>
          <option value="">Choisir</option>
          {apps.map((item) => (
            <option key={item.id} value={item.id}>
              {item.data.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Clips à afficher"
        hint={
          !hostAppId
            ? "Choisis d'abord l'application où les clips s'affichent."
            : "Un clip présente une autre application et ouvre sa fiche Google Play. Les clips de l'application choisie ne sont pas proposés."
        }
      >
        <div className="space-y-2 pt-1">
          {hostAppId && choices.length === 0 && <p className="text-sm text-[#a1a1a1]">Aucun clip disponible : dépose d&apos;abord des clips dans l&apos;onglet Clips.</p>}
          {hostAppId &&
            choices.map((item) => {
              const link = apps.find((app) => app.id === item.data.appId)?.data.playStoreUrl;
              return (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={clipIds.includes(item.id)}
                    onChange={(e) => setClipIds(e.target.checked ? [...clipIds, item.id] : clipIds.filter((x) => x !== item.id))}
                  />
                  <span>
                    <span className="text-accent-violet">{item.data.name}</span>{" "}
                    <span className="text-[#a1a1a1]">
                      · présente {appName(item.data.appId)} · {(item.data.durationMs / 1000).toFixed(1)} s
                    </span>
                    {!link && <span className="text-[#f5a623]"> · lien Google Play manquant</span>}
                  </span>
                </label>
              );
            })}
        </div>
      </Field>
      <Field label="Langue" hint="Un jeu ne montre que les campagnes de sa langue : GéoFR le français, GéoDE l'allemand… Les clips doivent être dans cette langue.">
        <select className={inputClass} value={locale} onChange={(e) => setLocale(e.target.value)}>
          {Object.entries(LOCALES).map(([code, label]) => (
            <option key={code} value={code}>
              {label} ({code})
            </option>
          ))}
          {!(locale in LOCALES) && <option value={locale}>{locale}</option>}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Début (facultatif)">
          <input type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Fin (facultatif)">
          <input type="datetime-local" className={inputClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
      <Field label="Poids de rotation" hint="1 à 10. Plus le poids est élevé, plus la campagne revient souvent.">
        <input className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" />
      </Field>
      {error && <p className="text-sm text-[#f33a4a]">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={saving}>
          Enregistrer
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Annuler
        </button>
      </div>
      {!initial && <p className="text-[13px] text-[#a1a1a1]">La campagne est créée en brouillon : active-la depuis la liste après l&apos;aperçu.</p>}
    </form>
  );
}
