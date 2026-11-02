"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { btnSecondary } from "./ui";

interface PhonePreviewProps {
  name: string;
  videoUrl: string;
  onClose: () => void;
}

/** Rendu de la promotion dans un écran de téléphone, comme dans le jeu : croix à la fin de la lecture. */
export function PhonePreview({ name, videoUrl, onClose }: PhonePreviewProps) {
  const [ended, setEnded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4">
      <div className="relative aspect-[9/19] h-[min(70vh,640px)] overflow-hidden rounded-[2rem] border-4 border-[#333] bg-black">
        <video
          src={videoUrl}
          autoPlay
          playsInline
          controls={false}
          onEnded={() => setEnded(true)}
          onError={() => setEnded(true)}
          className="h-full w-full object-contain"
        />
        <p className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium">
          Publicité JavaChrist · {name}
        </p>
        {ended && (
          <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#ededed] text-black">
            <X className="size-5" />
          </span>
        )}
      </div>
      <button type="button" onClick={onClose} className={btnSecondary}>
        Fermer l&apos;aperçu
      </button>
    </div>
  );
}
