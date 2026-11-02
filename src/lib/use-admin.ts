"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase-client";
import type { Identified } from "./types";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "denied"; email: string }
  | { status: "admin"; email: string; user: User };

/** Connexion Google + vérification du rôle `admin` (claim posé par scripts/set-admin.mjs). */
export function useAdminAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      const token = await user.getIdTokenResult(true);
      const email = user.email ?? "";
      setState(token.claims.admin === true ? { status: "admin", email, user } : { status: "denied", email });
    });
  }, []);

  return state;
}

export function useCollection<T>(name: string): Identified<T>[] | null {
  const [items, setItems] = useState<Identified<T>[] | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, name), (snap) => {
      setItems(snap.docs.map((item) => ({ id: item.id, data: item.data() as T })));
    });
  }, [name]);

  return items;
}

export interface PublishReport {
  published: Record<string, number>;
  skipped: { campaignId: string; title: string; reason: string }[];
}

/** Demande au serveur de régénérer les catalogues publics. */
export async function publishCatalogs(user: User): Promise<PublishReport> {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Publication impossible");
  return response.json();
}
