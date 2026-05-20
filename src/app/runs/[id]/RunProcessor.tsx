"use client";

import { useEffect, useState, useCallback } from "react";
import type { RunStatus } from "@/types/database";

type StatusData = {
  status: RunStatus;
  total: number;
  processed: number;
  changed: number;
  errors: number;
};

export function RunProcessor({
  runId,
  initialStatus,
  totalContacts,
}: {
  runId: string;
  initialStatus: RunStatus;
  totalContacts: number;
}) {
  const [statusData, setStatusData] = useState<StatusData>({
    status: initialStatus,
    total: totalContacts,
    processed: 0,
    changed: 0,
    errors: 0,
  });
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}/status`);
    if (res.ok) {
      const data = await res.json();
      setStatusData(data);
    }
  }, [runId]);

  // Polling mientras esté procesando
  useEffect(() => {
    if (statusData.status !== "processing") return;
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [statusData.status, fetchStatus]);

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError(null);

    const res = await fetch(`/api/runs/${runId}/process`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setLaunchError(data.error ?? "Error al lanzar el procesamiento");
      setLaunching(false);
      return;
    }

    setStatusData((prev) => ({ ...prev, status: "processing" }));
    setLaunching(false);
  }

  const progress =
    statusData.total > 0
      ? Math.round((statusData.processed / statusData.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Estado badge */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusData.status === "done"
                ? "bg-green-100 text-green-700"
                : statusData.status === "processing"
                ? "bg-yellow-100 text-yellow-700"
                : statusData.status === "error"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {statusData.status === "pending" && "Pendiente"}
            {statusData.status === "processing" && "Procesando..."}
            {statusData.status === "done" && "Completado"}
            {statusData.status === "error" && "Error"}
          </span>

          <div className="flex gap-6 text-sm text-gray-500">
            <span><strong className="text-gray-900">{statusData.total}</strong> contactos</span>
            {statusData.status === "done" && (
              <>
                <span><strong className="text-amber-600">{statusData.changed}</strong> cambios</span>
                <span><strong className="text-red-500">{statusData.errors}</strong> errores</span>
              </>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        {statusData.status === "processing" && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{statusData.processed} / {statusData.total} procesados</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Botón de lanzar */}
        {statusData.status === "pending" && (
          <div>
            {launchError && (
              <p className="text-sm text-red-600 mb-3">{launchError}</p>
            )}
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {launching ? "Lanzando..." : "Lanzar procesamiento"}
            </button>
          </div>
        )}

        {statusData.status === "done" && (
          <p className="text-sm text-gray-500">
            Los resultados están disponibles a continuación.
          </p>
        )}
      </div>
    </div>
  );
}
