import type { ReactNode } from "react";
import type { CampaignStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

export const btnPrimary =
  "rounded-lg bg-[#ededed] px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-50";
export const btnSecondary =
  "rounded-lg border border-[#333] bg-black px-3 py-1.5 text-sm font-medium text-[#ededed] hover:bg-[#111] disabled:opacity-50";
export const inputClass =
  "h-10 w-full rounded-lg border border-[#262626] bg-black px-3 text-sm text-[#ededed] placeholder:text-[#666] outline-none hover:border-[#333] focus:border-[#666]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-[#a1a1a1]">{hint}</span>}
    </label>
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
