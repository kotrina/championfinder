import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export type PipedriveFilter = { id: number; name: string };

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!apiToken) return NextResponse.json({ error: "PIPEDRIVE_API_TOKEN no configurado" }, { status: 500 });

  let res: Response;
  try {
    res = await fetch(`https://api.pipedrive.com/v1/filters?type=people&api_token=${apiToken}`);
  } catch {
    return NextResponse.json({ error: "Error de red al contactar Pipedrive" }, { status: 502 });
  }

  const body = await res.json() as { success: boolean; data?: { id: number; name: string }[] };
  if (!res.ok || !body.success) return NextResponse.json({ error: "Error Pipedrive" }, { status: 502 });

  const filters: PipedriveFilter[] = (body.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  return NextResponse.json({ filters });
}
