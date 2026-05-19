type EnrichLayerExperience = {
  company: string | null;
  company_linkedin_profile_url: string | null;
  title: string | null;
  starts_at: { year: number; month: number; day: number } | null;
  ends_at: { year: number; month: number; day: number } | null;
};

type EnrichLayerProfile = {
  experiences?: EnrichLayerExperience[];
  full_name?: string;
};

export type LookupResult =
  | { ok: true; currentCompany: string | null }
  | { ok: false; error: string };

export async function lookupLinkedInProfile(linkedinUrl: string): Promise<LookupResult> {
  const apiKey = process.env.ENRICHLAYER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ENRICHLAYER_API_KEY no configurada" };
  }

  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  if (!normalizedUrl) {
    return { ok: false, error: "URL de LinkedIn inválida" };
  }

  const requestUrl = `https://enrichlayer.com/api/v2/profile?profile_url=${encodeURIComponent(normalizedUrl)}`;

  console.log("[EnrichLayer] Consultando:", normalizedUrl);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    return { ok: false, error: "Error de red al contactar EnrichLayer" };
  }

  const responseText = await response.text();
  console.log("[EnrichLayer] Status:", response.status, "Body:", responseText.slice(0, 200));

  if (response.status === 404) {
    return { ok: false, error: "Perfil no encontrado" };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, error: "API key inválida o sin permisos" };
  }

  if (response.status === 429) {
    return { ok: false, error: "Límite de llamadas alcanzado" };
  }

  if (!response.ok) {
    return { ok: false, error: `Error EnrichLayer: ${response.status}` };
  }

  let profile: EnrichLayerProfile;
  try {
    profile = JSON.parse(responseText);
  } catch {
    return { ok: false, error: "Respuesta inválida de EnrichLayer" };
  }

  // La posición actual es la primera experiencia sin fecha de fin
  const currentExperience = profile.experiences?.find((exp) => exp.ends_at === null) ?? profile.experiences?.[0];
  const currentCompany = currentExperience?.company ?? null;

  return { ok: true, currentCompany };
}

export function companiesMatch(a: string, b: string | null): boolean {
  if (!b) return false;
  return normalizeCompany(a) === normalizeCompany(b);
}

function normalizeLinkedInUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!u.pathname.startsWith("/in/")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `https://www.linkedin.com/in/${parts[1]}`;
  } catch {
    return null;
  }
}

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-_&]/g, " ")
    .replace(/\b(s\.?a\.?|s\.?l\.?|ltd|inc|corp|gmbh|b\.?v\.?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
