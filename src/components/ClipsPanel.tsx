"use client";

import { useState } from "react";
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, mediaUrl, storage } from "@/lib/firebase-client";
import { LIBRARY_PREFIX, type AppDoc, type CampaignDoc, type ClipDoc, type Identified } from "@/lib/types";
import { checkVideoFile, formatSize, uploadVideo } from "@/lib/video";
import { PhonePreview } from "./PhonePreview";
import { ConfirmDialog, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

interface ClipsPanelProps {
  clips: Identified<ClipDoc>[];
  apps: Identified<AppDoc>[];
  campaigns: Identified<CampaignDoc>[];
}

const GRID = "md:grid-cols-[1.6fr_70px_80px_1fr_260px]";

export function ClipsPanel({ clips, apps, campaigns }: ClipsPanelProps) {
  const [name, setName] = useState("");
  const [appId, setAppId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [listError, setListError] = useState("");
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<Identified<ClipDoc> | null>(null);
  const [busy, setBusy] = useState(false);

  const appName = (id: string | null) => (id ? (apps.find((item) => item.id === id)?.data.name ?? id) : "Toutes");
  const usedBy = (clip: ClipDoc) => campaigns.filter((item) => item.data.videoStoragePath === clip.storagePath);
  const sorted = [...clips].sort((a, b) => a.data.name.localeCompare(b.data.name, "fr"));

  async function pickFile(next: File | null) {
    setError("");
    setFile(null);
    if (!next) return;
    const result = await checkVideoFile(next);
    if ("error" in result) return setError(result.error);
    setFile(next);
    setDurationMs(result.durationMs);
    if (!name.trim()) setName(next.name.replace(/\.mp4$/i, ""));
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Choisis un fichier MP4.");
    if (!name.trim()) return setError("Le nom est obligatoire.");

    const id = doc(collection(db, "clips")).id;
    const storagePath = `${LIBRARY_PREFIX}${id}.mp4`;
    setProgress(0);
    try {
      await uploadVideo(storagePath, file, setProgress);
      const data: ClipDoc = { name: name.trim(), appId: appId || null, storagePath, durationMs, sizeBytes: file.size };
      await setDoc(doc(db, "clips", id), { ...data, createdAt: serverTimestamp() });
      setName("");
      setAppId("");
      setFile(null);
      setDurationMs(0);
      setInputKey((key) => key + 1);
      setError("");
    } catch {
      // Pas de fichier orphelin si la fiche n'a pas pu être enregistrée.
      await deleteObject(ref(storage, storagePath)).catch(() => undefined);
      setError("Dépôt impossible. Réessaie.");
    } finally {
      setProgress(null);
    }
  }

  async function saveName() {
    if (!renaming) return;
    const next = renaming.name.trim();
    if (!next) return setListError("Le nom ne peut pas être vide.");
    await updateDoc(doc(db, "clips", renaming.id), { name: next });
    setRenaming(null);
    setListError("");
  }

  function askDelete(clip: Identified<ClipDoc>) {
    const users = usedBy(clip.data);
    if (users.length > 0) {
      return setListError(
        `« ${clip.data.name} » est utilisé par : ${users.map((item) => item.data.title).join(", ")}. Choisis un autre clip dans ces campagnes avant de le supprimer.`
      );
    }
    setListError("");
    setToDelete(clip);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "clips", toDelete.id));
      await deleteObject(ref(storage, toDelete.data.storagePath)).catch(() => undefined);
      setToDelete(null);
    } catch {
      setListError("Suppression impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {listError && <p className="rounded-lg border border-[#f33a4a] p-3 text-sm text-[#f33a4a]">{listError}</p>}

      <div className="rounded-lg border border-[#262626]">
        <div className={`hidden gap-4 border-b border-[#262626] px-4 py-3 text-[13px] text-[#a1a1a1] md:grid ${GRID}`}>
          <span>Clip</span>
          <span>Durée</span>
          <span>Taille</span>
          <span>Utilisé par</span>
          <span />
        </div>
        {sorted.length === 0 && <p className="px-4 py-6 text-sm text-[#a1a1a1]">Aucun clip pour le moment.</p>}
        {sorted.map((item) => {
          const c = item.data;
          const users = usedBy(c);
          const isRenaming = renaming?.id === item.id;
          return (
            <div
              key={item.id}
              className={`grid min-h-14 items-center gap-2 border-b border-[#262626] px-4 py-3 text-sm last:border-b-0 hover:bg-[#0a0a0a] md:gap-4 ${GRID}`}
            >
              <span className="min-w-0">
                {isRenaming ? (
                  <input
                    className={inputClass}
                    value={renaming.name}
                    autoFocus
                    onChange={(e) => setRenaming({ id: item.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                ) : (
                  <>
                    <span className="block truncate">{c.name}</span>
                    <span className="block truncate text-[13px] text-[#a1a1a1]">{appName(c.appId)}</span>
                  </>
                )}
              </span>
              <span className="text-[#a1a1a1]">{(c.durationMs / 1000).toFixed(1)} s</span>
              <span className="text-[#a1a1a1]">{formatSize(c.sizeBytes)}</span>
              <span className="truncate text-[#a1a1a1]">{users.length ? users.map((u) => u.data.title).join(", ") : "Aucune campagne"}</span>
              <span className="flex flex-wrap gap-2">
                {isRenaming ? (
                  <>
                    <button type="button" className={btnSecondary} onClick={saveName}>
                      Enregistrer
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => setRenaming(null)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={btnSecondary} onClick={() => setPreview({ name: appName(c.appId), url: mediaUrl(c.storagePath) })}>
                      Aperçu
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => setRenaming({ id: item.id, name: c.name })}>
                      Renommer
                    </button>
                    <button type="button" className={btnDanger} onClick={() => askDelete(item)}>
                      Supprimer
                    </button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="max-w-xl space-y-4">
        <h2 className="section-title text-base font-medium">Déposer un clip</h2>
        <Field label="Vidéo MP4" hint={durationMs && file ? `Durée mesurée : ${(durationMs / 1000).toFixed(1)} s, ${formatSize(file.size)}` : "15 s maximum (10–12 s conseillé), 10 Mo maximum, H.264/AAC."}>
          <input
            key={inputKey}
            type="file"
            accept="video/mp4"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[#a1a1a1] file:mr-3 file:rounded-lg file:border file:border-[#333] file:bg-black file:px-3 file:py-1.5 file:text-sm file:text-[#ededed]"
          />
        </Field>
        <Field label="Nom">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="RideCloud, version courte" />
        </Field>
        <Field label="Application présentée" hint="Facultatif. Sert à proposer ce clip dans les campagnes de cette application.">
          <select className={inputClass} value={appId} onChange={(e) => setAppId(e.target.value)}>
            <option value="">Toutes</option>
            {apps.map((item) => (
              <option key={item.id} value={item.id}>
                {item.data.name}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-[#f33a4a]">{error}</p>}
        {progress !== null && <p className="text-sm text-[#a1a1a1]">Envoi de la vidéo : {progress} %</p>}
        <button type="submit" className={btnPrimary} disabled={progress !== null}>
          Déposer
        </button>
      </form>

      {preview && <PhonePreview name={preview.name} videoUrl={preview.url} onClose={() => setPreview(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer le clip"
          message={`« ${toDelete.data.name} » et sa vidéo seront supprimés définitivement.`}
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
