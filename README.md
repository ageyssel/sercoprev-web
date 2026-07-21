# SERCOPREV Web

Portal corporativo y área privada de clientes de SERCOPREV.

## Stack

- Next.js 16 y React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RLS y Storage
- Resend para correos transaccionales opcionales
- OpenNext y Cloudflare Workers

## Módulos

- Sitio público corporativo
- Login de clientes y administración
- Panel administrativo
- Alta controlada de clientes
- Importación de datos desde Excel
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

## Validación

```bash
npm run lint
npm run typecheck
npm run build
```

O todo junto:

```bash
npm run check
```

## Despliegue en Cloudflare

```bash
npm run deploy
```

Los secretos deben configurarse directamente en Cloudflare o mediante Wrangler:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

La rama principal no debe recibir cambios directos. Use ramas de trabajo y pull requests revisables.
