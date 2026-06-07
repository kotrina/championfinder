import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { searchOrganizations } from "@/lib/pipedrive";

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term")?.trim();
  if (!term) return NextResponse.json({ organizations: [] });

  const organizations = await searchOrganizations(term);
  return NextResponse.json({ organizations });
}
