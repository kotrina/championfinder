import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { RunProcessor } from "./RunProcessor";
import { ResultsTable } from "./ResultsTable";

type Run = Database["public"]["Tables"]["runs"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from("runs")
    .select("*")
    .eq("id", id)
    .single() as { data: Run | null };

  if (!run) redirect("/contacts");

  let contacts: Contact[] = [];
  if (run.status === "done") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("contacts")
      .select("*")
      .eq("run_id", id)
      .order("contact_id") as { data: Contact[] | null };
    contacts = data ?? [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/contacts" className="text-sm text-gray-400 hover:text-gray-700">
            ← Volver
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{run.filename}</h1>
          <span className="text-xs text-gray-400">
            {new Date(run.created_at).toLocaleString("es-ES")}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <RunProcessor runId={id} initialStatus={run.status} totalContacts={run.total_contacts} />

        {run.status === "done" && contacts.length > 0 && (
          <ResultsTable runId={id} contacts={contacts} />
        )}
      </main>
    </div>
  );
}
