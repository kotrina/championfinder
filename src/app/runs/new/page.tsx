"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { parseContactFile, MAX_CONTACTS_LIMIT, type RawContact } from "@/lib/parse-contacts";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Run = Database["public"]["Tables"]["runs"]["Row"];

type UploadState =
  | { step: "idle" }
  | { step: "parsed"; contacts: RawContact[]; file: File; totalInFile: number }
  | { step: "uploading" }
  | { step: "error"; message: string };

export default function NewRunPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ step: "idle" });
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      setState({ step: "error", message: "Solo se aceptan ficheros .xlsx o .csv" });
      return;
    }

    setState({ step: "uploading" });
    const result = await parseContactFile(file);

    if (!result.ok) {
      setState({ step: "error", message: result.error });
      return;
    }

    // Contamos el total antes de truncar para mostrar aviso
    const buffer = await file.arrayBuffer();
    const { read, utils } = await import("xlsx");
    const wb = read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const allRows = utils.sheet_to_json(sheet);
    const totalInFile = allRows.length;

    setState({ step: "parsed", contacts: result.contacts, file, totalInFile });
  }, []);

  async function handleConfirm() {
    if (state.step !== "parsed") return;
    setState({ step: "uploading" });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ step: "error", message: "Sesión expirada. Por favor, inicia sesión de nuevo." });
      return;
    }

    // Crear el run en la DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run, error: runError } = await (supabase as any)
      .from("runs")
      .insert({
        user_id: user.id,
        filename: state.file.name,
        status: "pending",
        total_contacts: state.contacts.length,
      })
      .select()
      .single() as { data: Run | null; error: { message: string } | null };

    if (runError || !run) {
      setState({ step: "error", message: "Error al crear la ejecución. Inténtalo de nuevo." });
      return;
    }

    // Subir fichero a Storage
    const filePath = `${user.id}/${run.id}/${state.file.name}`;
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(filePath, state.file);

    if (storageError) {
      setState({ step: "error", message: "Error al subir el fichero." });
      return;
    }

    // Insertar contactos
    const contactRows = state.contacts.map((c) => ({
      run_id: run.id,
      contact_id: c.id_contacto,
      nombre: c.nombre,
      apellidos: c.apellidos,
      linkedin_url: c.linkedin_url,
      empresa_original: c.empresa_actual,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: contactsError } = await (supabase as any).from("contacts").insert(contactRows) as { error: { message: string } | null };

    if (contactsError) {
      setState({ step: "error", message: "Error al guardar los contactos." });
      return;
    }

    router.push(`/runs/${run.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Nueva ejecución</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Zona de subida */}
        {(state.step === "idle" || state.step === "error") && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"
            }`}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-medium text-gray-700">
              Arrastra tu fichero aquí, o{" "}
              <label className="text-blue-600 cursor-pointer hover:underline">
                selecciónalo
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-gray-400">Formatos: .xlsx, .csv — máximo 100 contactos</p>
            <a
              href="/ejemplo_contactos.csv"
              download
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 hover:underline transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Descargar ejemplo de fichero
            </a>

            {state.step === "error" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{state.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Cargando */}
        {state.step === "uploading" && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-sm text-gray-500">Procesando fichero...</p>
          </div>
        )}

        {/* Previsualización */}
        {state.step === "parsed" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{state.file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {state.contacts.length} contactos
                    {state.totalInFile > MAX_CONTACTS_LIMIT && (
                      <span className="ml-2 text-amber-600 font-medium">
                        (el fichero tiene {state.totalInFile} — se procesarán los primeros {MAX_CONTACTS_LIMIT})
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setState({ step: "idle" })}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Cambiar fichero
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["ID", "Nombre", "Apellidos", "LinkedIn", "Empresa"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.contacts.slice(0, 5).map((c, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-700">{c.id_contacto}</td>
                        <td className="py-2 px-2 text-gray-700">{c.nombre}</td>
                        <td className="py-2 px-2 text-gray-700">{c.apellidos}</td>
                        <td className="py-2 px-2 text-gray-500 max-w-[160px] truncate">{c.linkedin_url}</td>
                        <td className="py-2 px-2 text-gray-700">{c.empresa_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {state.contacts.length > 5 && (
                  <p className="text-xs text-gray-400 px-2 py-2">
                    + {state.contacts.length - 5} contactos más
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Confirmar y lanzar procesamiento
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
