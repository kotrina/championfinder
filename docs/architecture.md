# Arquitectura — championfinder

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + API routes | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui (a añadir progresivamente) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Almacenamiento de ficheros | Supabase Storage |
| LinkedIn lookups | ProxyCurl API |
| Deploy | Vercel |

## Estructura de carpetas

```
championfinder/
├── src/
│   ├── app/
│   │   ├── auth/          # login, register, callback, error
│   │   ├── dashboard/     # página principal post-login
│   │   ├── runs/          # nueva ejecución, detalle, historial
│   │   └── api/           # API routes (procesamiento)
│   ├── components/        # componentes reutilizables
│   ├── lib/
│   │   └── supabase/      # client, server, middleware
│   └── types/
│       └── database.ts    # tipos TypeScript del esquema DB
├── supabase/
│   └── migrations/        # SQL de esquema y storage
└── docs/                  # documentación del proyecto
```

## Flujo principal

1. Usuario sube Excel/CSV → `/runs/new`
2. Fichero se guarda en Supabase Storage
3. Se crea un registro en `runs` (status: pending)
4. API route procesa cada contacto via ProxyCurl
5. Resultados se guardan en `contacts`
6. Usuario visualiza y descarga resultados desde `/runs/[id]`
