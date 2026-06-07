import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { searchOrganizations, type OrgSearchResult } from "@/lib/pipedrive";

/**
 * Extrae el primer token significativo de un nombre de empresa.
 * "M47 - AI Company" → "M47"
 * "Banco Santander S.A." → "Banco"
 */
function firstSignificantToken(name: string): string {
  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "the", "and", "of"]);
  const cleaned = name
    .replace(/[.\-_|·,]/g, " ")
    .replace(/\b(s\.?a\.?|s\.?l\.?|ltd|inc|corp|gmbh|b\.?v\.?|s\.?a\.?u\.?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter((t) => t.length > 2 && !stopWords.has(t.toLowerCase()));
  return tokens[0] ?? cleaned.split(" ")[0] ?? name;
}

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term")?.trim();
  if (!term) return NextResponse.json({ organizations: [] });

  // Búsqueda 1: nombre completo
  const results1 = await searchOrganizations(term);

  // Búsqueda 2: primer token significativo (si la primera da pocos resultados)
  let results2: OrgSearchResult[] = [];
  const token = firstSignificantToken(term);
  if (results1.length < 3 && token.toLowerCase() !== term.toLowerCase()) {
    results2 = await searchOrganizations(token);
  }

  // Deduplicar por id, primero los de búsqueda exacta
  const seen = new Set<number>();
  const organizations: OrgSearchResult[] = [];
  for (const org of [...results1, ...results2]) {
    if (!seen.has(org.id)) {
      seen.add(org.id);
      organizations.push(org);
    }
  }

  return NextResponse.json({ organizations: organizations.slice(0, 6) });
}
