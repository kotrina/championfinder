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
            CSV
          </a>
          <a
            href={`/api/runs/${runId}/export?format=xlsx`}
            download
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
          >
            Excel
          </a>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contacto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa original</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa nueva</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo actual</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-sm text-gray-400">
                  No hay resultados para este filtro.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const edit = getEdit(c);
                const dirty = isDirty(c);
                const saveState = saveStates[c.id] ?? "idle";

                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors align-top">
                    {/* Contacto: nombre + ID + LinkedIn */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate">{c.nombre} {c.apellidos}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 font-mono truncate">{c.contact_id}</span>
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={c.linkedin_url}
                          className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      </div>
                    </td>

                    {/* Empresa original */}
                    <td className="px-4 py-3 text-gray-600 text-sm truncate" title={c.empresa_original}>
                      {c.empresa_original}
                    </td>

                    {/* Empresa nueva — editable */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={edit.empresa_actual}
                        onChange={(e) => handleChange(c.id, "empresa_actual", e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 text-sm border border-transparent rounded-md hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-transparent focus:bg-white transition-colors"
                      />
                    </td>

                    {/* Cargo actual — editable */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={edit.cargo_actual}
                        onChange={(e) => handleChange(c.id, "cargo_actual", e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 text-sm border border-transparent rounded-md hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-transparent focus:bg-white transition-colors"
                      />
                    </td>

                    {/* Estado + acción guardar */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 items-start">
                        {c.error ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-100 max-w-full truncate" title={c.error}>
                            ⚠ {c.error}
                          </span>
                        ) : c.changed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">
                            Cambio detectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">
                            ✓ Sin cambios
                          </span>
                        )}

                        {saveState === "saved" ? (
                          <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                        ) : saveState === "error" ? (
                          <span className="text-xs text-red-500 font-medium">Error al guardar</span>
                        ) : dirty ? (
                          <button
                            onClick={() => handleSave(c)}
                            disabled={saveState === "saving"}
                            className="px-2.5 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                          >
                            {saveState === "saving" ? "Guardando…" : "Guardar"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
