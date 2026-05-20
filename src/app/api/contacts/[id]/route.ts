import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as { empresa_actual?: string; cargo_actual?: string; changed?: boolean };

  // Verificar que el contacto pertenece al usuario (via run)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact } = await (supabase as any)
    .from("contacts")
    .select("id, run_id, runs!inner(user_id)")
    .eq("id", id)
    .single() as { data: { id: string; run_id: string; runs: { user_id: string } } | null };

  if (!contact) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (contact.runs.user_id !== user.id) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const update: { empresa_actual?: string; cargo_actual?: string; changed?: boolean } = {};
  if (typeof body.empresa_actual === "string") update.empresa_actual = body.empresa_actual;
  if (typeof body.cargo_actual === "string") update.cargo_actual = body.cargo_actual;
  if (typeof body.changed === "boolean") update.changed = body.changed;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("contacts")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
