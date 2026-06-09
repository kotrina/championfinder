const JOB_TITLE_FIELD = process.env.PIPEDRIVE_JOB_TITLE_FIELD ?? "b711dbcdfccfab3c6796761d032f71936621a027";
const LINKEDIN_FIELD = process.env.PIPEDRIVE_LINKEDIN_FIELD ?? "8405c428db352f540cf0ee0671ec3f963811530d";
const PREVIOUS_COMPANY_FIELD = process.env.PIPEDRIVE_PREVIOUS_COMPANY_FIELD ?? "9f947fc44eab9d72bcfad5d157e31113a82e00a3";
const PREVIOUS_PROFILE_FIELD = process.env.PIPEDRIVE_PREVIOUS_PROFILE_FIELD ?? "2aa1a516349fa059ed0452a0f3f9939b796e6c2a";
const REVISAR_PERSON_LABEL = parseInt(process.env.PIPEDRIVE_REVISAR_PERSON_LABEL ?? "372", 10);
const REVISAR_ORG_LABEL = parseInt(process.env.PIPEDRIVE_REVISAR_ORG_LABEL ?? "371", 10);

export type PipedriveResult = { ok: true } | { ok: false; error: string };

// ── Helpers internos ──────────────────────────────────────────────────────────

function apiUrl(path: string) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  return `https://api.pipedrive.com/v1/${path}?api_token=${token}`;
}

async function pdFetch(path: string, options?: RequestInit): Promise<{ ok: boolean; data?: unknown; error?: string; status: number }> {
  if (!process.env.PIPEDRIVE_API_TOKEN) return { ok: false, error: "PIPEDRIVE_API_TOKEN no configurado", status: 0 };
  try {
    const res = await fetch(apiUrl(path), options);
    const body = await res.json() as { success: boolean; data?: unknown; error?: string };
    return { ok: res.ok && body.success, data: body.data, error: body.error, status: res.status };
  } catch {
    return { ok: false, error: "Error de red al contactar Pipedrive", status: 0 };
  }
}

// ── updatePersonJobTitle (existente, usada en role merge) ────────────────────

