import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { lookupLinkedInProfile, companiesMatch } from "@/lib/proxycurl";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el run pertenece al usuario
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from("runs")
    .select("id, status, total_contacts")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: { id: string; status: string; total_contacts: number } | null };

  if (!run) {
    return NextResponse.json({ error: "Ejecución no encontrada" }, { status: 404 });
  }

  if (run.status === "processing") {
    return NextResponse.json({ error: "Ya está procesándose" }, { status: 409 });
  }

  if (run.status === "done") {
    return NextResponse.json({ error: "Ya está completado" }, { status: 409 });
  }

  // Marcar como procesando
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("runs").update({ status: "processing" }).eq("id", id);

  // Cargar contactos pendientes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from("contacts")
    .select("id, linkedin_url, empresa_original")
    .eq("run_id", id) as {
      data: { id: string; linkedin_url: string; empresa_original: string }[] | null;
    };

  if (!contacts || contacts.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("runs").update({ status: "done" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  // Procesar en background (fire-and-forget) para no bloquear la respuesta
  processContacts(id, contacts, supabase).catch(console.error);

  return NextResponse.json({ ok: true, message: "Procesamiento iniciado" });
}

async function processContacts(
  runId: string,
  contacts: { id: string; linkedin_url: string; empresa_original: string }[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  let changedCount = 0;
  let errorCount = 0;

  for (const contact of contacts) {
    const result = await lookupLinkedInProfile(contact.linkedin_url);

    if (!result.ok) {
      errorCount++;
      await supabase
        .from("contacts")
        .update({ error: result.error })
        .eq("id", contact.id);
    } else {
      const changed = !companiesMatch(contact.empresa_original, result.currentCompany);

      await supabase
        .from("contacts")
        .update({
          empresa_actual: result.currentCompany,
          cargo_actual: result.currentTitle,
          changed,
          error: null,
        })
        .eq("id", contact.id);

      if (changed) changedCount++;
    }

    // Pausa breve para no saturar la API de ProxyCurl
    await new Promise((r) => setTimeout(r, 300));
  }

  await supabase
    .from("runs")
    .update({
      status: "done",
      changed_count: changedCount,
      error_count: errorCount,
    })
    .eq("id", runId);
}
