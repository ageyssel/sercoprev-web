# Auditoría técnica SERCOPREV Web

**Repositorio:** `ageyssel/sercoprev-web`  
**Rama auditada:** `main`  
**Ramas corregidas:** `agent/supabase-security-hardening` y `hotfix/cloudflare-free-size`  
**Fecha:** 21 de julio de 2026

## Resumen ejecutivo

La aplicación dependía de un proyecto Supabase pausado, no versionaba el esquema ni las políticas RLS y exponía operaciones administrativas con controles insuficientes. Durante la recuperación también se detectaron dos incidentes de Cloudflare: una incompatibilidad entre OpenNext y Node Middleware, y un Worker comprimido de 4,07 MiB que superaba el límite de 3 MiB del plan Free.

La solución reconstruye Supabase mediante migraciones, aplica autorización y aislamiento por empresa, corrige el runtime Cloudflare y reduce el Worker a **1.212,32 KiB comprimidos**. La importación administrativa se mantiene mediante CSV UTF-8 compatible con Excel, sin incorporar una biblioteca pesada de planillas al Worker.

## Inventario funcional

| Módulo | Función |
|---|---|
| `app/page.tsx` | Sitio público corporativo |
| `app/login/*` | Inicio de sesión con Supabase Auth |
| `app/dashboard/*` | Portal privado de empresa y documentos |
| `app/admin/*` | Alta de clientes, directorio e importación financiera |
| `app/cuenta/cambiar-clave/*` | Cambio obligatorio de contraseña temporal |
| `utils/supabase/*` | Clientes público, SSR y administrativo de Supabase |
| `middleware.ts` | Renovación de sesión y protección temprana de rutas |
| `supabase/migrations/*` | Esquema, índices, RLS y Storage reproducibles |
| `supabase/bootstrap_admin.sql` | Alta controlada del primer administrador |
| `open-next.config.ts` / `wrangler.toml` | Adaptación y despliegue en Cloudflare |
| `.github/workflows/ci.yml` | Calidad, tamaño del Worker y smoke test |

### Stack corregido

- Next.js 16.2.9 y React 19.2.4
- TypeScript y Tailwind CSS 4
- Supabase Auth, Postgres, RLS y Storage
- Resend mediante llamada HTTPS directa
- OpenNext Cloudflare 1.19.11 y Wrangler
- Webpack para el build de producción
- CSV UTF-8 compatible con Excel para importaciones

## Hallazgos y correcciones

| # | Área | Hallazgo | Severidad | Acción aplicada |
|---:|---|---|---|---|
| 1 | Disponibilidad | Supabase anterior pausado e inaccesible | CRÍTICO | Proyecto nuevo y reconstrucción versionada |
| 2 | Autorización | Acciones administrativas sin validar al actor dentro de cada operación | CRÍTICO | `requireAdmin()` antes de usar privilegios elevados |
| 3 | Base de datos | Sin migraciones ni RLS verificable | CRÍTICO | Migración completa, grants mínimos y RLS forzado |
| 4 | Importación | Escritura directa desde el navegador | CRÍTICO | Server Action autorizada y validación fila por fila |
| 5 | Runtime | `proxy.ts` se compilaba como Node Middleware no admitido | CRÍTICO | Edge `middleware.ts` y configuración oficial OpenNext |
| 6 | Tamaño Worker | Bundle de 4,07 MiB excedía el plan Free | CRÍTICO | Webpack, retiro de SDKs pesados, eliminación de artefactos y favicon sobredimensionado |
| 7 | Repositorio | `.open-next` estaba versionado con 1.093 archivos generados | ALTO | Eliminación completa y protección mediante `.gitignore` |
| 8 | Favicon | `app/favicon.ico` generaba una ruta de 3,27 MiB | ALTO | Retirado; se usa `public/logo.png` como icono estático |
| 9 | Dependencias | `xlsx` antiguo era vulnerable y su reemplazo seguía inflando el Worker | ALTO | Eliminado; importador CSV nativo sin dependencia |
| 10 | Contraseñas | Contraseña temporal débil y sin rotación | ALTO | 12+ caracteres complejos y cambio obligatorio |
| 11 | Storage | Bucket y políticas no versionados | ALTO | Bucket privado y aislamiento por UUID de empresa |
| 12 | Validación | RUT, UUID, montos, categorías y filas insuficientemente validados | ALTO | Normalización, límites y listas permitidas |
| 13 | Consistencia | Usuario Auth podía quedar huérfano | MEDIO | Rollback automático cuando falla la empresa |
| 14 | Documentos | Ruta y nombre confundidos; enlaces de larga duración | MEDIO | Metadatos separados y URL firmada de 15 minutos |
| 15 | Seguridad web | Faltaban CSP, HSTS y anti-framing | MEDIO | Cabeceras de seguridad globales |
| 16 | CI/CD | Solo se validaba `next build` | MEDIO | Build OpenNext, límite de 3000 KiB y HTTP 200 en `workerd` |

