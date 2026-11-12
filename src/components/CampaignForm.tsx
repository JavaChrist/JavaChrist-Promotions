"use client";

import { useState } from "react";
import { deleteObject, ref } from "firebase/storage";
import { doc, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { db, storage } from "@/lib/firebase-client";
import { LOCALES, isLibraryPath, isPlayStoreUrl, type AppDoc, type CampaignDoc, type ClipDoc, type Identified } from "@/lib/types";
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
  const [promotedAppId, setPromotedAppId] = useState(start?.promotedAppId ?? "");
  const [sourceAppIds, setSourceAppIds] = useState<string[]>(start?.sourceAppIds ?? []);
  const [destinationUrl, setDestinationUrl] = useState(start?.destinationUrl ?? "");
  const [locale, setLocale] = useState(start?.locale ?? "fr");
  const [weight, setWeight] = useState(String(start?.weight ?? 1));
  const [startsAt, setStartsAt] = useState(toLocalInput(start?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(start?.endsAt ?? null));
  const [videoStoragePath, setVideoStoragePath] = useState(start?.videoStoragePath ?? "");
  const [durationMs, setDurationMs] = useState(start?.videoDurationMs ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const broadcasters = apps.filter((item) => item.data.enabledAsSource);
  // Clips proposés : ceux de l'application promue, ceux sans application, et le clip déjà choisi.
  const choices = clips
    .filter((item) => item.data.appId === null || item.data.appId === promotedAppId || item.data.storagePath === videoStoragePath)
    .sort((a, b) => a.data.name.localeCompare(b.data.name, "fr"));
  // Ancienne vidéo déposée directement dans la campagne, avant la bibliothèque.
  const legacyPath = start?.videoStoragePath && !isLibraryPath(start.videoStoragePath) ? start.videoStoragePath : "";

  function choosePromoted(id: string) {
    setPromotedAppId(id);
    const url = apps.find((item) => item.id === id)?.data.playStoreUrl;
    if (url && !destinationUrl) setDestinationUrl(url);
  }

  function chooseVideo(path: string) {
    setVideoStoragePath(path);
    if (path === legacyPath) return setDurationMs(start?.videoDurationMs ?? 0);
    setDurationMs(clips.find((item) => item.data.storagePath === path)?.data.durationMs ?? 0);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const weightValue = Number(weight);
    if (!title.trim()) return setError("Le titre interne est obligatoire.");
    if (!promotedAppId) return setError("Choisis l'application promue.");
    if (sourceAppIds.length === 0) return setError("Choisis au moins un jeu où diffuser la promotion.");
    if (!isPlayStoreUrl(destinationUrl)) return setError("Le lien doit être une fiche play.google.com (https).");
    if (!Number.isInteger(weightValue) || weightValue < 1 || weightValue > 10) return setError("Le poids est un entier de 1 à 10.");
    if (!videoStoragePath) return setError("Choisis un clip dans la bibliothèque.");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return setError("La fin doit suivre le début.");

    setSaving(true);
    try {
      const id = initial?.id ?? doc(collection(db, "campaigns")).id;
      const data: CampaignDoc = {
        title: title.trim(),
        promotedAppId,
        sourceAppIds,
        status: start?.status ?? "draft",
        audience: "adult",
        locale,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        weight: weightValue,
        videoStoragePath,
        videoDurationMs: durationMs,
        destinationUrl: destinationUrl.trim(),
      };
      await setDoc(doc(db, "campaigns", id), { ...data, updatedAt: serverTimestamp() });
      // Une ancienne vidéo propre à la campagne est supprimée une fois remplacée ; un clip de la bibliothèque jamais.
      if (legacyPath && legacyPath !== videoStoragePath) {
        await deleteObject(ref(storage, legacyPath)).catch(() => undefined);
      }
      onSaved();
    } catch {
      setSaving(false);
      setError("Enregistrement impossible. Réessaie.");
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <h2 className="section-title text-base font-medium">{initial ? "Modifier la campagne" : "Nouvelle campagne"}</h2>
      <Field label="Titre interne">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Découvrir SousPli" />
      </Field>
      <Field label="Application promue">
        <select className={inputClass} value={promotedAppId} onChange={(e) => choosePromoted(e.target.value)}>
          <option value="">Choisir</option>
          {apps.map((item) => (
            <option key={item.id} value={item.id}>
              {item.data.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Jeux où la promotion s'affiche" hint="Un jeu ne se promeut jamais lui-même.">
        <div className="space-y-2 pt-1">
          {broadcasters.length === 0 && <p className="text-sm text-[#a1a1a1]">Aucun jeu diffuseur : active la diffusion dans Applications.</p>}
          {broadcasters.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sourceAppIds.includes(item.id)}
                onChange={(e) =>
                  setSourceAppIds(e.target.checked ? [...sourceAppIds, item.id] : sourceAppIds.filter((x) => x !== item.id))
                }
              />
              {item.data.name}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Langue" hint="Un jeu ne montre que les campagnes de sa langue : GéoFR le français, GéoDE l'allemand… Le clip doit être dans cette langue.">
        <select className={inputClass} value={locale} onChange={(e) => setLocale(e.target.value)}>
          {Object.entries(LOCALES).map(([code, label]) => (
            <option key={code} value={code}>
              {label} ({code})
            </option>
          ))}
          {!(locale in LOCALES) && <option value={locale}>{locale}</option>}
        </select>
      </Field>
      <Field label="Lien Google Play">
        <input
          className={inputClass}
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://play.google.com/store/apps/details?id=…"
        />
      </Field>
      <Field
        label="Clip vidéo"
        hint={
          clips.length === 0
            ? "La bibliothèque est vide : dépose d'abord un clip dans l'onglet Clips."
            : durationMs
              ? `Durée : ${(durationMs / 1000).toFixed(1)} s`
              : "Clips de l'application promue et clips sans application."
        }
      >
        <select className={inputClass} value={videoStoragePath} onChange={(e) => chooseVideo(e.target.value)}>
          <option value="">Choisir dans la bibliothèque</option>
          {legacyPath && <option value={legacyPath}>Vidéo actuelle de la campagne</option>}
          {choices.map((item) => (
            <option key={item.id} value={item.data.storagePath}>
              {item.data.name} ({(item.data.durationMs / 1000).toFixed(1)} s)
            </option>
          ))}
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
