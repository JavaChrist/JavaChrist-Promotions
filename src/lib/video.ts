"use client";

import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase-client";
import { MAX_DURATION_MS, MAX_VIDEO_BYTES } from "./types";

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

/** Contrôle un MP4 avant envoi : mêmes limites que la publication (MP4, 10 Mo, 15 s). */
export async function checkVideoFile(file: File): Promise<{ durationMs: number } | { error: string }> {
  if (file.type !== "video/mp4") return { error: "Le fichier doit être un MP4." };
  if (file.size > MAX_VIDEO_BYTES) return { error: `La vidéo fait ${(file.size / 1024 / 1024).toFixed(1)} Mo : 10 Mo maximum.` };
  try {
    const durationMs = await readDuration(file);
    if (durationMs > MAX_DURATION_MS) return { error: `La vidéo dure ${(durationMs / 1000).toFixed(1)} s : 15 s maximum.` };
    return { durationMs };
  } catch {
    return { error: "Impossible de lire cette vidéo." };
  }
}

/** Envoie un MP4 dans Storage en signalant la progression (0 à 100). */
export function uploadVideo(path: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: "video/mp4" });
    task.on(
      "state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => resolve()
    );
  });
}

export function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
