import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipedriveId = parseInt(id, 10);
  if (isNaN(pipedriveId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as {
    empresa_linkedin?: string;
    cargo_linkedin?: string;
  };

  const update: Record<string, string> = {};
  if (typeof body.empresa_linkedin === "string") update.empresa_linkedin = body.empresa_linkedin;
  if (typeof body.cargo_linkedin === "string") update.cargo_linkedin = body.cargo_linkedin;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("people")
    .update(update)
    .eq("pipedrive_id", pipedriveId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
