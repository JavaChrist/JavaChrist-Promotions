import { adminAuth } from "./admin";

/** Renvoie une réponse d'erreur si la requête ne vient pas d'un administrateur, sinon null. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return Response.json({ error: "Connexion requise" }, { status: 401 });

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    if (decoded.admin !== true) {
      return Response.json({ error: "Compte non autorisé" }, { status: 403 });
    }
    return null;
  } catch {
    return Response.json({ error: "Session invalide" }, { status: 401 });
  }
}
