import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { AppHeader } from "@/components/AppHeader";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await getUserRole();

  // Cargar filtros disponibles de Pipedrive
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  let filters: { id: number; name: string }[] = [];
  if (apiToken) {
    try {
      const res = await fetch(`https://api.pipedrive.com/v1/filters?type=people&api_token=${apiToken}`, {
        cache: "no-store",
      });
      const body = await res.json() as { success: boolean; data?: { id: number; name: string }[] };
      if (body.success) filters = (body.data ?? []).map((f) => ({ id: f.id, name: f.name }));
    } catch { /* silencioso */ }
  }

  // Leer configuración actual
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settingsRows } = await (supabase as any)
    .from("settings")
    .select("key, value") as { data: { key: string; value: string }[] | null };

  const settingsMap = new Map(settingsRows?.map((s) => [s.key, s.value]) ?? []);
  const currentFilterId = settingsMap.get("pipedrive_filter_id") ?? null;
  const lastSyncedAt = settingsMap.get("last_synced_at") ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader email={user.email!} isAdmin={role === "admin"} activePage="settings" />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-2">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Configuración</h2>
          <p className="text-sm text-gray-400 mt-0.5">Conexión con Pipedrive y sincronización de contactos</p>
        </div>
        <SettingsForm
          filters={filters}
          currentFilterId={currentFilterId}
          lastSyncedAt={lastSyncedAt}
        />
      </main>
    </div>
  );
}
