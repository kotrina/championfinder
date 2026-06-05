import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LINKEDIN_FIELD = process.env.PIPEDRIVE_LINKEDIN_FIELD ?? "8405c428db352f540cf0ee0671ec3f963811530d";
const LOCATION_FIELD = process.env.PIPEDRIVE_LOCATION_FIELD ?? "e8482251a1c9e6a9a640fec5d2cfda6135c10f64_locality";
const ROL_FIELD = process.env.PIPEDRIVE_JOB_TITLE_FIELD ?? "b711dbcdfccfab3c6796761d032f71936621a027";

type PipedrivePerson = Record<string, unknown> & {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: { value: string; primary: boolean }[] | null;
  org_name: string | null;
  marketing_status: string | null;
  won_deals_count: number;
  activities_count: number;
};

function extractPerson(p: PipedrivePerson) {
  const email = p.email?.find((e) => e.primary)?.value ?? p.email?.[0]?.value ?? null;
  return {
    pipedrive_id: p.id,
    nombre: p.first_name ?? null,
    apellidos: p.last_name ?? null,
    email,
    organizacion: p.org_name ?? null,
    marketing_status: p.marketing_status ?? null,
    rol: (p[ROL_FIELD] as string | null) ?? null,
    linkedin_url: (p[LINKEDIN_FIELD] as string | null) ?? null,
    won_deals: p.won_deals_count ?? 0,
    total_activities: p.activities_count ?? 0,
    location: (p[LOCATION_FIELD] as string | null) ?? null,
    synced_at: new Date().toISOString(),
  };
}

async function fetchAllPersons(filterId: number, apiToken: string): Promise<PipedrivePerson[]> {
  const all: PipedrivePerson[] = [];
  let start = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.pipedrive.com/v1/persons?filter_id=${filterId}&limit=${limit}&start=${start}&api_token=${apiToken}`;
    const res = await fetch(url);
    const body = await res.json() as {
      success: boolean;
      data: PipedrivePerson[] | null;
      additional_data?: { pagination?: { more_items_in_collection: boolean; next_start: number } };
    };

    if (!res.ok || !body.success || !body.data) break;
    all.push(...body.data);

    const pagination = body.additional_data?.pagination;
    if (!pagination?.more_items_in_collection) break;
    start = pagination.next_start;
  }

  return all;
}

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!apiToken) return NextResponse.json({ error: "PIPEDRIVE_API_TOKEN no configurado" }, { status: 500 });

  // Leer filter_id de settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setting } = await (supabase as any)
    .from("settings")
    .select("value")
    .eq("key", "pipedrive_filter_id")
    .single() as { data: { value: string } | null };

  if (!setting?.value) {
    return NextResponse.json({ error: "No hay filtro configurado. Ve a Configuración y selecciona un filtro." }, { status: 400 });
  }

  const filterId = parseInt(setting.value, 10);
  if (isNaN(filterId)) return NextResponse.json({ error: "Filter ID inválido" }, { status: 400 });

  let persons: PipedrivePerson[];
  try {
    persons = await fetchAllPersons(filterId, apiToken);
  } catch {
    return NextResponse.json({ error: "Error al contactar Pipedrive" }, { status: 502 });
  }

  if (persons.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  const rows = persons.map(extractPerson);

  // Upsert en lotes de 500 para no exceder límites de Supabase
  const adminClient = createAdminClient();
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from("people")
      .upsert(batch, { onConflict: "pipedrive_id" });
    if (error) {
      return NextResponse.json({ error: `Error al guardar contactos: ${error.message}` }, { status: 500 });
    }
  }

  // Actualizar last_synced_at en settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("settings").upsert({
    key: "last_synced_at",
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, upserted: rows.length });
}
