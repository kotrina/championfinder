type ProxyCurlExperience = {
  company: string | null;
  company_linkedin_profile_url: string | null;
  title: string | null;
  starts_at: { year: number; month: number; day: number } | null;
  ends_at: { year: number; month: number; day: number } | null;
};

type ProxyCurlProfile = {
  experiences?: ProxyCurlExperience[];
  full_name?: string;
};

export type LookupResult =
  | { ok: true; currentCompany: string | null }
  | { ok: false; error: string };

export async function lookupLinkedInProfile(linkedinUrl: string): Promise<LookupResult> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "PROXYCURL_API_KEY no configurada" };
  }

  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  if (!normalizedUrl) {
    return { ok: false, error: "URL de LinkedIn inválida" };
  }

  const url = new URL("https://nubela.co/proxycurl/api/v2/linkedin");
  url.searchParams.set("linkedin_profile_url", normalizedUrl);
  url.searchParams.set("use_cache", "if-present");

  console.log("[ProxyCurl] Consultando:", normalizedUrl);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    return { ok: false, error: "Error de red al contactar ProxyCurl" };
  }

  console.log("[ProxyCurl] Status:", response.status, "para", normalizedUrl);

  if (response.status === 404) {
    return { ok: false, error: "Perfil no encontrado" };
  }

  if (response.status === 403) {
    return { ok: false, error: "Perfil privado o no accesible" };
  }

  if (response.status === 410) {
    return { ok: false, error: "Perfil eliminado o URL inválida" };
  }

  if (!response.ok) {
    return { ok: false, error: `Error ProxyCurl: ${response.status}` };
  }

  let profile: ProxyCurlProfile;
  try {
    profile = await response.json();
  } catch {
    return { ok: false, error: "Respuesta inválida de ProxyCurl" };
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
    // Sin trailing slash, que es lo que espera ProxyCurl
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
