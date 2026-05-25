# Autenticación — championfinder

## Proveedor

Supabase Auth con email y contraseña.

## Flujo

1. Usuario accede a `/auth/register` → introduce email y contraseña
2. Supabase envía email de confirmación
3. Usuario hace clic en el enlace → redirige a `/auth/callback?code=...`
4. La route handler intercambia el code por una sesión y redirige a `/dashboard`
5. Para login posterior: `/auth/login` con email y contraseña
6. Logout: llama a `supabase.auth.signOut()` y redirige a `/auth/login`

## Middleware

`src/middleware.ts` protege todas las rutas no públicas:
- Rutas públicas: `/`, `/auth/*`
- Cualquier otra ruta sin sesión activa → redirect a `/auth/login`
- Usuario autenticado en `/auth/*` → redirect a `/dashboard`

## Clientes Supabase

| Fichero | Uso |
|---|---|
| `src/lib/supabase/client.ts` | Componentes cliente ("use client") |
| `src/lib/supabase/server.ts` | Server Components y Route Handlers |
| `src/lib/supabase/middleware.ts` | Middleware de Next.js |
