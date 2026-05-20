import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Run = Database["public"]["Tables"]["runs"]["Row"];

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .single() as { data: Run | null };

  if (!run) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
            ← Volver
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{run.filename}</h1>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              run.status === "done"
                ? "bg-green-100 text-green-700"
                : run.status === "processing"
                ? "bg-yellow-100 text-yellow-700"
                : run.status === "error"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {run.status}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            Ejecución creada correctamente.
            Los resultados estarán disponibles tras implementar el motor de búsqueda (issue #3).
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {run.total_contacts} contactos · creado {new Date(run.created_at).toLocaleString("es-ES")}
          </p>
        </div>
      </main>
    </div>
  );
}
