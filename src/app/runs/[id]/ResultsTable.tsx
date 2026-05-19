"use client";

import { useState } from "react";

type Contact = {
  id: string;
  contact_id: string;
  nombre: string;
  apellidos: string;
  linkedin_url: string;
  empresa_original: string;
  empresa_actual: string | null;
  cargo_actual: string | null;
  changed: boolean;
  error: string | null;
};

type Filter = "all" | "changed" | "errors";

type RowEdit = {
  empresa_actual: string;
  cargo_actual: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function ResultsTable({ runId, contacts }: { runId: string; contacts: Contact[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const filtered = contacts.filter((c) => {
    if (filter === "changed") return c.changed;
    if (filter === "errors") return !!c.error;
    return true;
  });

  const changedCount = contacts.filter((c) => c.changed).length;
  const errorCount = contacts.filter((c) => !!c.error).length;

  function getEdit(c: Contact): RowEdit {
    return edits[c.id] ?? {
      empresa_actual: c.empresa_actual ?? "",
      cargo_actual: c.cargo_actual ?? "",
    };
  }

  function isDirty(c: Contact): boolean {
    const e = edits[c.id];
    if (!e) return false;
    return e.empresa_actual !== (c.empresa_actual ?? "") || e.cargo_actual !== (c.cargo_actual ?? "");
  }

  function handleChange(contactId: string, field: keyof RowEdit, value: string) {
    setEdits((prev) => ({
      ...prev,
      [contactId]: { ...prev[contactId] ?? { empresa_actual: "", cargo_actual: "" }, [field]: value },
    }));
    setSaveStates((prev) => ({ ...prev, [contactId]: "idle" }));
  }

  async function handleSave(c: Contact) {
    const edit = getEdit(c);
    setSaveStates((prev) => ({ ...prev, [c.id]: "saving" }));

    try {
      const res = await fetch(`/api/contacts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_actual: edit.empresa_actual,
          cargo_actual: edit.cargo_actual,
        }),
      });

      if (!res.ok) throw new Error();

      // Sync local baseline so isDirty resets
      c.empresa_actual = edit.empresa_actual || null;
      c.cargo_actual = edit.cargo_actual || null;
      setEdits((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      setSaveStates((prev) => ({ ...prev, [c.id]: "saved" }));
      setTimeout(() => setSaveStates((prev) => ({ ...prev, [c.id]: "idle" })), 2000);
    } catch {
      setSaveStates((prev) => ({ ...prev, [c.id]: "error" }));
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros y descargas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {([
            { key: "all", label: `Todos (${contacts.length})` },
            { key: "changed", label: `Cambios (${changedCount})` },
            { key: "errors", label: `Errores (${errorCount})` },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <a
            href={`/api/runs/${runId}/export?format=csv`}
            download
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
          >
            Descargar CSV
          </a>
          <a
            href={`/api/runs/${runId}/export?format=xlsx`}
            download
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
          >
            Descargar Excel
          </a>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">LinkedIn</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa original</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa nueva</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo actual</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm text-gray-400">
                    No hay resultados para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const edit = getEdit(c);
                  const dirty = isDirty(c);
                  const saveState = saveStates[c.id] ?? "idle";

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.contact_id}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{c.nombre} {c.apellidos}</td>
                      <td className="px-4 py-3">
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs truncate block max-w-[160px]"
                        >
                          {c.linkedin_url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.empresa_original}</td>

                      {/* Empresa nueva — editable */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={edit.empresa_actual}
                          onChange={(e) => handleChange(c.id, "empresa_actual", e.target.value)}
                          placeholder="—"
                          className="w-full min-w-[140px] px-2 py-1 text-sm border border-transparent rounded hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-transparent focus:bg-white transition-colors"
                        />
                      </td>

                      {/* Cargo actual — editable */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={edit.cargo_actual}
                          onChange={(e) => handleChange(c.id, "cargo_actual", e.target.value)}
                          placeholder="—"
                          className="w-full min-w-[140px] px-2 py-1 text-sm border border-transparent rounded hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-transparent focus:bg-white transition-colors"
                        />
                      </td>

                      <td className="px-4 py-3">
                        {c.error ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-100">
                            ⚠ {c.error}
                          </span>
                        ) : c.changed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100 font-medium">
                            Cambio detectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">
                            ✓ Sin cambios
                          </span>
                        )}
                      </td>

                      {/* Botón guardar */}
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {saveState === "saved" ? (
                          <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                        ) : saveState === "error" ? (
                          <span className="text-xs text-red-500 font-medium">Error</span>
                        ) : (
                          <button
                            onClick={() => handleSave(c)}
                            disabled={!dirty || saveState === "saving"}
                            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                              dirty
                                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                : "bg-white text-gray-300 border-gray-200 cursor-default"
                            }`}
                          >
                            {saveState === "saving" ? "Guardando…" : "Guardar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
