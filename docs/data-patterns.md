# Patrones de datos — championfinder

## Flujo de procesamiento de un run

```
POST /api/runs/[id]/process
  → Marca run.status = "processing"
  → Fire-and-forget: processContacts()
  → Responde inmediatamente con { ok: true }

processContacts() (background):
  Para cada contacto:
    → lookupLinkedInProfile(linkedin_url)   # ProxyCurl API
    → companiesMatch(empresa_original, currentCompany)
    → UPDATE contacts SET empresa_actual, changed, error
    → sleep(300ms)  # rate limiting
  → UPDATE runs SET status="done", changed_count, error_count
```

## Consulta de estado (polling)

```
GET /api/runs/[id]/status
  → Devuelve: { status, total, processed, changed, errors }
  → El cliente hace polling cada 2s mientras status === "processing"
```

## ProxyCurl — extracción de empresa actual

- Endpoint: `GET https://nubela.co/proxycurl/api/v2/linkedin`
- La empresa actual es la primera experiencia sin `ends_at` (null = trabajo presente)
- Si todas tienen `ends_at`, se toma la primera (la más reciente por orden del API)
- Parámetro `use_cache=if-present` para reducir coste si el perfil ya fue consultado

## Comparación de empresas

La función `companiesMatch` normaliza los nombres antes de comparar:
- Convierte a minúsculas
- Elimina puntuación y separadores
- Elimina sufijos legales comunes: S.A., S.L., Ltd, Inc, Corp, GmbH, B.V.
- Colapsa espacios múltiples

**Ejemplos:**
- `"Acme Corp"` == `"ACME"` → true
- `"Google LLC"` == `"Google"` → true
- `"Meta Platforms"` == `"Meta"` → false (diferentes después de normalización)

## Manejo de errores por contacto

Los errores no abortan el procesamiento. Se guardan en `contacts.error`:

| Caso | Error guardado |
|---|---|
| URL de LinkedIn inválida / perfil no encontrado | "Perfil no encontrado" |
| Perfil privado | "Perfil privado o no accesible" |
| Error de red | "Error de red al contactar ProxyCurl" |
| API key no configurada | "PROXYCURL_API_KEY no configurada" |
