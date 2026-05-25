import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/get-user-role";
import { LogoutButton } from "@/components/LogoutButton";
import { InviteForm } from "./InviteForm";
import type { UserRole } from "@/types/database";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  role: UserRole;
  invited_at: string | null;
  last_sign_in_at: string | null;
};

export default async function AdminUsersPage() {
  const role = await getUserRole();
  if (role !== "admin") redirect("/dashboard");

  const adminClient = createAdminClient();

  // Listar todos los usuarios via Admin API
  const { data: { users }, error } = await adminClient.auth.admin.listUsers();

  let userRows: UserRow[] = [];
  if (!error && users) {
    // Cargar perfiles para cruzar roles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (adminClient as any)
      .from("profiles")
      .select("id, role") as { data: { id: string; role: UserRole }[] | null };

    const roleMap = new Map(profiles?.map((p) => [p.id, p.role]) ?? []);

    userRows = users.map((u) => ({
      id: u.id,
      email: u.email ?? "(sin email)",
      created_at: u.created_at,
      role: roleMap.get(u.id) ?? "user",
      invited_at: u.invited_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
              championfinder
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <span className="text-blue-600 font-medium">Usuarios</span>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Invitar usuario */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Invitar nuevo usuario</h2>
          <InviteForm />
        </div>

        {/* Lista de usuarios */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Usuarios ({userRows.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Registrado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Último acceso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userRows.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.role === "admin" ? "Admin" : "Usuario"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("es-ES")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.last_sign_in_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">
                          Activo
                        </span>
                      ) : u.invited_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">
                          Invitación pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          Sin activar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
