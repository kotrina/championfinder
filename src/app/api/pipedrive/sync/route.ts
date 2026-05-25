import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updatePersonJobTitle } from "@/lib/pipedrive";

type SyncResult = {
  supabaseId: string;
  pipedriveId: string;
  ok: boolean;
  error?: string;
};

export async function POST(req: Request) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as { contactIds?: string[] };
  const contactIds = body.contactIds;

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "Sin contactos seleccionados" }, { status: 400 });
  }

  // Cargar contactos verificando que pertenecen al usuario
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from("contacts")
    .select("id, contact_id, cargo_actual, runs!inner(user_id)")
    .in("id", contactIds) as {
      data: {
        id: string;
        contact_id: string;
        cargo_actual: string | null;
        runs: { user_id: string };
      }[] | null;
    };

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: "No se encontraron contactos" }, { status: 404 });
  }

  // Filtrar solo los que pertenecen al usuario
  const ownedContacts = contacts.filter((c) => c.runs.user_id === user.id);

  // Enviar a Pipedrive secuencialmente para no saturar el rate limit
  const results: SyncResult[] = [];
  for (const contact of ownedContacts) {
    if (!contact.cargo_actual) {
      results.push({
        supabaseId: contact.id,
        pipedriveId: contact.contact_id,
        ok: false,
        error: "Sin cargo para actualizar",
      });
      continue;
    }

    const result = await updatePersonJobTitle(contact.contact_id, contact.cargo_actual);
    results.push({
      supabaseId: contact.id,
      pipedriveId: contact.contact_id,
      ...result,
    });
  }

  const successCount = results.filter((r) => r.ok).length;
  const errorCount = results.filter((r) => !r.ok).length;

  return NextResponse.json({ ok: true, successCount, errorCount, results });
}
