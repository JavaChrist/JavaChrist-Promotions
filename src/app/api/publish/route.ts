import { publishCatalogs } from "@/lib/server/catalog";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    return Response.json(await publishCatalogs());
  } catch (error) {
    console.error("Publication du catalogue impossible", error);
    return Response.json({ error: "Publication impossible" }, { status: 500 });
  }
}
