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
type EditableField = "empresa_actual" | "cargo_actual";
type EditingCell = { contactId: string; field: EditableField; value: string };

// ── Subcomponent defined outside to avoid remount on parent re-render ────────

function EditableCell({
  value,
  editing,
  saving,
  hasError,
  onStart,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  editing: boolean;
  saving: boolean;
  hasError: boolean;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-2.5 py-0.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "…" : "Guardar"}
          </button>
          <button
            onClick={onCancel}
            className="px-2.5 py-0.5 text-xs border border-gray-200 text-gray-500 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          {hasError && <span className="text-xs text-red-500">Error al guardar</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onStart}
      className="group flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white hover:shadow-sm transition-all min-h-[32px]"
    >
      <span className={`text-sm flex-1 truncate ${value ? "text-gray-800" : "text-gray-300"}`}>
        {value || "—"}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors"
      >
        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
      </svg>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ResultsTable({ runId, contacts }: { runId: string; contacts: Contact[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  // Optimistic overrides for changed flag and field values
  const [localChanged, setLocalChanged] = useState<Record<string, boolean>>({});
  const [localFields, setLocalFields] = useState<Record<string, Partial<Record<EditableField, string>>>>({});
  // Pipedrive selection (client-side)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [cellSaveError, setCellSaveError] = useState(false);
  // Toggle changed state
  const [togglingChanged, setTogglingChanged] = useState<Set<string>>(new Set());

  // ── Derived helpers ────────────────────────────────────────────────────────

  function isChanged(c: Contact): boolean {
    return localChanged[c.id] !== undefined ? localChanged[c.id] : c.changed;
  }

  function getField(c: Contact, field: EditableField): string {
    const local = localFields[c.id]?.[field];
    return local !== undefined ? local : (c[field] ?? "");
  }

  const changedCount = contacts.filter((c) => isChanged(c)).length;
  const errorCount = contacts.filter((c) => !!c.error).length;

  const filtered = contacts.filter((c) => {
    if (filter === "changed") return isChanged(c);
    if (filter === "errors") return !!c.error;
    return true;
  });

  // ── Row styling ────────────────────────────────────────────────────────────

  function rowBorderClass(c: Contact, sel: boolean): string {
    if (c.error) return "border-red-300";
    if (isChanged(c)) return "border-amber-300";
    if (sel) return "border-blue-300";
    return "border-transparent";
  }

  function rowBgClass(c: Contact, sel: boolean): string {
    if (c.error) return sel ? "bg-red-50" : "bg-red-50/40";
    if (isChanged(c)) return sel ? "bg-amber-50" : "bg-amber-50/20";
    return sel ? "bg-blue-50/40" : "hover:bg-gray-50/60";
  }

  // ── Inline editing ─────────────────────────────────────────────────────────

  function startEdit(contactId: string, field: EditableField, currentValue: string) {
    setCellSaveError(false);
    setEditingCell({ contactId, field, value: currentValue });
  }

  async function saveCell() {
    if (!editingCell || savingCell) return;
    setSavingCell(true);
    setCellSaveError(false);
    const { contactId, field, value } = editingCell;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value, changed: true }),
      });
      if (!res.ok) throw new Error();
      setLocalFields((prev) => ({
        ...prev,
        [contactId]: { ...prev[contactId], [field]: value },
      }));
      setLocalChanged((prev) => ({ ...prev, [contactId]: true }));
      setEditingCell(null);
    } catch {
      setCellSaveError(true);
    } finally {
      setSavingCell(false);
    }
  }

  function cancelEdit() {
    setEditingCell(null);
    setCellSaveError(false);
  }

  // ── Toggle changed ─────────────────────────────────────────────────────────

  async function handleToggleChanged(c: Contact) {
    const next = !isChanged(c);
    setTogglingChanged((prev) => new Set(prev).add(c.id));
    setLocalChanged((prev) => ({ ...prev, [c.id]: next }));
    try {
      const res = await fetch(`/api/contacts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changed: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLocalChanged((prev) => ({ ...prev, [c.id]: !next }));
    } finally {
      setTogglingChanged((prev) => {
        const n = new Set(prev);
        n.delete(c.id);
        return n;
      });
    }
  }

  // ── Pipedrive selection ────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAllChanged() {
    setSelected(new Set(contacts.filter((c) => isChanged(c)).map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((c) => n.delete(c.id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((c) => n.add(c.id));
        return n;
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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

      {/* Barra selección Pipedrive */}
      {selected.size > 0 ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-700 font-medium">
            {selected.size} contacto{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""} para Pipedrive
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs rounded-md border border-blue-300 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Limpiar selección
            </button>
            <button
              disabled
              title="Próximamente"
              className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white opacity-50 cursor-not-allowed"
            >
              Enviar a Pipedrive
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={selectAllChanged}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          Seleccionar todos los cambiados ({changedCount})
        </button>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-amber-400 bg-amber-50 inline-block" />
          Cambiado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-red-400 bg-red-50 inline-block" />
          No encontrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-gray-200 bg-gray-50 inline-block" />
          Sin cambios
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-[21%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  title="Seleccionar todos en vista"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contacto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa original</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa nueva</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo actual</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-gray-400">
                  No hay resultados para este filtro.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const changed = isChanged(c);
                const isSelected = selected.has(c.id);
                const toggling = togglingChanged.has(c.id);

                return (
                  <tr
                    key={c.id}
                    className={`align-top transition-colors ${rowBgClass(c, isSelected)}`}
                  >
                    {/* Checkbox con borde de color como indicador de estado */}
                    <td className={`px-3 py-3.5 border-l-4 ${rowBorderClass(c, isSelected)}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Contacto: nombre + ID + LinkedIn */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate">
                        {c.nombre} {c.apellidos}
                      </div>
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
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                        </a>
                      </div>
                    </td>

                    {/* Empresa original */}
                    <td
                      className="px-4 py-3 text-gray-500 text-sm truncate"
                      title={c.empresa_original}
                    >
                      {c.empresa_original}
                    </td>

                    {/* Empresa nueva — click-to-edit */}
                    <td className="px-2 py-2">
                      <EditableCell
                        value={
                          editingCell?.contactId === c.id && editingCell.field === "empresa_actual"
                            ? editingCell.value
                            : getField(c, "empresa_actual")
                        }
                        editing={editingCell?.contactId === c.id && editingCell?.field === "empresa_actual"}
                        saving={savingCell && editingCell?.contactId === c.id && editingCell?.field === "empresa_actual"}
                        hasError={cellSaveError && editingCell?.contactId === c.id && editingCell?.field === "empresa_actual"}
                        onStart={() => startEdit(c.id, "empresa_actual", getField(c, "empresa_actual"))}
                        onChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                        onSave={saveCell}
                        onCancel={cancelEdit}
                      />
                    </td>

                    {/* Cargo actual — click-to-edit */}
                    <td className="px-2 py-2">
                      <EditableCell
                        value={
                          editingCell?.contactId === c.id && editingCell.field === "cargo_actual"
                            ? editingCell.value
                            : getField(c, "cargo_actual")
                        }
                        editing={editingCell?.contactId === c.id && editingCell?.field === "cargo_actual"}
                        saving={savingCell && editingCell?.contactId === c.id && editingCell?.field === "cargo_actual"}
                        hasError={cellSaveError && editingCell?.contactId === c.id && editingCell?.field === "cargo_actual"}
                        onStart={() => startEdit(c.id, "cargo_actual", getField(c, "cargo_actual"))}
                        onChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                        onSave={saveCell}
                        onCancel={cancelEdit}
                      />
                    </td>

                    {/* Estado + toggle manual */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 items-start">
                        {c.error ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200"
                            title={c.error}
                          >
                            ⚠ No encontrado
                          </span>
                        ) : changed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
                            Cambiado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
                            Sin cambios
                          </span>
                        )}

                        <button
                          onClick={() => handleToggleChanged(c)}
                          disabled={toggling}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                            changed
                              ? "border-amber-200 text-amber-500 hover:bg-amber-50"
                              : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                          }`}
                        >
                          {toggling ? "…" : changed ? "Desmarcar" : "Marcar cambiado"}
                        </button>
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
