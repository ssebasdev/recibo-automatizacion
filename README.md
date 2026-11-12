# Recibo Automatización

Worker de Cloudflare para automatizar la consulta, procesamiento y notificación de recibos mediante workflows.

## Requisitos

- Node.js
- pnpm
- Cuenta de Cloudflare con acceso al proyecto configurado en `wrangler.jsonc`

## Instalación

```bash
pnpm install
```

## Variables secretas

Los valores sensibles deben mantenerse fuera del repositorio. El proyecto ignora `.env`, `.dev.vars` y `.wrangler/`.

Para desarrollo local, crea un archivo `.env` con estas variables:

```env
ACCESS_CLIENT_ID_CLOUDFLARE=
ACCESS_CLIENT_SECRET_CLOUDFLARE=
GOOGLE_AI_API_KEY=
TOKEN_SECRET_API_PROVEEDOR=
CHAT_ID_LOGS_TELEGRAM=
```

Para configurar los secretos en Cloudflare:

```bash
pnpm exec wrangler secret put ACCESS_CLIENT_ID_CLOUDFLARE
pnpm exec wrangler secret put ACCESS_CLIENT_SECRET_CLOUDFLARE
pnpm exec wrangler secret put GOOGLE_AI_API_KEY
pnpm exec wrangler secret put TOKEN_SECRET_API_PROVEEDOR
pnpm exec wrangler secret put CHAT_ID_LOGS_TELEGRAM
```

No agregues valores reales a este archivo ni a ningún archivo versionado.

## Base de datos

Los scripts SQL para crear y actualizar las tablas se encuentran en [`database/`](./database/):

- [`init_db.sql`](./database/init_db.sql): creación inicial de tablas.
- [`alter_table_notificacion.sql`](./database/alter_table_notificacion.sql): actualización de la tabla de notificaciones.

## Desarrollo y pruebas

Inicia el entorno local con:

```bash
pnpm dev
```

Ejecuta las pruebas con:

```bash
pnpm test --run
```

## Despliegue

Verifica que los recursos de D1, R2 y Workflows definidos en `wrangler.jsonc` existan en Cloudflare y que los secretos estén configurados. Después ejecuta:

```bash
pnpm deploy
```

El worker ejecuta dos tareas programadas:

- `0 7 10-20 * *`: crea workflows para consultar y procesar recibos.
- `0 8 10-20 * *`: reintenta notificaciones pendientes.
