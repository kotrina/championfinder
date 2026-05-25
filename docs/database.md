# Base de datos — championfinder

## Tablas

### `runs`

Historial de ejecuciones de procesamiento.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador único |
| `created_at` | timestamptz | Fecha de creación |
| `user_id` | uuid FK → auth.users | Propietario |
| `filename` | text | Nombre del fichero subido |
| `status` | run_status | Estado: pending / processing / done / error |
| `total_contacts` | integer | Total de contactos en el fichero |
| `changed_count` | integer | Contactos que han cambiado de empresa |
| `error_count` | integer | Contactos que no se pudieron consultar |

### `contacts`

Contactos procesados dentro de una ejecución.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador único |
| `created_at` | timestamptz | Fecha de creación |
| `run_id` | uuid FK → runs | Ejecución a la que pertenece |
| `contact_id` | text | ID del contacto en el fichero original |
| `nombre` | text | Nombre |
| `apellidos` | text | Apellidos |
| `linkedin_url` | text | URL del perfil de LinkedIn |
| `empresa_original` | text | Empresa registrada en el fichero |
| `empresa_actual` | text null | Empresa actual según LinkedIn (null = no cambio) |
| `changed` | boolean | true si ha cambiado de empresa |
| `error` | text null | Mensaje de error si no se pudo consultar |

## Enum

- `run_status`: `pending` | `processing` | `done` | `error`

## RLS

- `runs`: cada usuario solo accede a sus propias ejecuciones (`auth.uid() = user_id`)
- `contacts`: acceso solo si el `run` relacionado pertenece al usuario

## Storage

- Bucket: `uploads` (privado)
- Estructura de path: `{user_id}/{run_id}/{filename}`
- Políticas: solo el propietario puede subir, leer y eliminar sus ficheros

## Migraciones

| Fichero | Descripción |
|---|---|
| `001_initial_schema.sql` | Tablas `runs` y `contacts` con RLS |
| `002_storage_bucket.sql` | Bucket `uploads` con políticas de acceso |