export async function updatePersonJobTitle(personId: string, jobTitle: string): Promise<PipedriveResult> {
  const r = await pdFetch(`persons/${encodeURIComponent(personId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [JOB_TITLE_FIELD]: jobTitle }),
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? `HTTP ${r.status}` };
}

// ── updatePersonFields (Ruta A: solo actualiza ROL + LinkedIn) ───────────────

export async function updatePersonFields(
  pipedriveId: number,
  fields: { rol?: string | null; linkedinUrl?: string | null }
): Promise<PipedriveResult> {
  const body: Record<string, unknown> = {};
  if (fields.rol !== undefined) body[JOB_TITLE_FIELD] = fields.rol ?? "";
  if (fields.linkedinUrl !== undefined) body[LINKEDIN_FIELD] = fields.linkedinUrl ?? "";
  if (Object.keys(body).length === 0) return { ok: true };

  const r = await pdFetch(`persons/${pipedriveId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? `HTTP ${r.status}` };
}

// ── updatePersonPreviousFields (Ruta B: tracking empresa anterior + nuevo perfil) ──

export async function updatePersonPreviousFields(
  originalPipedriveId: number,
  fields: { previousOrgId: number | null; newPersonId: number }
): Promise<PipedriveResult> {
  const body: Record<string, unknown> = {
    [PREVIOUS_PROFILE_FIELD]: fields.newPersonId,
  };
  if (fields.previousOrgId !== null) {
    body[PREVIOUS_COMPANY_FIELD] = fields.previousOrgId;
  }

  const r = await pdFetch(`persons/${originalPipedriveId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? `HTTP ${r.status}` };
}

// ── searchOrganizations ───────────────────────────────────────────────────────

export type OrgSearchResult = { id: number; name: string; people_count: number };

export async function searchOrganizations(term: string): Promise<OrgSearchResult[]> {
  if (!process.env.PIPEDRIVE_API_TOKEN) return [];
  try {
    const url = `${apiUrl(`organizations/search`)}&term=${encodeURIComponent(term)}&fields=name&limit=5`;
    const res = await fetch(url);
    const body = await res.json() as { success: boolean; data?: { items?: { item: { id: number; name: string; people_count?: number } }[] } };
    if (!res.ok || !body.success) return [];
    return (body.data?.items ?? []).map((i) => ({
      id: i.item.id,
      name: i.item.name,
      people_count: i.item.people_count ?? 0,
    }));
  } catch {
    return [];
  }
}

// ── createOrganization (con label REVISAR) ────────────────────────────────────

export async function createOrganization(name: string): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const r = await pdFetch("organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, label: REVISAR_ORG_LABEL }),
  });
  if (!r.ok) return { ok: false, error: r.error ?? `HTTP ${r.status}` };
  return { ok: true, id: (r.data as { id: number }).id };
}

// ── createPerson (con label REVISAR) ─────────────────────────────────────────

export type CreatePersonData = {
  nombre: string;
  apellidos: string | null;
  orgId: number;
  rol: string | null;
  linkedinUrl: string | null;
  emailLinkedin?: string | null;
};

export async function createPersonInPipedrive(data: CreatePersonData): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const body: Record<string, unknown> = {
    name: [data.nombre, data.apellidos].filter(Boolean).join(" "),
    org_id: data.orgId,
    label: REVISAR_PERSON_LABEL,
  };
  if (data.rol) body[JOB_TITLE_FIELD] = data.rol;
  if (data.linkedinUrl) body[LINKEDIN_FIELD] = data.linkedinUrl;
  if (data.emailLinkedin) body.email = [{ value: data.emailLinkedin, primary: true, label: "work" }];

  const r = await pdFetch("persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) return { ok: false, error: r.error ?? `HTTP ${r.status}` };
  return { ok: true, id: (r.data as { id: number }).id };
}

// ── lookupLinkedInProfile (EnrichLayer) ──────────────────────────────────────

type EnrichLayerExperience = {
  company: string | null;
  title: string | null;
  ends_at: { year: number; month: number; day: number } | null;
};

type EnrichLayerProfile = { experiences?: EnrichLayerExperience[] };

export type LookupResult =
  | { ok: true; currentCompany: string | null; currentTitle: string | null }
  | { ok: false; error: string };

export async function lookupLinkedInProfile(linkedinUrl: string): Promise<LookupResult> {
  const apiKey = process.env.ENRICHLAYER_API_KEY;
  if (!apiKey) return { ok: false, error: "ENRICHLAYER_API_KEY no configurada" };

  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  if (!normalizedUrl) return { ok: false, error: "URL de LinkedIn inválida" };

  const requestUrl = `https://enrichlayer.com/api/v2/profile?profile_url=${encodeURIComponent(normalizedUrl)}`;
  console.log("[EnrichLayer] Consultando:", normalizedUrl);

  let response: Response;
  try {
    response = await fetch(requestUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch {
    return { ok: false, error: "Error de red al contactar EnrichLayer" };
  }

  const responseText = await response.text();
  console.log("[EnrichLayer] Status:", response.status, "Body:", responseText.slice(0, 200));

  if (response.status === 404) return { ok: false, error: "Perfil no encontrado" };
  if (response.status === 401 || response.status === 403) return { ok: false, error: "API key inválida o sin permisos" };
  if (response.status === 429) return { ok: false, error: "Límite de llamadas alcanzado" };
  if (!response.ok) return { ok: false, error: `Error EnrichLayer: ${response.status}` };

  let profile: EnrichLayerProfile;
  try {
    profile = JSON.parse(responseText);
  } catch {
    return { ok: false, error: "Respuesta inválida de EnrichLayer" };
  }

  const currentExperience = profile.experiences?.find((exp) => exp.ends_at === null) ?? profile.experiences?.[0];
  return {
    ok: true,
    currentCompany: currentExperience?.company ?? null,
    currentTitle: currentExperience?.title ?? null,
  };
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