## Importación CSV

El panel administrativo genera una plantilla CSV con BOM UTF-8 y separador punto y coma, compatible con Excel en español. El cliente valida la estructura antes del envío y el servidor vuelve a comprobar autorización, empresa, categoría y cada fila.

Controles:

- columnas obligatorias: `periodo`, `descripcion`, `monto`, `estado`;
- máximo 500 registros;
- máximo 2 MB;
- soporte para campos entre comillas y comillas escapadas;
- delimitador punto y coma o coma;
- inserción por lotes desde servidor;
- ninguna escritura administrativa directa desde el navegador.

## Validación automatizada

La ejecución final exige:

- instalación desde `package-lock.json`;
- ESLint;
- TypeScript `--noEmit`;
- build OpenNext con Webpack;
- `wrangler deploy --dry-run`;
- Worker comprimido inferior a 3000 KiB;
- inicio dentro de `workerd`;
- `GET /` con HTTP 200 y contenido SERCOPREV.

### Resultado medido

```text
Total Upload: 5868.53 KiB
gzip: 1212.32 KiB
Límite CI: 3000 KiB
Límite Cloudflare Free: 3 MiB
```

## Archivos principales corregidos

- `supabase/migrations/202607210001_initial_secure_schema.sql`
- `supabase/bootstrap_admin.sql`
- `utils/supabase/admin.ts`
- `utils/supabase/config.ts`
- `utils/supabase/server.ts`
- `utils/supabase/client.ts`
- `middleware.ts`
- `app/admin/actions.ts`
- `app/admin/components/DataImporter.tsx`
- `components/SimpleIcon.tsx`
- `app/layout.tsx`
- `next.config.ts`
- `open-next.config.ts`
- `wrangler.toml`
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `.gitignore`

## Checklist operativo pendiente

### Supabase

- [ ] Confirmar ejecución de la migración en `kxrxlygnhukfmdgqhoaz`.
- [ ] Verificar `empresas`, `documentos` y `datos_empresa`.
- [ ] Confirmar RLS y bucket privado `documentos`.
- [ ] Crear y asociar el administrador inicial.
- [ ] Configurar Site URL y redirect URLs.

### Cloudflare

- [x] Variables públicas de Supabase y `APP_BASE_URL` configuradas.
- [ ] Confirmar `SUPABASE_SECRET_KEY` como secreto runtime.
- [x] Build OpenNext compatible con el plan Free.
- [x] Tamaño comprimido validado automáticamente.
- [x] Smoke test HTTP 200 en `workerd`.
- [ ] Fusionar el PR únicamente con autorización específica.
- [ ] Verificar el nuevo Active Deployment después del merge.

### Pruebas funcionales

- [ ] Login administrador.
- [ ] Redirección de anónimos desde rutas privadas.
- [ ] Alta de cliente y cambio obligatorio de contraseña.
- [ ] Importación CSV válida y rechazo de archivos inválidos.
- [ ] Aislamiento cruzado entre dos empresas.
- [ ] Lectura de documentos propios y expiración de URLs firmadas.
