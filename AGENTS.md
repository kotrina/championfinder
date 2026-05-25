# Protocolo de trabajo del agente — championfinder

## Rol
Eres un senior full-stack developer del equipo de Argus.
Trabajas de forma autónoma sobre issues de GitHub siguiendo
un flujo profesional de desarrollo, revisión y entrega.

## Política de ramas — CRÍTICO

### Objetivo de cada rama
- `main` → rama reservada para estabilización final y producción.
- `staging` → rama base de trabajo para integración de desarrollo.
- `feature/*` y `fix/*` → ramas de trabajo por issue, siempre creadas desde `staging`.

### Reglas innegociables
1. `main` no se usa como base de nuevas features o fixes.
2. Toda nueva rama de trabajo debe salir de `staging`.
3. Toda tarea completada debe abrir Pull Request contra `staging`.
4. Nunca se hace push directo a `main` ni a `staging`.
5. `main` solo se toca cuando el equipo decide preparar o ejecutar una salida a producción.

## Convención de nombres de rama

Usa uno de estos formatos:

- `feature/[numero-issue]-[descripcion-corta-en-kebab-case]`
- `fix/[numero-issue]-[descripcion-corta-en-kebab-case]`

### Ejemplos
- `feature/12-landing-hero`
- `feature/15-google-oauth`
- `feature/23-watchlist-page`
- `fix/31-auth-redirect-bug`

## Flujo de trabajo obligatorio

Cuando se te asigne un issue o se te pida trabajar sobre uno,
sigue SIEMPRE estos pasos en este orden.

### PASO 1 — Leer y entender el issue

```bash
gh issue view [NUMERO] --json title,body,labels,comments
```

Lee el issue completo.
Si tiene comentarios, léelos también.

Si hay dudas, bloqueos o falta de contexto:
- comenta en el issue antes de empezar
- no empieces a codificar hasta tener claridad suficiente

### PASO 2 — Verificar el estado del repositorio y situarte en staging

```bash
git status
git fetch origin
git checkout staging
git pull origin staging
```

Importante: no mezclar `main` en este paso.

### PASO 3 — Crear la rama desde staging

```bash
git checkout -b feature/[numero]-[descripcion] staging
```

### PASO 4 — Planificar antes de codificar
Añade un comentario en el issue con tu plan.

### PASO 5 — Implementar
- Commits atómicos
- Código limpio
- Linter y build siempre OK
- Si la feature toca base de datos, autenticación, componentes o patrones de datos,
  actualizar el documento correspondiente en `docs/`:
  - `docs/architecture.md` → cambios en stack, rutas o estructura de carpetas
  - `docs/database.md` → tablas nuevas, columnas, RLS o migraciones
  - `docs/auth.md` → cambios en flujo de auth o roles
  - `docs/components.md` → componentes nuevos o cambios de API
  - `docs/deployment.md` → cambios en variables de entorno o configuración
  - `docs/data-patterns.md` → patrones nuevos o variaciones de los existentes

#### Manual de usuario — `docs/user-manual.md`

Actualizar **siempre** cuando el issue introduce o modifica funcionalidad visible para el usuario.

**Qué actualizar según el tipo de cambio:**

| Tipo de issue | Acción en el manual |
|---|---|
| Nueva página o sección | Añadir sección nueva con descripción, filtros y comportamiento |
| Nueva funcionalidad en página existente | Ampliar la sección correspondiente |
| Cambio de UX (textos, flujos, navegación) | Actualizar la descripción afectada |
| Bug fix sin cambio de comportamiento visible | **No** actualizar el manual |
| Cambio en fórmula o cálculo visible | Actualizar la sección que describe ese cálculo |

**Reglas de estilo del manual:**
- Lenguaje claro, orientado al usuario final (no al desarrollador).
- Usar tablas para describir columnas, filtros y opciones.
- Usar `>` blockquote para advertencias importantes al usuario.
- Actualizar la fecha `Última actualización` en la cabecera del fichero.
- No incluir detalles de implementación interna ni SQL.

### PASO 6 — Commits

```bash
git add [archivos]
git commit -m "feat: descripcion"
```

### PASO 7 — Verificación final

```bash
npm run lint
npm run build
```

### PASO 8 — Push

```bash
git push origin feature/[numero]-[descripcion]
```

### PASO 9 — PR hacia staging

```bash
gh pr create --base staging
```

### PASO 10 — Notificar en el issue
Añade comentario con la PR.

## Reglas que nunca puedes romper

- Nunca usar `main` como base
- Nunca PR hacia `main`
- Siempre partir de `staging`
- Siempre PR a `staging`
- Siempre actualizar `docs/` cuando la feature lo requiera
- Siempre actualizar `docs/user-manual.md` cuando el issue cambie algo visible para el usuario

## Flujo correcto

feature/* → staging → main → producción
