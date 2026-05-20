// Campo de Pipedrive para el cargo. Cambiar si es un campo personalizado (ej: "abc123_field").
const JOB_TITLE_FIELD = process.env.PIPEDRIVE_JOB_TITLE_FIELD ?? "job_title";

export type PipedriveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updatePersonJobTitle(
  personId: string,
  jobTitle: string
): Promise<PipedriveResult> {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!apiToken) return { ok: false, error: "PIPEDRIVE_API_TOKEN no configurado" };

  let res: Response;
  try {
    res = await fetch(
      `https://api.pipedrive.com/v1/persons/${encodeURIComponent(personId)}?api_token=${apiToken}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [JOB_TITLE_FIELD]: jobTitle }),
      }
    );
  } catch {
    return { ok: false, error: "Error de red al contactar Pipedrive" };
  }

  let body: { success: boolean; error?: string };
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `HTTP ${res.status}: respuesta inválida` };
  }

  if (!res.ok || !body.success) {
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }

  return { ok: true };
}
