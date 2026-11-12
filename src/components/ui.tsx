import type { ReactNode } from "react";
import type { CampaignStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

export const btnPrimary =
  "btn-glow rounded-lg bg-[#ededed] px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-50";
export const btnSecondary =
  "rounded-lg border border-[#333] bg-black px-3 py-1.5 text-sm font-medium text-[#ededed] hover:border-accent-blue hover:bg-accent-blue/10 hover:text-white disabled:opacity-50 disabled:hover:border-[#333] disabled:hover:bg-black";
/** Action destructive : bordure et texte rouges au survol. */
export const btnDanger =
  "rounded-lg border border-[#333] bg-black px-3 py-1.5 text-sm font-medium text-[#ededed] hover:border-danger hover:bg-danger/10 hover:text-danger disabled:opacity-50 disabled:hover:border-[#333] disabled:hover:bg-black";
export const inputClass =
  "h-10 w-full rounded-lg border border-[#262626] bg-black px-3 text-sm text-[#ededed] placeholder:text-[#666] outline-none hover:border-[#333] focus:border-accent-blue";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#c3a6ff]">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-[#a1a1a1]">{hint}</span>}
    </label>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation en modale : jamais de `window.confirm` (conventions des apps). */
export function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm space-y-4 rounded-lg border border-[#262626] bg-black p-5">
        <h2 id="confirm-title" className="section-title text-base font-medium">
          {title}
        </h2>
        <p className="text-sm text-[#a1a1a1]">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onCancel} autoFocus>
            Annuler
          </button>
          <button type="button" className={btnPrimary} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<CampaignStatus, string> = {
  draft: "bg-[#666]",
  active: "bg-[#45dec4]",
  inactive: "bg-[#a1a1a1]",
  archived: "bg-[#333]",
};

export function StatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span className="flex w-fit items-center gap-2 text-sm">
      <i className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
