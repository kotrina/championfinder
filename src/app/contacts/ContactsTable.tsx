"use client";

import { useState, useEffect } from "react";
import type { EnrichResult } from "@/app/api/people/enrich/route";

export type Person = {
  pipedrive_id: number;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  organizacion: string | null;
  marketing_status: string | null;
  rol: string | null;
  linkedin_url: string | null;
  won_deals: number;
  total_activities: number;
  location: string | null;
  empresa_linkedin: string | null;
  cargo_linkedin: string | null;
  needs_sync: boolean;
  is_historical: boolean;
  scrape_status: string | null;
};

type EditableField = "empresa_linkedin" | "cargo_linkedin" | "linkedin_url";
type EditingCell = { id: number; field: EditableField; value: string };
type HiddenCols = { pipedrive_id: boolean; location: boolean; won_deals: boolean; total_activities: boolean };
type LocalFields = { empresa?: string; cargo?: string; linkedin?: string };
type RowSyncState = "idle" | "searching" | "syncing" | "success" | "error";
type OrgModal = {
  personId: number;
  empresa: string;
  results: { id: number; name: string; people_count: number }[];
};

// ── Editable cell ─────────────────────────────────────────────────────────────
function LinkedInCell({
  value, editing, saving, onStart, onChange, onSave, onCancel,
}: {
  value: string; editing: boolean; saving: boolean;
  onStart: () => void; onChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          className="w-full px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
        />
        <div className="flex gap-1">
          <button onClick={onSave} disabled={saving}
            className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "…" : "✓"}
          </button>
          <button onClick={onCancel}
            className="px-2 py-0.5 text-xs border border-gray-200 text-gray-500 rounded hover:bg-gray-50">
            ✕
          </button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={onStart}
      className="group flex items-center gap-1 cursor-pointer rounded px-1 py-1 hover:bg-indigo-50 transition-colors min-h-[28px]">
      <span className={`text-xs flex-1 truncate ${value ? "text-indigo-700" : "text-gray-300"}`}>
        {value || "—"}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className="w-3 h-3 text-indigo-200 group-hover:text-indigo-400 flex-shrink-0 transition-colors">
        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ContactsTable({ initialPeople, syncStatusFilter }: { initialPeople: Person[]; syncStatusFilter?: string }) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<HiddenCols>({
    pipedrive_id: true, location: true, won_deals: true, total_activities: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [localLinkedIn, setLocalLinkedIn] = useState<Record<number, LocalFields>>({});
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [showEnrichConfirm, setShowEnrichConfirm] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichDone, setEnrichDone] = useState<{ success: number; errors: number } | null>(null);
  // Per-row Pipedrive sync
  const [rowSyncState, setRowSyncState] = useState<Record<number, RowSyncState>>({});
  const [rowSyncError, setRowSyncError] = useState<Record<number, string>>({});
  const [orgModal, setOrgModal] = useState<OrgModal | null>(null);
  // Delete contact
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sincronizar con nuevos datos del servidor (paginación, filtros)
  useEffect(() => {
    setPeople(initialPeople);
    setSelected(new Set());
    setLocalLinkedIn({});
    setEditingCell(null);
    setEnrichDone(null);
    setRowSyncState({});
    setRowSyncError({});
  }, [initialPeople]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getLinkedIn(p: Person, field: EditableField): string {
    const local = localLinkedIn[p.pipedrive_id];
    if (field === "empresa_linkedin") return local?.empresa !== undefined ? local.empresa : (p.empresa_linkedin ?? "");
    if (field === "cargo_linkedin") return local?.cargo !== undefined ? local.cargo : (p.cargo_linkedin ?? "");
    return local?.linkedin !== undefined ? local.linkedin : (p.linkedin_url ?? "");
  }

  const allSelected = people.length > 0 && people.every((p) => selected.has(p.pipedrive_id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(people.map((p) => p.pipedrive_id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleCol(col: keyof HiddenCols) {
    setHiddenCols((prev) => ({ ...prev, [col]: !prev[col] }));
  }

  // ── Inline editing ────────────────────────────────────────────────────────

  function startEdit(id: number, field: EditableField, currentValue: string) {
    setEditingCell({ id, field, value: currentValue });
  }

  async function saveCell() {
    if (!editingCell || savingCell) return;
    setSavingCell(true);
    const { id, field, value } = editingCell;
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setLocalLinkedIn((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...(field === "empresa_linkedin" ? { empresa: value }
            : field === "cargo_linkedin" ? { cargo: value }
            : { linkedin: value }),
        },
      }));
      // Marcar visualmente como pendiente si se editó un campo que afecta sync
      if (["empresa_linkedin", "cargo_linkedin", "linkedin_url"].includes(field)) {
        setPeople((prev) => prev.map((p) => p.pipedrive_id === id ? { ...p, needs_sync: true } : p));
      }
      setEditingCell(null);
    } catch {
      // keep editing open on error
    } finally {
      setSavingCell(false);
    }
  }

  // ── LinkedIn Enrichment ───────────────────────────────────────────────────

  async function handleEnrich() {
    setShowEnrichConfirm(false);
    setEnriching(true);
    setEnrichDone(null);
    try {
      const res = await fetch("/api/people/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json() as {
        ok?: boolean; successCount?: number; errorCount?: number;
        results?: EnrichResult[];
      };
      if (!res.ok || !data.ok) throw new Error();

      // Actualizar estado local con resultados
      const updates: Record<number, { empresa?: string; cargo?: string }> = {};
      for (const r of data.results ?? []) {
        if (r.ok) {
          updates[r.pipedrive_id] = {
            empresa: r.empresa_linkedin ?? "",
            cargo: r.cargo_linkedin ?? "",
          };
        }
      }
      setLocalLinkedIn((prev) => {
        const next = { ...prev };
        for (const [id, vals] of Object.entries(updates)) {
          next[Number(id)] = { ...next[Number(id)], empresa: vals.empresa, cargo: vals.cargo };
        }
        return next;
      });
      // Actualizar scrape_status localmente
      setPeople((prev) => prev.map((p) => {
        const r = (data.results ?? []).find((x) => x.pipedrive_id === p.pipedrive_id);
        if (!r) return p;
        return { ...p, scrape_status: r.ok ? "ok" : "failed", ...(r.ok ? { needs_sync: true } : {}) };
      }));
      setEnrichDone({ success: data.successCount ?? 0, errors: data.errorCount ?? 0 });
      setSelected(new Set());
    } catch {
      setEnrichDone({ success: 0, errors: selected.size });
    } finally {
      setEnriching(false);
    }
  }

  // ── Pipedrive sync por fila ───────────────────────────────────────────────

  function canSync(p: Person): boolean {
    if (p.is_historical) return false;
    const empresa = getLinkedIn(p, "empresa_linkedin");
    const cargo = getLinkedIn(p, "cargo_linkedin");
    const linkedin = getLinkedIn(p, "linkedin_url");
    return !!(empresa || cargo || linkedin);
  }

  async function handleSyncClick(p: Person) {
    const empresa = getLinkedIn(p, "empresa_linkedin");
    const org = p.organizacion ?? "";

    // Determinar si empresa cambió
    const empresaChanged = empresa && empresa.toLowerCase().trim() !== org.toLowerCase().trim();

    if (!empresaChanged) {
      // Ruta A directa
      await executeSyncAction(p.pipedrive_id, { action: "update_only" });
      return;
    }

    // Ruta B: buscar empresa en Pipedrive
    setRowSyncState((prev) => ({ ...prev, [p.pipedrive_id]: "searching" }));
    try {
      const res = await fetch(`/api/pipedrive/organizations?term=${encodeURIComponent(empresa)}`);
      const data = await res.json() as { organizations: { id: number; name: string; people_count: number }[] };
      setOrgModal({ personId: p.pipedrive_id, empresa, results: data.organizations });
      setRowSyncState((prev) => ({ ...prev, [p.pipedrive_id]: "idle" }));
    } catch {
      setRowSyncState((prev) => ({ ...prev, [p.pipedrive_id]: "error" }));
      setRowSyncError((prev) => ({ ...prev, [p.pipedrive_id]: "Error buscando empresa" }));
    }
  }

  async function executeSyncAction(
    personId: number,
    body: { action: "update_only" } | { action: "new_person_existing_org"; orgId: number } | { action: "new_person_new_org" }
  ) {
    setOrgModal(null);
    setRowSyncState((prev) => ({ ...prev, [personId]: "syncing" }));
    setRowSyncError((prev) => { const n = { ...prev }; delete n[personId]; return n; });
    try {
      const res = await fetch(`/api/people/${personId}/sync-to-pipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string;
        updated?: { rol: string | null; linkedin_url: string | null };
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error desconocido");

      const isRutaB = body.action === "new_person_existing_org" || body.action === "new_person_new_org";

      // Si hay filtro activo de sync, eliminar la fila de la vista (ya no cumple el filtro)
      if (syncStatusFilter === "pending" || syncStatusFilter === "synced" || syncStatusFilter === "no_data") {
        setPeople((prev) => prev.filter((p) => p.pipedrive_id !== personId));
        if (detailPerson?.pipedrive_id === personId) setDetailPerson(null);
      } else {
        // Sin filtro: actualizar estado local
        setPeople((prev) => prev.map((p) => {
          if (p.pipedrive_id !== personId) return p;
          return {
            ...p,
            needs_sync: false,
            // Ruta B: marcar como histórico para que el badge y el botón cambien al instante
            ...(isRutaB ? { is_historical: true } : {}),
            ...(data.updated?.rol !== null && data.updated?.rol !== undefined ? { rol: data.updated.rol } : {}),
            ...(data.updated?.linkedin_url !== null && data.updated?.linkedin_url !== undefined ? { linkedin_url: data.updated.linkedin_url } : {}),
          };
        }));
      }

      setRowSyncState((prev) => ({ ...prev, [personId]: "success" }));
      setTimeout(() => setRowSyncState((prev) => ({ ...prev, [personId]: "idle" })), 3000);
    } catch (err) {
      setRowSyncState((prev) => ({ ...prev, [personId]: "error" }));
      setRowSyncError((prev) => ({ ...prev, [personId]: err instanceof Error ? err.message : "Error" }));
    }
  }

  // ── Delete contact ────────────────────────────────────────────────────────

  async function handleDelete(personId: number) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/people/${personId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPeople((prev) => prev.filter((p) => p.pipedrive_id !== personId));
      setDetailPerson(null);
      setDeleteConfirm(false);
    } catch {
      // mantener panel abierto para reintentar
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Resultado enriquecimiento */}
      {enrichDone && (
        <div className={`px-4 py-2.5 rounded-lg border text-sm ${
          enrichDone.errors === 0 ? "bg-green-50 border-green-200 text-green-700"
          : enrichDone.success === 0 ? "bg-red-50 border-red-200 text-red-700"
          : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          ✓ {enrichDone.success} perfiles consultados.
          {enrichDone.errors > 0 && ` ⚠ ${enrichDone.errors} errores.`}
        </div>
      )}

      {/* Barra de selección */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
          <span className="text-indigo-700 font-medium">
            {selected.size} contacto{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1 text-xs rounded-md border border-indigo-300 text-indigo-600 hover:bg-indigo-100 transition-colors">
              Limpiar
            </button>
            <button
              onClick={() => setShowEnrichConfirm(true)}
              disabled={enriching}
              className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
            >
              {enriching ? "Consultando…" : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  LinkedIn Scraping ({selected.size})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tabla + toggle columnas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Cabecera tabla con toggle de columnas */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <button
              onClick={() => setShowColMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
              Columnas
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 space-y-1 min-w-[160px]">
                {([
                  { key: "pipedrive_id", label: "ID Pipedrive" },
                  { key: "location", label: "Ubicación" },
                  { key: "won_deals", label: "Won Deals" },
                  { key: "total_activities", label: "Total Actividades" },
                ] as { key: keyof HiddenCols; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!hiddenCols[key]}
                      onChange={() => toggleCol(key)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto" onClick={() => setShowColMenu(false)}>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                {!hiddenCols.pipedrive_id && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">ID</th>}
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Nombre</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Organización</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Rol</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Marketing</th>
                {!hiddenCols.location && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Ubicación</th>}
                {!hiddenCols.won_deals && <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Deals</th>}
                {!hiddenCols.total_activities && <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Activ.</th>}
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">LinkedIn URL</th>
                {/* Columnas LinkedIn — color índigo */}
                <th className="text-left px-3 py-2.5 text-xs font-medium text-indigo-500 uppercase tracking-wide whitespace-nowrap bg-indigo-50/50 w-[120px]">Empresa LI</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-indigo-500 uppercase tracking-wide whitespace-nowrap bg-indigo-50/50 w-[100px]">Cargo LI</th>
                <th className="px-3 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {people.length === 0 ? (
                <tr>
                  <td colSpan={20} className="text-center py-8 text-sm text-gray-400">
                    No hay contactos.
                  </td>
                </tr>
              ) : people.map((p) => {
                const isSelected = selected.has(p.pipedrive_id);
                const empresaVal = getLinkedIn(p, "empresa_linkedin");
                const cargoVal = getLinkedIn(p, "cargo_linkedin");
                const editingEmpresa = editingCell?.id === p.pipedrive_id && editingCell.field === "empresa_linkedin";
                const editingCargo = editingCell?.id === p.pipedrive_id && editingCell.field === "cargo_linkedin";

                return (
                  <tr key={p.pipedrive_id}
                    className={`transition-colors align-middle ${isSelected ? "bg-indigo-50/40" : "hover:bg-gray-50/60"}`}>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(p.pipedrive_id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    {!hiddenCols.pipedrive_id && (
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs cursor-pointer"
                        onClick={() => setDetailPerson(p)}>{p.pipedrive_id}</td>
                    )}
                    <td className="px-3 py-2 max-w-[120px]">
                      <div className="flex items-center gap-1.5">
                        {/* Indicador de estado de sync */}
                        {(() => {
                          if (p.is_historical) return (
                            <span className="flex-shrink-0 px-1 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-400 leading-none" title="Contacto histórico — empresa anterior">Hist.</span>
                          );
                          const hasLinkedInData = !!(p.empresa_linkedin || p.cargo_linkedin);
                          if (!hasLinkedInData) return (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-200" title="Sin datos LinkedIn que sincronizar" />
                          );
                          if (p.needs_sync) return (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Pendiente de enviar a Pipedrive" />
                          );
                          return (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" title="Sincronizado con Pipedrive" />
                          );
                        })()}
                        {/* Indicador de scraping fallido */}
                        {p.scrape_status === "failed" && (
                          <span className="flex-shrink-0 text-[11px] leading-none" title="Último scraping LinkedIn falló — perfil no encontrado o error de API">❌</span>
                        )}
                        <a
                          href={`https://${process.env.NEXT_PUBLIC_PIPEDRIVE_DOMAIN ?? "app"}.pipedrive.com/person/${p.pipedrive_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-blue-600 hover:underline text-sm truncate block"
                          title="Ver en Pipedrive"
                        >
                          {[p.nombre, p.apellidos].filter(Boolean).join(" ") || "—"}
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs truncate max-w-[140px] cursor-pointer"
                      onClick={() => setDetailPerson(p)}>{p.email ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600 text-sm truncate max-w-[130px] cursor-pointer"
                      onClick={() => setDetailPerson(p)}>{p.organizacion ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs truncate max-w-[100px] cursor-pointer"
                      onClick={() => setDetailPerson(p)}>{p.rol ?? "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setDetailPerson(p)}>
                      {p.marketing_status
                        ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{p.marketing_status}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {!hiddenCols.location && (
                      <td className="px-3 py-2 text-gray-600 text-xs truncate max-w-[100px] cursor-pointer"
                        onClick={() => setDetailPerson(p)}>{p.location ?? "—"}</td>
                    )}
                    {!hiddenCols.won_deals && (
                      <td className="px-3 py-2 text-right text-gray-600 text-xs cursor-pointer"
                        onClick={() => setDetailPerson(p)}>{p.won_deals}</td>
                    )}
                    {!hiddenCols.total_activities && (
                      <td className="px-3 py-2 text-right text-gray-600 text-xs cursor-pointer"
                        onClick={() => setDetailPerson(p)}>{p.total_activities}</td>
                    )}
                    {/* LinkedIn URL — editable */}
                    <td className="px-2 py-1.5 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                      {editingCell?.id === p.pipedrive_id && editingCell.field === "linkedin_url" ? (
                        <div className="flex flex-col gap-1">
                          <input
                            autoFocus
                            value={editingCell.value}
                            onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveCell(); if (e.key === "Escape") setEditingCell(null); }}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                            placeholder="https://linkedin.com/in/..."
                          />
                          <div className="flex gap-1">
                            <button onClick={saveCell} disabled={savingCell}
                              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">
                              {savingCell ? "…" : "✓"}
                            </button>
                            <button onClick={() => setEditingCell(null)}
                              className="px-2 py-0.5 text-xs border border-gray-200 text-gray-500 rounded hover:bg-gray-50">
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(p.pipedrive_id, "linkedin_url", getLinkedIn(p, "linkedin_url"))}
                          className="group flex items-center gap-1 cursor-pointer rounded px-1 py-1 hover:bg-blue-50 transition-colors min-h-[28px]"
                        >
                          {getLinkedIn(p, "linkedin_url") ? (
                            <>
                              <a href={getLinkedIn(p, "linkedin_url")} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                              </a>
                              <span className="text-xs text-gray-400 truncate group-hover:text-blue-500 transition-colors">
                                {getLinkedIn(p, "linkedin_url").replace("https://www.linkedin.com/in/", "").replace("https://linkedin.com/in/", "").replace(/\/$/, "")}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 group-hover:text-gray-400">—</span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                            className="w-3 h-3 text-gray-200 group-hover:text-gray-400 flex-shrink-0 ml-auto transition-colors">
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    {/* Empresa LinkedIn — editable */}
                    <td className="px-2 py-1.5 bg-indigo-50/30 max-w-[120px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <LinkedInCell
                        value={editingEmpresa ? editingCell!.value : empresaVal}
                        editing={editingEmpresa}
                        saving={savingCell && editingEmpresa}
                        onStart={() => startEdit(p.pipedrive_id, "empresa_linkedin", empresaVal)}
                        onChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                        onSave={saveCell}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>
                    {/* Cargo LinkedIn — editable */}
                    <td className="px-2 py-1.5 bg-indigo-50/30 max-w-[100px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <LinkedInCell
                        value={editingCargo ? editingCell!.value : cargoVal}
                        editing={editingCargo}
                        saving={savingCell && editingCargo}
                        onStart={() => startEdit(p.pipedrive_id, "cargo_linkedin", cargoVal)}
                        onChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                        onSave={saveCell}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>

                    {/* Botón Enviar a Pipe */}
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {p.is_historical ? (
                        <span className="text-xs text-gray-300 cursor-default" title="Contacto histórico — usa el nuevo perfil para sincronizar">—</span>
                      ) : (() => {
                        const state = rowSyncState[p.pipedrive_id] ?? "idle";
                        const err = rowSyncError[p.pipedrive_id];
                        if (state === "success") {
                          return <span className="text-xs text-green-600 font-medium">✓ Enviado</span>;
                        }
                        if (state === "error") {
                          return (
                            <span className="text-xs text-red-500 cursor-help" title={err}>✗ Error</span>
                          );
                        }
                        return (
                          <button
                            onClick={() => handleSyncClick(p)}
                            disabled={!canSync(p) || state === "searching" || state === "syncing"}
                            title="Enviar a Pipedrive"
                            className={`px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
                              canSync(p)
                                ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                                : "border-gray-200 text-gray-300 cursor-not-allowed"
                            } disabled:opacity-60`}
                          >
                            {state === "searching" || state === "syncing" ? "…" : "→ Pipe"}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirmación scraping */}
      {showEnrichConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Lanzar LinkedIn Scraping?</h3>
            <p className="text-sm text-gray-600">
              Se consultarán <strong>{selected.size} perfiles</strong> de LinkedIn.
              Cada consulta consume <strong>1 crédito</strong> de EnrichLayer.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Total: {selected.size} crédito{selected.size !== 1 ? "s" : ""}. El proceso puede tardar varios segundos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEnrichConfirm(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleEnrich}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de empresa (Ruta B) */}
      {orgModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">¿A qué empresa vincular al contacto?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Empresa detectada: <strong className="text-gray-800">{orgModal.empresa}</strong>
              </p>
            </div>

            {orgModal.results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Empresas en Pipedrive</p>
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {orgModal.results.map((org) => (
                    <li key={org.id}>
                      <button
                        onClick={() => executeSyncAction(orgModal.personId, { action: "new_person_existing_org", orgId: org.id })}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="text-sm text-gray-800 font-medium">{org.name}</span>
                        <span className="text-xs text-gray-400">{org.people_count} contactos</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                No se encontraron empresas en Pipedrive con ese nombre.
              </p>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-2">
              {/* Opción: el contacto sigue en la misma empresa, solo cambió el ROL */}
              <button
                onClick={() => executeSyncAction(orgModal.personId, { action: "update_only" })}
                className="w-full flex items-center gap-2 px-4 py-2.5 border border-green-300 text-green-700 text-sm rounded-lg hover:bg-green-50 transition-colors"
              >
                <span>✓</span>
                <span className="text-left">
                  <span className="font-medium">Actualizar solo ROL</span>
                  <span className="block text-xs text-green-600">El contacto sigue en la misma empresa, solo ha cambiado de cargo</span>
                </span>
              </button>

              {/* Opción: crear nueva empresa en Pipedrive */}
              <button
                onClick={() => executeSyncAction(orgModal.personId, { action: "new_person_new_org" })}
                className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-orange-300 text-orange-600 text-sm rounded-lg hover:bg-orange-50 transition-colors"
              >
                <span className="text-lg leading-none">＋</span>
                <span>Crear nueva empresa: <strong>{orgModal.empresa}</strong> (label REVISAR)</span>
              </button>

              <button
                onClick={() => { setOrgModal(null); setRowSyncState((prev) => ({ ...prev, [orgModal.personId]: "idle" })); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel lateral de detalle */}
      {detailPerson && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDetailPerson(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm truncate pr-4">
                {[detailPerson.nombre, detailPerson.apellidos].filter(Boolean).join(" ") || "Contacto"}
              </h3>
              <button onClick={() => setDetailPerson(null)}
                className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "ID Pipedrive", value: String(detailPerson.pipedrive_id) },
                { label: "Email", value: detailPerson.email },
                { label: "Organización", value: detailPerson.organizacion },
                { label: "Rol", value: detailPerson.rol },
                { label: "Marketing Status", value: detailPerson.marketing_status },
                { label: "Ubicación", value: detailPerson.location },
                { label: "Won Deals", value: detailPerson.won_deals !== null ? String(detailPerson.won_deals) : null },
                { label: "Total Actividades", value: detailPerson.total_activities !== null ? String(detailPerson.total_activities) : null },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-gray-800 mt-0.5">{value || "—"}</p>
                </div>
              ))}
              {detailPerson.linkedin_url && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">LinkedIn</p>
                  <a href={detailPerson.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate block mt-0.5">
                    {detailPerson.linkedin_url}
                  </a>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-2">Datos LinkedIn</p>
                <div>
                  <p className="text-xs text-gray-400">Empresa LinkedIn</p>
                  <p className="text-sm text-indigo-700 mt-0.5">{getLinkedIn(detailPerson, "empresa_linkedin") || "—"}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Cargo LinkedIn</p>
                  <p className="text-sm text-indigo-700 mt-0.5">{getLinkedIn(detailPerson, "cargo_linkedin") || "—"}</p>
                </div>
              </div>
            </div>

            {/* ── Zona peligrosa: borrar contacto ── */}
            <div className="mt-6 border-t border-red-100 pt-4">
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                >
                  Eliminar contacto de la BD
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 font-medium text-center">
                    ¿Seguro? Esta acción no se puede deshacer
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    Solo se elimina de nuestra BD, no de Pipedrive.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleDelete(detailPerson.pipedrive_id)}
                      disabled={deleting}
                      className="flex-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
