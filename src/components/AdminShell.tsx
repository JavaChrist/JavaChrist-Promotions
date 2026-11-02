"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { Megaphone, LayoutGrid, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase-client";
import type { AppDoc, CampaignDoc, Identified } from "@/lib/types";
import { publishCatalogs, useAdminAuth, useCollection, type PublishReport } from "@/lib/use-admin";
import { AppsPanel } from "./AppsPanel";
import { CampaignForm } from "./CampaignForm";
import { CampaignsPanel } from "./CampaignsPanel";
import { btnPrimary, btnSecondary } from "./ui";

type Tab = "campaigns" | "apps";
type View = { kind: "list" } | { kind: "form"; campaign?: Identified<CampaignDoc> };

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">{children}</main>;
}

export function AdminShell() {
  const session = useAdminAuth();
  const apps = useCollection<AppDoc>("apps");
  const campaigns = useCollection<CampaignDoc>("campaigns");
  const [tab, setTab] = useState<Tab>("campaigns");
  const [view, setView] = useState<View>({ kind: "list" });
  const [report, setReport] = useState<PublishReport | null>(null);
  const [publishError, setPublishError] = useState("");

  if (session.status === "loading") return <Centered>Chargement…</Centered>;

  if (session.status === "signed-out") {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">JavaChrist Promotions</h1>
        <p className="text-sm text-[#a1a1a1]">Accès réservé à l&apos;administrateur.</p>
        <button type="button" className={btnPrimary} onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>
          Se connecter avec Google
        </button>
      </Centered>
    );
  }

  if (session.status === "denied") {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Accès refusé</h1>
        <p className="text-sm text-[#a1a1a1]">{session.email} n&apos;est pas administrateur.</p>
        <button type="button" className={btnSecondary} onClick={() => signOut(auth)}>
          Changer de compte
        </button>
      </Centered>
    );
  }

  const { user } = session;

  async function publish() {
    setPublishError("");
    try {
      setReport(await publishCatalogs(user));
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Publication impossible");
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Megaphone }[] = [
    { id: "campaigns", label: "Campagnes", icon: Megaphone },
    { id: "apps", label: "Applications", icon: LayoutGrid },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex items-center gap-2 border-b border-[#262626] p-3 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-4">
        <p className="hidden px-2 pb-3 text-sm font-semibold md:block">JavaChrist Promotions</p>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setView({ kind: "list" });
            }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#111] ${tab === id ? "bg-[#111] text-white" : "text-[#a1a1a1]"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
        <div className="ml-auto md:ml-0 md:mt-auto">
          <p className="hidden truncate px-2 pb-2 text-[13px] text-[#a1a1a1] md:block">{session.email}</p>
          <button type="button" className={`${btnSecondary} flex items-center gap-2`} onClick={() => signOut(auth)}>
            <LogOut className="size-4" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{tab === "campaigns" ? "Campagnes" : "Applications"}</h1>
          <button type="button" className={btnSecondary} onClick={publish}>
            Republier les catalogues
          </button>
        </div>

        {publishError && <p className="rounded-lg border border-[#f33a4a] p-3 text-sm text-[#f33a4a]">{publishError}</p>}
        {report && (
          <div className="rounded-lg border border-[#262626] p-3 text-sm">
            <p>
              Catalogues publiés :{" "}
              {Object.entries(report.published)
                .map(([source, count]) => `${source} (${count} campagne${count > 1 ? "s" : ""})`)
                .join(", ") || "aucun"}
            </p>
            {report.skipped.map((item) => (
              <p key={item.campaignId} className="mt-1 text-[#f5a623]">
                Ignorée : {item.title} — {item.reason}
              </p>
            ))}
          </div>
        )}

        {apps === null || campaigns === null ? (
          <p className="text-sm text-[#a1a1a1]">Chargement des données…</p>
        ) : tab === "apps" ? (
          <AppsPanel apps={apps} onChanged={publish} />
        ) : view.kind === "form" ? (
          <CampaignForm
            apps={apps}
            initial={view.campaign}
            onCancel={() => setView({ kind: "list" })}
            onSaved={() => {
              setView({ kind: "list" });
              publish();
            }}
          />
        ) : (
          <CampaignsPanel
            campaigns={campaigns}
            apps={apps}
            onNew={() => setView({ kind: "form" })}
            onEdit={(campaign) => setView({ kind: "form", campaign })}
            onChanged={publish}
          />
        )}
      </main>
    </div>
  );
}
