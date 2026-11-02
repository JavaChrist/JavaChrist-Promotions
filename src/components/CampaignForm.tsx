"use client";

import { useState } from "react";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";
import { doc, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { db, storage } from "@/lib/firebase-client";
import {
  MAX_DURATION_MS,
  MAX_VIDEO_BYTES,
  isPlayStoreUrl,
  type AppDoc,
  type CampaignDoc,
  type Identified,
} from "@/lib/types";
import { Field, btnPrimary, btnSecondary, inputClass } from "./ui";

interface CampaignFormProps {
  apps: Identified<AppDoc>[];
  initial?: Identified<CampaignDoc>;
  onSaved: () => void;
  onCancel: () => void;
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration * 1000));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Vidéo illisible"));
    };
    video.src = url;
  });
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CampaignForm({ apps, initial, onSaved, onCancel }: CampaignFormProps) {
  const start = initial?.data;
  const [title, setTitle] = useState(start?.title ?? "");
  const [promotedAppId, setPromotedAppId] = useState(start?.promotedAppId ?? "");
  const [sourceAppIds, setSourceAppIds] = useState<string[]>(start?.sourceAppIds ?? []);
  const [destinationUrl, setDestinationUrl] = useState(start?.destinationUrl ?? "");
  const [weight, setWeight] = useState(String(start?.weight ?? 1));
  const [startsAt, setStartsAt] = useState(toLocalInput(start?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(start?.endsAt ?? null));
  const [file, setFile] = useState<File | null>(null);
  const [durationMs, setDurationMs] = useState(start?.videoDurationMs ?? 0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const sources = apps.filter((item) => item.data.enabledAsSource);

  async function pickFile(next: File | null) {
    setError("");
    if (!next) return;
    if (next.type !== "video/mp4") return setError("Le fichier doit être un MP4.");
    if (next.size > MAX_VIDEO_BYTES) return setError("La vidéo dépasse 10 Mo.");
    try {
      const duration = await readDuration(next);
      if (duration > MAX_DURATION_MS) return setError(`La vidéo dure ${(duration / 1000).toFixed(1)} s : 15 s maximum.`);
      setFile(next);
      setDurationMs(duration);
    } catch {
      setError("Impossible de lire cette vidéo.");
    }
  }

  function choosePromoted(id: string) {
    setPromotedAppId(id);
    const url = apps.find((item) => item.id === id)?.data.playStoreUrl;
    if (url && !destinationUrl) setDestinationUrl(url);
  }

  function upload(path: string, video: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(storage, path), video, { contentType: "video/mp4" });
      task.on(
        "state_changed",
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        () => resolve()
      );
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const weightValue = Number(weight);
    if (!title.trim()) return setError("Le titre interne est obligatoire.");
    if (!promotedAppId) return setError("Choisis l'application promue.");
    if (sourceAppIds.length === 0) return setError("Choisis au moins un jeu source.");
    if (!isPlayStoreUrl(destinationUrl)) return setError("Le lien doit être une fiche play.google.com (https).");
    if (!Number.isInteger(weightValue) || weightValue < 1 || weightValue > 10) return setError("Le poids est un entier de 1 à 10.");
    if (!file && !start) return setError("Ajoute une vidéo MP4.");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return setError("La fin doit suivre le début.");

    try {
      const id = initial?.id ?? doc(collection(db, "campaigns")).id;
      let videoStoragePath = start?.videoStoragePath ?? "";
      if (file) {
        videoStoragePath = `campaigns/${id}/promo-${Date.now()}.mp4`;
        await upload(videoStoragePath, file);
      }
      const data: CampaignDoc = {
        title: title.trim(),
        promotedAppId,
        sourceAppIds,
        status: start?.status ?? "draft",
        audience: "adult",
        locale: "fr",
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        weight: weightValue,
        videoStoragePath,
        videoDurationMs: durationMs,
        destinationUrl: destinationUrl.trim(),
      };
      await setDoc(doc(db, "campaigns", id), { ...data, updatedAt: serverTimestamp() });
      // L'ancienne vidéo n'est supprimée qu'après l'enregistrement réussi de la nouvelle.
      if (file && start?.videoStoragePath) {
        await deleteObject(ref(storage, start.videoStoragePath)).catch(() => undefined);
      }
      onSaved();
    } catch {
      setProgress(null);
      setError("Enregistrement impossible. Réessaie.");
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <h2 className="text-base font-medium">{initial ? "Modifier la campagne" : "Nouvelle campagne"}</h2>
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
          {sources.length === 0 && <p className="text-sm text-[#a1a1a1]">Aucun jeu source : active-en un dans Applications.</p>}
          {sources.map((item) => (
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
      <Field label="Lien Google Play">
        <input
          className={inputClass}
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://play.google.com/store/apps/details?id=…"
        />
      </Field>
      <Field
        label="Vidéo MP4"
        hint={durationMs ? `Durée mesurée : ${(durationMs / 1000).toFixed(1)} s${file ? "" : " (vidéo actuelle)"}` : "15 s maximum (10–12 s conseillé), 10 Mo maximum, H.264/AAC."}
      >
        <input
          type="file"
          accept="video/mp4"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[#a1a1a1] file:mr-3 file:rounded-lg file:border file:border-[#333] file:bg-black file:px-3 file:py-1.5 file:text-sm file:text-[#ededed]"
        />
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
      {progress !== null && <p className="text-sm text-[#a1a1a1]">Envoi de la vidéo : {progress} %</p>}
      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={progress !== null}>
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
