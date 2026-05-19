import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import type { Database } from "@/types/database";

type Run = Database["public"]["Tables"]["runs"]["Row"];

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: runs } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5) as { data: Run[] | null };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">championfinder</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Ejecuciones recientes</h2>
          <Link
            href="/runs/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nueva ejecución
          </Link>
        </div>

        {!runs || runs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">No hay ejecuciones aún.</p>
            <Link
              href="/runs/new"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              Crear la primera ejecución
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{run.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(run.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{run.total_contacts} contactos</span>
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
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
