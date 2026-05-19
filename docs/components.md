# Componentes — championfinder

## `LogoutButton`

**Ruta:** `src/components/LogoutButton.tsx`

Botón de cierre de sesión. Llama a `supabase.auth.signOut()` y redirige a `/auth/login`.

Uso: client component (`"use client"`), sin props.

---

## Página `/runs/new`

**Ruta:** `src/app/runs/new/page.tsx`

Página de creación de nueva ejecución. Flujo:

1. Zona drag & drop para subir `.xlsx` o `.csv`
2. Parseo en cliente con `parseContactFile` (SheetJS)
3. Tabla de previsualización (primeros 5 contactos)
4. Botón de confirmación → sube fichero a Storage, crea `run` y `contacts` en DB, redirige a `/runs/[id]`

**Validaciones:**
- Solo acepta `.xlsx` y `.csv`
- Valida columnas obligatorias: `id_contacto`, `nombre`, `apellidos`, `linkedin_url`, `empresa_actual`
- Límite de 100 contactos (los que excedan se descartan con aviso)

---

## Utilidad `parseContactFile`

**Ruta:** `src/lib/parse-contacts.ts`

Parsea un fichero Excel o CSV usando SheetJS y devuelve un array tipado de `RawContact` o un error descriptivo.

```ts
type RawContact = {
  id_contacto: string;
  nombre: string;
  apellidos: string;
  linkedin_url: string;
  empresa_actual: string;
};
```
