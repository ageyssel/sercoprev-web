# SERCOPREV Web

Portal corporativo y área privada de clientes de SERCOPREV.

## Stack

- Next.js 16 y React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RLS y Storage
- API HTTPS de Resend para correos transaccionales opcionales
- OpenNext y Cloudflare Workers

## Módulos

- Sitio público corporativo
- Login de clientes y administración
- Panel administrativo
- Alta controlada de clientes
- Importación de datos mediante CSV UTF-8 compatible con Excel
- Portal privado de documentos
- Cambio obligatorio de contraseña temporal

## Configuración local

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Variables obligatorias:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
APP_BASE_URL
```

Variables opcionales:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Nunca agregue `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, contraseñas o tokens personales al repositorio.

## Supabase

La base se reconstruye desde:

```text
supabase/migrations/202607210001_initial_secure_schema.sql
```

El procedimiento completo está en:

```text
docs/SUPABASE_SETUP.md
```

Todas las tablas expuestas utilizan RLS. Las mutaciones administrativas se ejecutan en Server Actions que vuelven a autenticar y autorizar al administrador antes de utilizar la clave privilegiada.

## Importación administrativa

El panel entrega una plantilla `.csv` con BOM UTF-8 y separador punto y coma, compatible con Excel en español. El importador:

- exige las columnas `periodo`, `descripcion`, `monto` y `estado`;
- acepta un máximo de 500 filas y 2 MB;
- interpreta campos entre comillas y comillas escapadas;
- valida nuevamente cada registro en el servidor;
- no permite escribir directamente desde el navegador en Supabase.

## Validación

```bash
npm run lint
npm run typecheck
npm run build:cloudflare
```

El workflow de CI también:

- genera el Worker mediante OpenNext;
- mide el bundle con `wrangler deploy --dry-run`;
- rechaza bundles superiores a 3000 KiB comprimidos;
- inicia el Worker en `workerd` y exige HTTP 200 en `/` y `/login`.

El build de producción utiliza Webpack porque el bundle generado por Turbopack excedía el límite del plan Free para esta aplicación.

## Despliegue en Cloudflare

```bash
npm run deploy
```

Los secretos deben configurarse directamente en Cloudflare o mediante Wrangler:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

Los directorios `.next` y `.open-next` son artefactos generados y nunca deben versionarse.

Después de cada push a `main`, el workflow `Verify production` espera el despliegue de Cloudflare y comprueba:

- portada y login en `sercoprev.cl` y `www.sercoprev.cl`;
- cabeceras de seguridad;
- conexión administrativa real con Supabase;
- existencia del administrador inicial;
- bucket privado `documentos`.

La rama principal no debe recibir cambios directos salvo una operación de recuperación productiva expresamente autorizada. Para el trabajo normal, use ramas y pull requests revisables.
