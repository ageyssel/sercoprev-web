# SERCOPREV Web

Plataforma corporativa, comercial y operativa de SERCOPREV para administrar clientes contables y entregar información privada a cada empresa.

## Stack

- Next.js 16 y React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RLS y Storage
- Resend mediante API HTTPS para notificaciones opcionales
- OpenNext y Cloudflare Workers
- GitHub Actions para calidad, despliegue y verificación

## Módulos públicos

- Landing comercial orientada a evaluación contable
- Servicios, método de trabajo, portal digital y preguntas frecuentes
- Formulario de prospectos con validación, honeypot y control de duplicados
- Login de administración y clientes
- Política de privacidad, términos, sitemap y robots

## Administración

- Dashboard de cartera y alertas
- Directorio con búsqueda y filtros
- Ficha 360° de cada empresa
- Datos legales, tributarios, comerciales y responsables
- Obligaciones, vencimientos y estados
- Tareas internas y prioridades
- Solicitudes documentales
- Carga y clasificación de documentos
- Servicios contratados y honorarios
- Importación CSV compatible con Excel
- Pipeline de prospectos
- Auditoría de acciones

## Portal de clientes

- Resumen del estado de la empresa
- Obligaciones y fechas de vencimiento
- Solicitudes documentales con carga de respuesta
- Información financiera importada
- Servicios contratados
- Centro documental privado con URLs firmadas
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

Nunca agregue claves privadas, contraseñas, tokens personales ni archivos `.env` al repositorio.

## Supabase

Las migraciones deben ejecutarse en orden:

```text
supabase/migrations/202607210001_initial_secure_schema.sql
supabase/migrations/202607220001_operational_platform.sql
supabase/migrations/202607220002_operational_trigger_fix.sql
```

La primera migración crea autenticación empresarial, documentos, datos financieros, Storage y RLS. Las migraciones operativas agregan clientes ampliados, leads, servicios, obligaciones, tareas, solicitudes documentales y auditoría.

Todas las tablas expuestas utilizan RLS. Las mutaciones privilegiadas se ejecutan en Server Actions que vuelven a autenticar y autorizar al administrador antes de utilizar `SUPABASE_SECRET_KEY`.

## Importación administrativa

El panel entrega una plantilla `.csv` con BOM UTF-8 y separador punto y coma, compatible con Excel en español. El importador:

- exige `periodo`, `descripcion`, `monto` y `estado`;
- acepta un máximo de 500 filas y 2 MB;
- interpreta campos entre comillas y comillas escapadas;
- valida nuevamente cada registro en el servidor;
- no permite escritura administrativa directa desde el navegador.

## Documentos

- Bucket privado `documentos`.
- Máximo 7 MB por carga desde la plataforma.
- Formatos admitidos: PDF, Excel, CSV, JPEG y PNG.
- Rutas separadas por UUID de empresa.
- URLs firmadas durante 15 minutos.
- Carga administrativa y respuesta del cliente a solicitudes.
- Registro de categoría, periodo, usuario, tamaño y solicitud asociada.

## Validación

```bash
npm run lint
npm run typecheck
npm run build:cloudflare
```

El workflow `Validate` también:

- genera el Worker mediante OpenNext;
- mide el bundle con `wrangler deploy --dry-run`;
- rechaza bundles superiores a 3000 KiB comprimidos;
- inicia el Worker en `workerd`;
- valida landing, login, privacidad, términos, sitemap y health check.

El build de producción utiliza Webpack porque mantiene el Worker dentro del límite del plan Free para esta aplicación.

## Health check

```text
GET /api/health
```

Comprueba sin revelar valores:

- configuración pública de Supabase;
- URL de la aplicación;
- acceso administrativo a la base;
- esquema operativo completo;
- administrador inicial;
- bucket privado de documentos.

## Despliegue en Cloudflare

Cada push a `main` ejecuta `.github/workflows/deploy-cloudflare.yml`:

1. valida `CLOUDFLARE_API_TOKEN` y `SUPABASE_SECRET_KEY`;
2. instala dependencias y construye OpenNext;
3. confirma el límite de tamaño;
4. despliega código y secreto como una sola versión mediante `--secrets-file`;
5. verifica portada, login y health HTTP 200.

Los directorios `.next` y `.open-next` son artefactos generados y nunca deben versionarse.

La rama `main` no debe recibir cambios directos. El trabajo normal utiliza ramas, pull requests, migraciones revisables y validación automatizada antes del despliegue.
