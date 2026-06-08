import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updatePersonFields,
  updatePersonPreviousFields,
  createOrganization,
  createPersonInPipedrive,
} from "@/lib/pipedrive";

type SyncBody =
  | { action: "update_only" }
  | { action: "new_person_existing_org"; orgId: number }
  | { action: "new_person_new_org" };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipedriveId = parseInt(id, 10);
  if (isNaN(pipedriveId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as SyncBody;
  const adminClient = createAdminClient();

  // Cargar datos del contacto desde nuestra BD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: person } = await (adminClient as any)
    .from("people")
    .select("pipedrive_id, nombre, apellidos, organizacion, rol, linkedin_url, empresa_linkedin, cargo_linkedin")
    .eq("pipedrive_id", pipedriveId)
    .single() as {
      data: {
        pipedrive_id: number;
        nombre: string | null;
        apellidos: string | null;
        organizacion: string | null;
        rol: string | null;
        linkedin_url: string | null;
        empresa_linkedin: string | null;
        cargo_linkedin: string | null;
      } | null;
    };

  if (!person) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  // ── Ruta A: solo actualizar campos en el contacto existente ───────────────
  if (body.action === "update_only") {
    const result = await updatePersonFields(pipedriveId, {
      rol: person.cargo_linkedin,
      linkedinUrl: person.linkedin_url,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

    // Actualizar BD local: rol, linkedin_url y timestamp de sync
    const dbUpdate: Record<string, unknown> = { synced_at: new Date().toISOString() };
    if (person.cargo_linkedin !== null) dbUpdate.rol = person.cargo_linkedin;
    if (person.linkedin_url !== null) dbUpdate.linkedin_url = person.linkedin_url;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (adminClient as any)
      .from("people")
      .update(dbUpdate)
      .eq("pipedrive_id", pipedriveId);

    if (dbError) console.error("[sync-to-pipe Ruta A] Error BD:", dbError.message);

    return NextResponse.json({
      ok: true,
      action: "update_only",
      updated: { rol: person.cargo_linkedin, linkedin_url: person.linkedin_url },
    });
  }

  // ── Ruta B: nueva empresa → nuevo contacto ────────────────────────────────

  let orgId: number;

  if (body.action === "new_person_existing_org") {
    orgId = body.orgId;
  } else {
    // Crear nueva organización con label REVISAR
    const orgResult = await createOrganization(person.empresa_linkedin ?? "Nueva empresa");
    if (!orgResult.ok) return NextResponse.json({ error: `Error creando org: ${orgResult.error}` }, { status: 502 });
    orgId = orgResult.id;
  }

  // Crear nuevo contacto en Pipedrive con label REVISAR
  const personResult = await createPersonInPipedrive({
    nombre: person.nombre ?? "",
    apellidos: person.apellidos,
    orgId,
    rol: person.cargo_linkedin,
    linkedinUrl: person.linkedin_url,
  });

  if (!personResult.ok) {
    return NextResponse.json({ error: `Error creando contacto: ${personResult.error}` }, { status: 502 });
  }

  const newPipedriveId = personResult.id;

  // Obtener nombre real de la org (para casos de org existente)
  let orgName = person.empresa_linkedin ?? "";
  if (body.action === "new_person_existing_org") {
    try {
      const apiToken = process.env.PIPEDRIVE_API_TOKEN;
      const orgRes = await fetch(`https://api.pipedrive.com/v1/organizations/${orgId}?api_token=${apiToken}`);
      const orgBody = await orgRes.json() as { success: boolean; data?: { name: string } };
      if (orgBody.success && orgBody.data) orgName = orgBody.data.name;
    } catch { /* usar empresa_linkedin como fallback */ }
  }

  // Insertar nuevo contacto en nuestra BD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("people").insert({
    pipedrive_id: newPipedriveId,
    nombre: person.nombre,
    apellidos: person.apellidos,
    email: null,
    organizacion: orgName,
    rol: person.cargo_linkedin,
    linkedin_url: person.linkedin_url,
    empresa_linkedin: person.empresa_linkedin,
    cargo_linkedin: person.cargo_linkedin,
    won_deals: 0,
    total_activities: 0,
    synced_at: new Date().toISOString(),
  });

  // Actualizar contacto original en Pipedrive con empresa anterior y enlace al nuevo perfil
  // (fire-and-forget: si falla no bloquea el flujo)
  const pipedriveDoomain = process.env.NEXT_PUBLIC_PIPEDRIVE_DOMAIN ?? "app";
  const newProfileUrl = `https://${pipedriveDoomain}.pipedrive.com/person/${newPipedriveId}`;
  const previousResult = await updatePersonPreviousFields(pipedriveId, {
    previousCompany: person.organizacion,
    newProfileUrl,
  });
  if (!previousResult.ok) {
    console.error("[sync-to-pipe Ruta B] Error actualizando campos Previous en original:", previousResult.error);
  }

  return NextResponse.json({
    ok: true,
    action: body.action,
    newPipedriveId,
    orgId,
  });
}
