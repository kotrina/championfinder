import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { LogoutButton } from "@/components/LogoutButton";
import type { Database } from "@/types/database";

type Run = Database["public"]["Tables"]["runs"]["Row"];

const PAGE_SIZE = 20;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const userRole = await getUserRole();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: runs, count } = await (supabase as any)
    .from("runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to) as { data: Run[] | null; count: number | null };

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">championfinder</h1>
            {userRole === "admin" && (
              <nav className="flex gap-4 text-sm">
                <span className="text-blue-600 font-medium">Dashboard</span>
                <Link href="/admin/users" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Usuarios
                </Link>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Historial de ejecuciones</h2>
            {count !== null && count > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">{count} ejecuciones en total</p>
            )}
          </div>
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
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fichero</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contactos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cambios</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Descarga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/runs/${run.id}`}
                          className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                        >
                          {run.filename}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(run.created_at).toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {run.total_contacts}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {run.status === "done" ? (
                          <span className={run.changed_count > 0 ? "text-amber-600 font-medium" : "text-gray-400"}>
                            {run.changed_count}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                          {run.status === "pending" && "Pendiente"}
                          {run.status === "processing" && "Procesando"}
                          {run.status === "done" && "Completado"}
                          {run.status === "error" && "Error"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {run.status === "done" ? (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/runs/${run.id}/export?format=csv`}
                              download
                              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              CSV
                            </a>
                            <span className="text-gray-200">|</span>
                            <a
                              href={`/api/runs/${run.id}/export?format=xlsx`}
                              download
                              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              Excel
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {page > 1 && (
                  <Link
                    href={`/dashboard?page=${page - 1}`}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="text-sm text-gray-500">
                  Página {page} de {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/dashboard?page=${page + 1}`}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
