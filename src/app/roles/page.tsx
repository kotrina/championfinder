import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { AppHeader } from "@/components/AppHeader";
import { RolesMerger } from "./RolesMerger";

export default async function RolesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await getUserRole();

  // Cargar todos los roles con conteo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("people")
    .select("rol")
    .not("rol", "is", null) as { data: { rol: string }[] | null };

  // Agrupar en JS
  const countMap = new Map<string, number>();
  for (const row of rows ?? []) {
    if (row.rol) countMap.set(row.rol, (countMap.get(row.rol) ?? 0) + 1);
  }
  const roleItems = Array.from(countMap.entries())
    .map(([rol, count]) => ({ rol, count }))
    .sort((a, b) => a.rol.localeCompare(b.rol));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader email={user.email!} isAdmin={role === "admin"} activePage="roles" />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agrupación de roles</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Selecciona varios roles y fúsionalos en uno solo. Se actualizará la BD y Pipedrive.
          </p>
        </div>
        <RolesMerger initialRoles={roleItems} />
      </main>
    </div>
  );
}
