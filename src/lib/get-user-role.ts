import { createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

/**
 * Devuelve el rol del usuario autenticado actual.
 * Retorna null si no hay sesión o no tiene perfil.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: UserRole } | null };

  return data?.role ?? null;
}
