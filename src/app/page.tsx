import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/get-user-role";
import { AppHeader } from "@/components/AppHeader";

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getUserRole();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader email={user.email!} isAdmin={role === "admin"} activePage="contacts" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Cabecera */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a ChampionFinder</h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed">
            Herramienta interna de Manfred para importar contactos desde Pipedrive, enriquecerlos con datos de LinkedIn y mantener los perfiles actualizados.
          </p>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/contacts"
            className="flex flex-col gap-1.5 p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group">
            <span className="text-2xl">👥</span>
            <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Contactos</span>
            <span className="text-xs text-gray-400">Consulta, filtra y enriquece la lista de contactos importados desde Pipedrive.</span>
          </Link>
          <Link href="/roles"
            className="flex flex-col gap-1.5 p-5 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-sm transition-all group">
            <span className="text-2xl">🏷️</span>
            <span className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">Roles</span>
            <span className="text-xs text-gray-400">Agrupa y fusiona roles duplicados o similares para mantener consistencia.</span>
          </Link>
          <Link href="/settings"
            className="flex flex-col gap-1.5 p-5 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all group">
            <span className="text-2xl">⚙️</span>
            <span className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">Configuración</span>
            <span className="text-xs text-gray-400">Configura el filtro de Pipedrive y lanza la sincronización de contactos.</span>
          </Link>
        </div>

        {/* Flujo de trabajo */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Flujo de trabajo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sigue estos pasos para mantener los contactos actualizados en Pipedrive.</p>
          </div>
          <ol className="divide-y divide-gray-50">
            {[
              {
                n: "1",
                title: "Configura el filtro de Pipedrive",
                desc: "Ve a Configuración y selecciona el filtro de Pipedrive que quieres importar. Pulsa «Sincronizar» para traer los contactos a la base de datos local.",
                href: "/settings",
                color: "text-orange-600 bg-orange-50 border-orange-100",
              },
              {
                n: "2",
                title: "Revisa y filtra los contactos",
                desc: "En Contactos verás todos los perfiles activos ordenados alfabéticamente. Usa los filtros para localizar lo que necesitas: busca por nombre, empresa, rol, ubicación, filtra «Con LinkedIn» o por estado de sync (🟡 Pendientes / 🟢 Sincronizados). Los contactos históricos están ocultos por defecto — usa el filtro «🏷️ Históricos» si necesitas consultarlos.",
                href: "/contacts",
                color: "text-blue-600 bg-blue-50 border-blue-100",
              },
              {
                n: "3",
                title: "Enriquece con LinkedIn Scraping",
                desc: "Selecciona contactos con URL de LinkedIn y pulsa «LinkedIn Scraping». Se rellena automáticamente Empresa LinkedIn y Cargo LinkedIn. Los contactos históricos se omiten automáticamente para no contaminar datos anteriores.",
                href: "/contacts",
                color: "text-indigo-600 bg-indigo-50 border-indigo-100",
              },
              {
                n: "4",
                title: "Fusiona roles duplicados",
                desc: "En Roles puedes agrupar variantes del mismo rol (ej. «Dev», «Developer», «Desarrollador») en una etiqueta canónica que se actualiza en Pipedrive.",
                href: "/roles",
                color: "text-purple-600 bg-purple-50 border-purple-100",
              },
              {
                n: "5",
                title: "Envía los cambios a Pipedrive",
                desc: "Usa el botón «→ Pipe» en cada fila para sincronizar. El punto de color indica el estado: 🟡 pendiente de enviar, 🟢 ya sincronizado, ⚫ sin datos LinkedIn. Filtra por «Pendientes» para localizar rápidamente los que necesitan sync. La herramienta elige Ruta A o Ruta B automáticamente.",
                href: "/contacts",
                color: "text-green-600 bg-green-50 border-green-100",
              },
            ].map(({ n, title, desc, href, color }) => (
              <li key={n} className="flex gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5 ${color}`}>
                  {n}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <Link href={href}
                  className="flex-shrink-0 self-center text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap">
                  Ir →
                </Link>
              </li>
            ))}
          </ol>
        </div>

        {/* Ruta A vs Ruta B */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Ruta A y Ruta B al enviar a Pipedrive</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cuando pulsas «→ Pipe», la herramienta decide qué acción tomar según la situación del contacto.</p>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="px-6 py-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Ruta A</span>
                <span className="text-sm font-medium text-gray-800">Misma empresa</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                La Empresa LinkedIn coincide con la organización actual en Pipedrive. Solo se actualizan el <strong>ROL</strong> y la <strong>URL de LinkedIn</strong> en el contacto existente. Sin crear nada nuevo.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mt-2">
                <li className="flex gap-1.5"><span className="text-green-500 mt-0.5">✓</span> Actualiza ROL en Pipedrive</li>
                <li className="flex gap-1.5"><span className="text-green-500 mt-0.5">✓</span> Actualiza LinkedIn URL en Pipedrive</li>
                <li className="flex gap-1.5"><span className="text-green-500 mt-0.5">✓</span> Marca el contacto como 🟢 sincronizado</li>
              </ul>
            </div>
            <div className="px-6 py-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">Ruta B</span>
                <span className="text-sm font-medium text-gray-800">Empresa diferente</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                La Empresa LinkedIn es distinta a la organización actual. Se crea un <strong>nuevo contacto</strong> en Pipedrive vinculado a la nueva empresa, con label <strong>REVISAR</strong>. El contacto original se marca como <strong>Histórico</strong> para preservar su integridad.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mt-2">
                <li className="flex gap-1.5"><span className="text-orange-500 mt-0.5">✓</span> Crea nuevo contacto con label REVISAR</li>
                <li className="flex gap-1.5"><span className="text-orange-500 mt-0.5">✓</span> Crea nueva empresa si no existe (label REVISAR)</li>
                <li className="flex gap-1.5"><span className="text-orange-500 mt-0.5">✓</span> Guarda Previous Company y Previous Profile en el nuevo contacto</li>
                <li className="flex gap-1.5"><span className="text-orange-500 mt-0.5">✓</span> El original queda como «Hist.» — ya no se enriquece ni sincroniza</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Indicadores visuales */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Indicadores visuales en la tabla</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cada fila muestra un indicador junto al nombre para conocer el estado de un vistazo.</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {[
              { icon: "🟡", label: "Pendiente", desc: "Tiene datos de LinkedIn (empresa o cargo) que aún no se han enviado a Pipedrive." },
              { icon: "🟢", label: "Sincronizado", desc: "Los datos están al día en Pipedrive. Último envío posterior a cualquier cambio." },
              { icon: "⚫", label: "Sin datos", desc: "No tiene empresa ni cargo LinkedIn — nada relevante que sincronizar todavía." },
              { icon: "🏷️", label: "Hist.", desc: "Contacto histórico (empresa anterior). Oculto por defecto. Usa el filtro «🏷️ Históricos» para consultarlos. Ya no se enriquece ni se sincroniza." },
            ].map(({ icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3 px-6 py-3">
                <span className="text-base mt-0.5 w-5 text-center flex-shrink-0">{icon}</span>
                <div>
                  <span className="text-xs font-semibold text-gray-700">{label} </span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </main>
    </div>
  );
}
