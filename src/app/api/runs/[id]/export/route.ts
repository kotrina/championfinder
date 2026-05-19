import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

type ContactRow = {
  contact_id: string;
  nombre: string;
  apellidos: string;
  linkedin_url: string;
  empresa_original: string;
  empresa_actual: string | null;
  cargo_actual: string | null;
  changed: boolean;
  error: string | null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from("runs")
    .select("filename, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: { filename: string; status: string } | null };

  if (!run) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (run.status !== "done") return NextResponse.json({ error: "El run aún no está completado" }, { status: 409 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from("contacts")
    .select("contact_id, nombre, apellidos, linkedin_url, empresa_original, empresa_actual, cargo_actual, changed, error")
    .eq("run_id", id)
    .order("contact_id") as { data: ContactRow[] | null };

  if (!contacts) return NextResponse.json({ error: "Sin datos" }, { status: 500 });

  const rows = contacts.map((c) => ({
    "ID Contacto": c.contact_id,
    "Nombre": c.nombre,
    "Apellidos": c.apellidos,
    "LinkedIn": c.linkedin_url,
    "Empresa original": c.empresa_original,
    "Empresa nueva": c.changed ? (c.empresa_actual ?? "") : "",
    "Cargo actual": c.cargo_actual ?? "",
    "Error": c.error ?? "",
  }));

  const baseName = run.filename.replace(/\.[^.]+$/, "");

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}_resultados.xlsx"`,
      },
    });
  }

  // CSV
  const header = Object.keys(rows[0]).join(",");
  const csvRows = rows.map((r) =>
    Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const csv = [header, ...csvRows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}_resultados.csv"`,
    },
  });
}
