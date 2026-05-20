# Manual de usuario — championfinder

Última actualización: 2026-05-19

## ¿Qué es championfinder?

championfinder te permite subir un listado de contactos de LinkedIn y detectar automáticamente cuáles han cambiado de empresa desde que los registraste.

---

## Cómo empezar

### 1. Crear una cuenta

1. Accede a la aplicación y haz clic en **Regístrate**.
2. Introduce tu email y una contraseña (mínimo 6 caracteres).
3. Revisa tu bandeja de entrada y confirma el email.
4. Ya puedes iniciar sesión.

---

## Crear una nueva ejecución

### Formato del fichero

El fichero debe ser `.xlsx` (Excel) o `.csv` con las siguientes columnas:

| Columna | Descripción |
|---|---|
| `id_contacto` | Identificador único del contacto |
| `nombre` | Nombre |
| `apellidos` | Apellidos |
| `linkedin_url` | URL completa del perfil de LinkedIn |
| `empresa_actual` | Empresa en la que trabaja actualmente (según tus registros) |

> **Nota:** El fichero puede tener columnas adicionales, pero las cinco anteriores son obligatorias. Los nombres de columna deben coincidir exactamente (sin mayúsculas).

> **Límite:** Se procesarán un máximo de 100 contactos por ejecución.

### Pasos

1. Desde el panel principal, haz clic en **Nueva ejecución**.
2. Arrastra tu fichero a la zona indicada, o haz clic para seleccionarlo.
3. Revisa la previsualización de los primeros contactos.
4. Si todo es correcto, haz clic en **Confirmar y lanzar procesamiento**.
5. Serás redirigido a la página de resultados de la ejecución.

### Errores comunes

| Error | Causa | Solución |
|---|---|---|
| "Faltan columnas obligatorias" | El fichero no tiene alguna de las columnas requeridas | Revisa que los nombres de columna son exactos |
| "Solo se aceptan .xlsx o .csv" | Formato de fichero incorrecto | Exporta el fichero en el formato correcto |
| "El fichero está vacío" | No hay filas de datos | Asegúrate de que el fichero tiene datos |
