import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipedriveId = parseInt(id, 10);
  if (isNaN(pipedriveId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const adminClient = createAdminClient();

  // Obtener linkedin_url del contacto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: person } = await (adminClient as any)
    .from("people")
    .select("linkedin_url")
    .eq("pipedrive_id", pipedriveId)
    .single() as { data: { linkedin_url: string | null } | null };

  if (!person?.linkedin_url) {
    return NextResponse.json({ error: "El contacto no tiene LinkedIn URL" }, { status: 400 });
  }

  const apiKey = process.env.ENRICHLAYER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ENRICHLAYER_API_KEY no configurada" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    return NextResponse.json({
      error: "Esta función requiere una URL pública. Configura NEXT_PUBLIC_APP_URL en Vercel con la URL de producción.",
    }, { status: 400 });
  }

  const callbackUrl = `${appUrl}/api/webhooks/email-lookup?person_id=${pipedriveId}`;

  // Marcar como pending en BD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("people")
    .update({ email_linkedin_status: "pending", email_linkedin: null })
    .eq("pipedrive_id", pipedriveId);

  // Llamar a EnrichLayer (asíncrono — responde inmediatamente con queue_count)
  try {
    const url = `https://enrichlayer.com/api/v2/profile/email?profile_url=${encodeURIComponent(person.linkedin_url)}&callback_url=${encodeURIComponent(callbackUrl)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await res.json() as { email_queue_count?: number; error?: string };
    console.log("[lookup-email] EnrichLayer response:", body);

    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from("people")
        .update({ email_linkedin_status: null })
        .eq("pipedrive_id", pipedriveId);
      return NextResponse.json({ error: body.error ?? `HTTP ${res.status}` }, { status: 502 });
    }
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("people")
      .update({ email_linkedin_status: null })
      .eq("pipedrive_id", pipedriveId);
    return NextResponse.json({ error: "Error de red al contactar EnrichLayer" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
