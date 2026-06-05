"use client";

import { useState } from "react";

type Filter = { id: number; name: string };

type Props = {
  filters: Filter[];
  currentFilterId: string | null;
  lastSyncedAt: string | null;
};

export function SettingsForm({ filters, currentFilterId, lastSyncedAt }: Props) {
  const [selectedFilterId, setSelectedFilterId] = useState(currentFilterId ?? "");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastSync, setLastSync] = useState(lastSyncedAt);

  async function handleSave() {
    if (!selectedFilterId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "pipedrive_filter_id", value: selectedFilterId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      setSaveMsg(data.ok ? { ok: true, text: "Configuración guardada" } : { ok: false, text: data.error ?? "Error" });
    } catch {
      setSaveMsg({ ok: false, text: "Error de red" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json() as { ok?: boolean; upserted?: number; error?: string };
      if (data.ok) {
        const now = new Date().toISOString();
        setLastSync(now);
        setSyncMsg({ ok: true, text: `✓ ${data.upserted} contactos sincronizados` });
      } else {
        setSyncMsg({ ok: false, text: data.error ?? "Error durante la sincronización" });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Error de red" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Filtro Pipedrive */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Filtro de Pipedrive</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona el filtro guardado en Pipedrive del que se importarán los contactos.
          </p>
        </div>

        {filters.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No se encontraron filtros de tipo "People" en Pipedrive.
          </p>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtro activo</label>
              <select
                value={selectedFilterId}
                onChange={(e) => setSelectedFilterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecciona un filtro —</option>
                {filters.map((f) => (
                  <option key={f.id} value={String(f.id)}>{f.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !selectedFilterId}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}

        {saveMsg && (
          <p className={`text-sm px-3 py-2 rounded-lg border ${
            saveMsg.ok
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}>
            {saveMsg.text}
          </p>
        )}
      </div>

      {/* Sincronización */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sincronización</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Descarga todos los contactos del filtro seleccionado y actualiza la base de datos local.
          </p>
        </div>

        {lastSync && (
          <p className="text-xs text-gray-400">
            Última sincronización: {new Date(lastSync).toLocaleString("es-ES")}
          </p>
        )}

        <button
          onClick={handleSync}
          disabled={syncing || !selectedFilterId}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? "Sincronizando…" : "Sincronizar ahora"}
        </button>

        {syncMsg && (
          <p className={`text-sm px-3 py-2 rounded-lg border ${
            syncMsg.ok
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}>
            {syncMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}
