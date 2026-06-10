import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { AppHeader } from "@/components/AppHeader";
import { ContactsFilters } from "./ContactsFilters";
import { ContactsTable, type Person } from "./ContactsTable";

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  org?: string;
  rol?: string;
  rol_q?: string;
  status?: string;
  location?: string;
  has_linkedin?: string;
  page?: string;
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
    .select(
      "pipedrive_id, nombre, apellidos, email, organizacion, marketing_status, rol, linkedin_url, won_deals, total_activities, location, empresa_linkedin, cargo_linkedin, needs_sync",
      { count: "exact" }
    );

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
  if (params.has_linkedin === "1") query = query.not("linkedin_url", "is", null).neq("linkedin_url", "");

  const { data: people, count } = await query
    .order("apellidos", { ascending: true, nullsFirst: false })
    .order("nombre",    { ascending: true, nullsFirst: false })
    .range(from, to) as { data: Person[] | null; count: number | null };

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

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
    if (params.has_linkedin) sp.set("has_linkedin", params.has_linkedin);
    sp.set("page", String(p));
    return `/contacts?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader email={user.email!} isAdmin={role === "admin"} activePage="contacts" />

      <main className="max-w-full px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contactos</h2>
            {count !== null && (
              <p className="text-sm text-gray-400 mt-0.5">
                {count.toLocaleString("es-ES")} contactos
              </p>
            )}
          </div>
          <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ⚙ Configuración y sync
          </Link>
        </div>

        {/* Filtros */}
        <Suspense>
          <ContactsFilters roles={roles} statuses={statuses} />
        </Suspense>

        {/* Tabla */}
        {!people || people.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-sm text-gray-400">
            {count === 0 && !params.q && !params.org && !params.rol && !params.status && !params.location && !params.has_linkedin
              ? <><Link href="/settings" className="text-blue-600 hover:underline">Sincroniza desde Pipedrive</Link> para ver contactos.</>
              : "No hay resultados para estos filtros."}
          </div>
        ) : (
          <ContactsTable initialPeople={people} />
        )}

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
