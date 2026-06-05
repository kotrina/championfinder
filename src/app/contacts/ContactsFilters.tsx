"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
  roles: string[];
  statuses: string[];
};

export function ContactsFilters({ roles, statuses }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Búsqueda libre */}
      <input
        type="text"
        placeholder="Buscar nombre, apellidos, email, empresa…"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
      />

      {/* Organización */}
      <input
        type="text"
        placeholder="Organización…"
        defaultValue={searchParams.get("org") ?? ""}
        onChange={(e) => update("org", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
      />

      {/* ROL — búsqueda por texto (fragmento) */}
      <input
        type="text"
        placeholder="Buscar rol…"
        defaultValue={searchParams.get("rol_q") ?? ""}
        onChange={(e) => update("rol_q", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
      />

      {/* ROL — select exacto */}
      <select
        value={searchParams.get("rol") ?? ""}
        onChange={(e) => update("rol", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos los roles</option>
        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Marketing Status */}
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos los estados</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Ubicación */}
      <input
        type="text"
        placeholder="Ubicación…"
        defaultValue={searchParams.get("location") ?? ""}
        onChange={(e) => update("location", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
      />
    </div>
  );
}
