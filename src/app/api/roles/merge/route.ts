import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updatePersonJobTitle } from "@/lib/pipedrive";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as { roles?: string[]; newName?: string };
  const { roles, newName } = body;

  if (!Array.isArray(roles) || roles.length < 2) {
    return NextResponse.json({ error: "Selecciona al menos 2 roles" }, { status: 400 });
  }
  if (!newName?.trim()) {
    return NextResponse.json({ error: "El nuevo nombre es obligatorio" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Obtener los pipedrive_ids afectados antes de actualizar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: affected } = await (adminClient as any)
    .from("people")
    .select("pipedrive_id")
    .in("rol", roles) as { data: { pipedrive_id: number }[] | null };

  if (!affected || affected.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  // Actualizar BD local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (adminClient as any)
    .from("people")
    .update({ rol: newName.trim() })
    .in("rol", roles);

  if (dbError) {
    return NextResponse.json({ error: `Error BD: ${dbError.message}` }, { status: 500 });
  }

  // Actualizar Pipedrive para cada contacto afectado
  let pipedriveErrors = 0;
  for (const contact of affected) {
    const result = await updatePersonJobTitle(String(contact.pipedrive_id), newName.trim());
    if (!result.ok) pipedriveErrors++;
    // Pausa breve para no saturar la API
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({
    ok: true,
    updated: affected.length,
    pipedriveErrors,
  });
}
