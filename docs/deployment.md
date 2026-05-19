# Deployment — championfinder

## Variables de entorno

| Variable | Descripción | Obligatoria |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon pública de Supabase | Sí |
| `PROXYCURL_API_KEY` | API key de ProxyCurl (issue #3) | Sí (para procesamiento) |

## Setup inicial (manual)

### Supabase
1. Crear proyecto en supabase.com
2. Copiar URL y anon key al `.env.local`
3. Ejecutar las migraciones en el SQL Editor de Supabase:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_bucket.sql`

### Vercel
1. Conectar repositorio GitHub en vercel.com
2. Añadir las variables de entorno en el dashboard de Vercel
3. Deploy automático en cada push a `main`

### Auth callback URL
En el dashboard de Supabase → Authentication → URL Configuration:
- Site URL: `https://tu-dominio.vercel.app`
- Redirect URLs: `https://tu-dominio.vercel.app/auth/callback`

## Entornos

| Entorno | Rama | URL |
|---|---|---|
| Producción | `main` | Vercel (dominio asignado) |
| Desarrollo | local | `http://localhost:3000` |
