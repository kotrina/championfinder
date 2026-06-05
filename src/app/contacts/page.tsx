import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { AppHeader } from "@/components/AppHeader";
import { ContactsFilters } from "./ContactsFilters";

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  org?: string;
  rol?: string;
  rol_q?: string;
  status?: string;
  location?: string;
  page?: string;
};

type Person = {
  pipedrive_id: number;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  organizacion: string | null;
  marketing_status: string | null;
  rol: string | null;
  linkedin_url: string | null;
  won_deals: number;
  total_activities: number;
  location: string | null;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await getUserRole();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("people")
    .select("pipedrive_id, nombre, apellidos, email, organizacion, marketing_status, rol, linkedin_url, won_deals, total_activities, location", { count: "exact" });

  // Búsqueda libre por patrón (nombre, apellidos, email, empresa)
  if (params.q) {
    const pattern = `%${params.q}%`;
    query = query.or(
      `nombre.ilike.${pattern},apellidos.ilike.${pattern},email.ilike.${pattern},organizacion.ilike.${pattern}`
    );
  }
  if (params.org) query = query.ilike("organizacion", `%${params.org}%`);
  if (params.rol) query = query.eq("rol", params.rol);
  if (params.rol_q) query = query.ilike("rol", `%${params.rol_q}%`);
  if (params.status) query = query.eq("marketing_status", params.status);
  if (params.location) query = query.ilike("location", `%${params.location}%`);

  const { data: people, count } = await query
    .order("apellidos", { ascending: true })
    .range(from, to) as { data: Person[] | null; count: number | null };

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Valores únicos para los dropdowns (sin filtros activos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleRows } = await (supabase as any)
    .from("people")
    .select("rol")
    .not("rol", "is", null) as { data: { rol: string }[] | null };
  const roles = [...new Set((roleRows ?? []).map((r) => r.rol).filter(Boolean))].sort() as string[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: statusRows } = await (supabase as any)
    .from("people")
    .select("marketing_status")
    .not("marketing_status", "is", null) as { data: { marketing_status: string }[] | null };
  const statuses = [...new Set((statusRows ?? []).map((s) => s.marketing_status).filter(Boolean))].sort() as string[];

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.org) sp.set("org", params.org);
    if (params.rol) sp.set("rol", params.rol);
    if (params.rol_q) sp.set("rol_q", params.rol_q);
    if (params.status) sp.set("status", params.status);
    if (params.location) sp.set("location", params.location);
    sp.set("page", String(p));
    return `/contacts?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader email={user.email!} isAdmin={role === "admin"} activePage="contacts" />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contactos</h2>
            {count !== null && (
              <p className="text-sm text-gray-400 mt-0.5">
                {count.toLocaleString("es-ES")} contactos{count !== (count ?? 0) ? " (filtrados)" : ""}
              </p>
            )}
          </div>
          <Link
            href="/settings"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ⚙ Configuración y sync
          </Link>
        </div>

        {/* Filtros */}
        <Suspense>
          <ContactsFilters roles={roles} statuses={statuses} />
        </Suspense>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {!people || people.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              {count === 0 && !params.q && !params.org && !params.rol && !params.status && !params.location
                ? <>No hay contactos aún. <Link href="/settings" className="text-blue-600 hover:underline">Sincroniza desde Pipedrive</Link>.</>
                : "No hay resultados para estos filtros."
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Organización</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Marketing</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ubicación</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Deals</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Activ.</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">LinkedIn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {people.map((p) => (
                    <tr key={p.pipedrive_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-gray-400 font-mono text-xs">{p.pipedrive_id}</td>
                      <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap">
                        {[p.nombre, p.apellidos].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs truncate max-w-[160px]">{p.email ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-600 truncate max-w-[160px]">{p.organizacion ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{p.rol ?? "—"}</td>
                      <td className="px-3 py-3">
                        {p.marketing_status ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {p.marketing_status}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{p.location ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{p.won_deals}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{p.total_activities}</td>
                      <td className="px-3 py-3 text-center">
                        {p.linkedin_url ? (
                          <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mx-auto">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors">
                ← Anterior
              </Link>
            )}
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            {page < totalPages && (
              <Link href={buildPageUrl(page + 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors">
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
