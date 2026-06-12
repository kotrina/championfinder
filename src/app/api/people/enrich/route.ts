import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupLinkedInProfile } from "@/lib/proxycurl";

export type EnrichResult = {
  pipedrive_id: number;
  ok: boolean;
  empresa_linkedin?: string | null;
  cargo_linkedin?: string | null;
  error?: string;
};

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as { ids?: number[] };
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Sin contactos seleccionados" }, { status: 400 });
  }

  // Cargar linkedin_urls de los contactos seleccionados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: people } = await (supabase as any)
    .from("people")
    .select("pipedrive_id, linkedin_url, is_historical")
    .in("pipedrive_id", ids) as {
      data: { pipedrive_id: number; linkedin_url: string | null; is_historical: boolean }[] | null;
    };

  if (!people || people.length === 0) {
    return NextResponse.json({ error: "Contactos no encontrados" }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const results: EnrichResult[] = [];

  for (const person of people) {
    if (person.is_historical) {
      results.push({ pipedrive_id: person.pipedrive_id, ok: false, error: "Contacto histórico — no se enriquece" });
      continue;
    }
    if (!person.linkedin_url) {
      results.push({ pipedrive_id: person.pipedrive_id, ok: false, error: "Sin URL de LinkedIn" });
      continue;
    }

    const lookup = await lookupLinkedInProfile(person.linkedin_url);

    if (!lookup.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from("people")
        .update({ scrape_status: "failed" })
        .eq("pipedrive_id", person.pipedrive_id);

      results.push({ pipedrive_id: person.pipedrive_id, ok: false, error: lookup.error });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from("people")
        .update({
          empresa_linkedin: lookup.currentCompany,
          cargo_linkedin: lookup.currentTitle,
          cargo_desde: lookup.currentStartDate,
          needs_sync: true,
          scrape_status: "ok",
        })
        .eq("pipedrive_id", person.pipedrive_id);

      results.push({
        pipedrive_id: person.pipedrive_id,
        ok: true,
        empresa_linkedin: lookup.currentCompany,
        cargo_linkedin: lookup.currentTitle,
      });
    }

    // Pausa para no saturar EnrichLayer
    await new Promise((r) => setTimeout(r, 300));
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, successCount, errorCount: results.length - successCount, results });
}
