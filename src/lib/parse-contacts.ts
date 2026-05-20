import * as XLSX from "xlsx";

export type RawContact = {
  id_contacto: string;
  nombre: string;
  apellidos: string;
  linkedin_url: string;
  empresa_actual: string;
};

export type ParseResult =
  | { ok: true; contacts: RawContact[] }
  | { ok: false; error: string };

const REQUIRED_COLUMNS = [
  "id_contacto",
  "nombre",
  "apellidos",
  "linkedin_url",
  "empresa_actual",
] as const;

const MAX_CONTACTS = 100;

export async function parseContactFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ok: false, error: "No se pudo leer el fichero. Asegúrate de que es un Excel (.xlsx) o CSV válido." };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return { ok: false, error: "El fichero está vacío o no tiene hojas." };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    return { ok: false, error: "El fichero no contiene filas de datos." };
  }

  const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas obligatorias: ${missing.join(", ")}`,
    };
  }

  const contacts: RawContact[] = rows.slice(0, MAX_CONTACTS).map((row) => ({
    id_contacto: String(row["id_contacto"] ?? "").trim(),
    nombre: String(row["nombre"] ?? "").trim(),
    apellidos: String(row["apellidos"] ?? "").trim(),
    linkedin_url: String(row["linkedin_url"] ?? "").trim(),
    empresa_actual: String(row["empresa_actual"] ?? "").trim(),
  }));

  return { ok: true, contacts };
}

export const MAX_CONTACTS_LIMIT = MAX_CONTACTS;
