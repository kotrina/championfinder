"use client";

import { useState } from "react";

type RoleItem = { rol: string; count: number };

export function RolesMerger({ initialRoles }: { initialRoles: RoleItem[] }) {
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState<{ updated: number; pipedriveErrors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = roles.filter(
    (r) => !selected.includes(r.rol) && r.rol.toLowerCase().includes(search.toLowerCase())
  );

  const affectedCount = roles
    .filter((r) => selected.includes(r.rol))
    .reduce((sum, r) => sum + r.count, 0);

  function addRole(rol: string) {
    if (!selected.includes(rol)) setSelected((prev) => [...prev, rol]);
  }

  function removeRole(rol: string) {
    setSelected((prev) => prev.filter((r) => r !== rol));
  }

  async function handleMerge() {
    setMerging(true);
    setShowConfirm(false);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/roles/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selected, newName: newName.trim() }),
      });
      const data = await res.json() as { ok?: boolean; updated?: number; pipedriveErrors?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error desconocido");

      // Actualizar lista de roles localmente
      setRoles((prev) => {
        const remaining = prev.filter((r) => !selected.includes(r.rol));
        const existing = remaining.find((r) => r.rol === newName.trim());
        if (existing) {
          return remaining.map((r) =>
            r.rol === newName.trim() ? { ...r, count: r.count + (data.updated ?? 0) } : r
          ).sort((a, b) => a.rol.localeCompare(b.rol));
        }
        return [...remaining, { rol: newName.trim(), count: data.updated ?? 0 }]
          .sort((a, b) => a.rol.localeCompare(b.rol));
      });

      setResult({ updated: data.updated ?? 0, pipedriveErrors: data.pipedriveErrors ?? 0 });
      setSelected([]);
      setNewName("");
      setSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al fusionar roles");
    } finally {
      setMerging(false);
    }
  }

  const canMerge = selected.length >= 2 && newName.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Resultado */}
      {result && (
        <div className={`px-4 py-3 rounded-lg border text-sm ${
          result.pipedriveErrors > 0
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-green-50 border-green-200 text-green-700"
        }`}>
          ✓ {result.updated} contactos actualizados en BD.
          {result.pipedriveErrors > 0 && ` ⚠ ${result.pipedriveErrors} errores al actualizar Pipedrive.`}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Paneles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Panel izquierdo — roles disponibles */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              Roles disponibles <span className="text-gray-400 font-normal">({roles.length})</span>
            </h3>
          </div>
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar rol…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-96">
            {filtered.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">
                {search ? "Sin resultados" : "Todos los roles están seleccionados"}
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filtered.map(({ rol, count }) => (
                  <li key={rol}>
                    <button
                      onClick={() => addRole(rol)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors group"
                    >
                      <span className="text-gray-800 group-hover:text-blue-700 truncate pr-2">{rol}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel derecho — seleccionados + nuevo nombre */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              Seleccionados para agrupar
              {selected.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {selected.length}
                </span>
              )}
            </h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Chips de roles seleccionados */}
            {selected.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Haz click en un rol de la izquierda para añadirlo
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 min-h-[60px]">
                {selected.map((rol) => {
                  const item = roles.find((r) => r.rol === rol);
                  return (
                    <span
                      key={rol}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-full"
                    >
                      {rol}
                      {item && <span className="text-blue-400 text-xs">({item.count})</span>}
                      <button
                        onClick={() => removeRole(rol)}
                        className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Nuevo nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuevo nombre del rol
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Product Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contador de afectados */}
            {selected.length >= 1 && (
              <p className={`text-sm ${affectedCount > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {affectedCount > 0
                  ? `⚠ Afectará a ${affectedCount} contactos`
                  : "0 contactos afectados"}
              </p>
            )}

            {/* Botón */}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canMerge || merging}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {merging ? "Aplicando…" : "Aplicar agrupación"}
            </button>

            {selected.length < 2 && selected.length > 0 && (
              <p className="text-xs text-gray-400 text-center">Selecciona al menos 2 roles</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Confirmar agrupación?</h3>
            <p className="text-sm text-gray-600">
              Se actualizarán <strong>{affectedCount} contactos</strong> en la base de datos y en Pipedrive.
              Los roles:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 pl-4">
              {selected.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <span className="text-gray-400">•</span> {r}
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-600">
              Pasarán a llamarse <strong className="text-blue-700">{newName.trim()}</strong>.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Esta acción no se puede deshacer fácilmente.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMerge}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
