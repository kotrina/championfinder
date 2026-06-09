import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook llamado por EnrichLayer cuando termina de buscar el email.
 * URL: POST /api/webhooks/email-lookup?person_id=<pipedrive_id>
 *
 * Payload de EnrichLayer (estructura aproximada):
 * { email: "name@company.com" } o { email: null }
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const personId = parseInt(searchParams.get("person_id") ?? "", 10);
  if (isNaN(personId)) {
    return NextResponse.json({ error: "person_id inválido" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  console.log(`[webhook/email-lookup] person_id=${personId}`, payload);

  // EnrichLayer puede devolver el email en distintos campos según su versión
  const email = (payload.email ?? payload.work_email ?? payload.data) as string | null | undefined;

  const adminClient = createAdminClient();

  if (email && typeof email === "string" && email.includes("@")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("people")
      .update({ email_linkedin: email, email_linkedin_status: null })
      .eq("pipedrive_id", personId);
    console.log(`[webhook/email-lookup] Email guardado para person_id=${personId}: ${email}`);
  } else {
    // No se encontró email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("people")
      .update({ email_linkedin: null, email_linkedin_status: "not_found" })
      .eq("pipedrive_id", personId);
    console.log(`[webhook/email-lookup] Email no encontrado para person_id=${personId}`);
  }

  return NextResponse.json({ ok: true });
}

// EnrichLayer puede hacer GET para verificar el webhook
export async function GET() {
  return NextResponse.json({ ok: true });
}
