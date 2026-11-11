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

/** Écoute une collection. `enabled` doit être faux tant que le claim `admin` n'est pas confirmé : les règles refusent sinon la lecture et Firestore journalise permission-denied. */
export function useCollection<T>(name: string, enabled: boolean): Identified<T>[] | null {
  const [items, setItems] = useState<Identified<T>[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(collection(db, name), (snap) => {
      setItems(snap.docs.map((item) => ({ id: item.id, data: item.data() as T })));
    });
  }, [name, enabled]);

  // Valeur dérivée : pas de setState synchrone dans l'effet quand `enabled` repasse à faux.
  return enabled ? items : null;
}

export interface PublishReport {
  published: Record<string, number>;
  skipped: { campaignId: string; title: string; reason: string }[];
}

/** Demande au serveur de régénérer les catalogues publics. */
export async function publishCatalogs(user: User): Promise<PublishReport> {
  const response = await fetch("/api/publish", {
    method: "POST",
    // Les cookies de localhost (Motissimo et les autres apps) partent avec
    // chaque requête same-origin. Avec le jeton Firebase, les en-têtes
    // dépassent la limite de Node et le serveur répond 431 avant la route.
    credentials: "omit",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Publication impossible (HTTP ${response.status})`);
  }
  return response.json();
}
