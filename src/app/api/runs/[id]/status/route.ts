import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from("runs")
    .select("status, total_contacts, changed_count, error_count")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as {
      data: {
        status: string;
        total_contacts: number;
        changed_count: number;
        error_count: number;
      } | null;
    };

  if (!run) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Contar contactos ya procesados (tienen empresa_actual o error)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: processedCount } = await (supabase as any)
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("run_id", id)
    .not("error", "is", null)
    .or("changed.not.is.null") as { count: number | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: changedOrProcessed } = await (supabase as any)
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("run_id", id)
    .or("empresa_actual.not.is.null,error.not.is.null") as { count: number | null };

  return NextResponse.json({
    status: run.status,
    total: run.total_contacts,
    processed: changedOrProcessed ?? 0,
    changed: run.changed_count,
    errors: run.error_count,
  });
}
