"use client";

import dynamic from "next/dynamic";

// Firebase Auth n'a de sens que dans le navigateur : pas de rendu serveur de l'admin.
const AdminShell = dynamic(() => import("./AdminShell").then((m) => m.AdminShell), { ssr: false });

export function AdminLoader() {
  return <AdminShell />;
}
