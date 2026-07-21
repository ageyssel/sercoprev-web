# Auditoría técnica SERCOPREV Web

**Repositorio:** `ageyssel/sercoprev-web`  
**Rama auditada:** `main`  
**Rama corregida:** `agent/supabase-security-hardening`  
**Fecha:** 21 de julio de 2026

## Resumen ejecutivo

La aplicación tenía una base funcional pequeña, pero dependía de un proyecto Supabase pausado e inaccesible y no versionaba el esquema, las políticas RLS ni Storage. La mayor exposición estaba en dos operaciones administrativas: creación de usuarios con credencial privilegiada e importación financiera directa desde el navegador.

La rama corregida reconstruye el backend como infraestructura versionada, agrega autorización dentro de cada operación sensible, aísla datos y archivos por empresa, mejora sesiones y contraseñas, actualiza la dependencia de planillas y añade validación automática.

## Fase 1 — Inventario y mapeo

| Módulo | Función |
|---|---|
| `app/page.tsx` | Sitio público corporativo |
| `app/login/*` | Inicio de sesión con Supabase Auth |
| `app/dashboard/*` | Portal privado de empresa y documentos |
| `app/admin/*` | Alta de clientes, directorio e importación financiera |
| `app/cuenta/cambiar-clave/*` | Cambio obligatorio de contraseña temporal |
| `utils/supabase/client.ts` | Cliente Supabase para navegador |
| `utils/supabase/server.ts` | Cliente Supabase SSR y cookies |
| `utils/supabase/admin.ts` | Cliente privilegiado exclusivo del servidor |
| `utils/supabase/config.ts` | Validación centralizada de variables |
| `proxy.ts` | Renovación de sesión y protección de rutas |
| `supabase/migrations/*` | Esquema, índices, RLS y Storage reproducibles |
| `supabase/bootstrap_admin.sql` | Alta controlada del primer administrador |
| `next.config.ts` | Next.js, imágenes, Server Actions y cabeceras |
| `wrangler.toml` / `open-next.config.ts` | Despliegue en Cloudflare mediante OpenNext |
| `.github/workflows/ci.yml` | Lint, TypeScript y build por commit/PR |

### Stack real

- Next.js 16.2.2 y React 19.2.4
- TypeScript y Tailwind CSS 4
- Supabase Auth, Postgres, RLS y Storage
- Resend
- SheetJS 0.20.3
- OpenNext, Cloudflare Workers y Wrangler
- Integración de preview actualmente conectada también a Vercel

## Fases 2–6 — Hallazgos

| # | Área | Hallazgo | Severidad | Impacto | Acción aplicada |
|---:|---|---|---|---|---|
| 1 | Disponibilidad | Proyecto Supabase anterior pausado e inaccesible | CRÍTICO | Login, datos y documentos fuera de servicio | Preparado proyecto nuevo y reconstrucción reproducible |
| 2 | Autorización | `crearCliente` utilizaba privilegios administrativos sin comprobar que el invocador fuera administrador | CRÍTICO | Creación arbitraria de usuarios y empresas | `requireAdmin()` dentro de cada Server Action sensible |
| 3 | Base de datos | No existían migraciones ni políticas RLS verificables en GitHub | CRÍTICO | Riesgo de lectura/escritura cruzada entre empresas | Migración completa con RLS forzado, grants mínimos y funciones privadas |
| 4 | Importación | El navegador insertaba directamente en `datos_empresa` y aceptaba filas sin validación de servidor | CRÍTICO | Alteración de datos de otra empresa y datos corruptos | Importación trasladada a Server Action autorizada y validada |
| 5 | Secretos | La clave privilegiada dependía de una variable legacy sin separación formal del cliente | ALTO | Exposición accidental o uso indebido | Cliente admin independiente; `SUPABASE_SECRET_KEY` solo servidor |
| 6 | Contraseñas | Contraseña temporal visible, mínimo de seis caracteres y sin rotación obligatoria | ALTO | Toma de cuentas | 12+ caracteres complejos, campo password y cambio obligatorio inicial |
| 7 | Dependencias | `xlsx` 0.18.5 procesaba archivos no confiables con vulnerabilidades conocidas | ALTO | Prototype pollution y denegación de servicio | Actualizada a distribución oficial SheetJS 0.20.3 y lockfile sincronizado |
| 8 | Storage | Bucket, rutas y políticas no estaban versionados | ALTO | Descarga cruzada o exposición de archivos | Bucket privado, carpeta por UUID de empresa y políticas de aislamiento |
| 9 | Sesiones | No existía capa central de renovación/protección de rutas | ALTO | Accesos inconsistentes y rutas protegidas sin filtro temprano | `proxy.ts` para sesión y rutas privadas; autorización se repite en servidor |
| 10 | Validación | RUT, email, UUID, categorías, montos y filas no tenían validación suficiente | ALTO | Registros inválidos, duplicados y abuso | Normalización, límites, allowlists y validación de cada fila |
| 11 | Consistencia | Si fallaba `empresas.insert`, el usuario Auth quedaba huérfano | MEDIO | Cuentas incompletas y soporte manual | Rollback automático del usuario Auth |
| 12 | Documentos | Metadatos y ruta de Storage se confundían; enlaces duraban 60 minutos | MEDIO | Descargas fallidas y ventana de exposición mayor | `nombre_original` separado de `storage_path`; URL firmada de 15 minutos |
| 13 | Configuración | Variables faltantes se convertían en cadenas vacías | MEDIO | Errores difíciles de detectar y clientes inválidos | Validación central y fallo explícito de configuración |
| 14 | Seguridad web | Sin CSP, HSTS, protección de framing ni política de permisos | MEDIO | Mayor superficie XSS/clickjacking | Cabeceras de seguridad en todas las rutas |
| 15 | Server Actions | Sin límite explícito de cuerpo ni orígenes permitidos | MEDIO | Solicitudes excesivas o desde orígenes no previstos | 2 MB y allowlist de dominios |
| 16 | UX | El importador terminaba el estado de carga antes de finalizar `FileReader` | MEDIO | Doble envío y feedback incorrecto | Flujo `async/await`, estado persistente y mensajes accesibles |
| 17 | Accesibilidad | Etiquetas, estados y semántica incompletos | MEDIO | Fricción para teclado y lectores de pantalla | `label`, `role`, `aria-live`, encabezados y enlaces semánticos |
| 18 | Mantenibilidad | Código repetido en servicios, videos y testimonios | BAJO | Cambios costosos e inconsistencias | Componentes reutilizables en la portada |
| 19 | Documentación | README genérico de Vercel pese a despliegue Cloudflare | BAJO | Configuración incorrecta por operadores | README y guía Supabase reemplazados |
| 20 | Calidad | No había CI para lint, tipos y build | MEDIO | Regresiones sin detectar | Workflow de GitHub Actions con acciones fijadas por SHA |

## Fase 7 — Archivos corregidos

### Backend y seguridad

- `supabase/migrations/202607210001_initial_secure_schema.sql`
- `supabase/bootstrap_admin.sql`
- `utils/supabase/admin.ts`
- `utils/supabase/config.ts`
- `utils/supabase/client.ts`
- `utils/supabase/server.ts`
- `proxy.ts`
- `next.config.ts`

### Autenticación y autorización

- `app/login/actions.ts`
- `app/admin/actions.ts`
- `app/cuenta/cambiar-clave/actions.ts`
- `app/cuenta/cambiar-clave/page.tsx`
- `app/cuenta/cambiar-clave/ChangePasswordForm.tsx`

### Producto, UX y accesibilidad

- `app/admin/page.tsx`
- `app/admin/components/CreateClientForm.tsx`
- `app/admin/components/DataImporter.tsx`
- `app/dashboard/page.tsx`
- `app/page.tsx`

### Calidad y operación

- `package.json`
- `package-lock.json`
- `eslint.config.mjs`
- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/SUPABASE_SETUP.md`

## Fase 8 — Checklist post-cambios

### Supabase

- [ ] Ejecutar la migración completa en el proyecto `kxrxlygnhukfmdgqhoaz`.
- [ ] Verificar existencia de `empresas`, `documentos` y `datos_empresa`.
- [ ] Verificar RLS habilitado y forzado en las tres tablas.
- [ ] Confirmar que el bucket `documentos` es privado.
- [ ] Crear usuario administrador en Auth.
- [ ] Ejecutar `supabase/bootstrap_admin.sql` con los datos correctos.
- [ ] Desactivar registro público de usuarios.
- [ ] Configurar Site URL y redirect URLs.

### Cloudflare

- [ ] Agregar `NEXT_PUBLIC_SUPABASE_URL` durante build.
- [ ] Agregar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` durante build.
- [ ] Agregar `SUPABASE_SECRET_KEY` como secreto runtime.
- [ ] Agregar `APP_BASE_URL=https://www.sercoprev.cl`.
- [ ] Configurar Resend solo si el dominio remitente está verificado.
- [ ] Ejecutar build OpenNext y desplegar primero en staging/preview.

### Pruebas funcionales

- [ ] Login administrador correcto.
- [ ] Usuario anónimo no puede abrir `/admin` ni `/dashboard`.
- [ ] Usuario cliente no puede abrir `/admin`.
- [ ] Alta de cliente crea Auth + empresa de forma atómica.
- [ ] RUT duplicado es rechazado sin dejar usuario huérfano.
- [ ] Cliente nuevo debe cambiar contraseña antes del dashboard.
- [ ] Importación válida carga hasta 500 filas.
- [ ] Archivo vacío, excesivo o mal formado es rechazado.
- [ ] Cliente A no puede consultar datos de Cliente B.
- [ ] Cliente A no puede generar URL de archivo de Cliente B.
- [ ] URL firmada expira después de 15 minutos.
- [ ] Cierre de sesión elimina el acceso a rutas privadas.

### Validación automatizada

- [x] Instalación reproducible desde lockfile.
- [x] ESLint.
- [x] TypeScript `--noEmit`.
- [x] Build Next.js.
- [x] Preview Vercel del PR.

## Pendientes que requieren acceso humano

1. Ejecutar SQL dentro del panel del nuevo Supabase.
2. Crear el administrador inicial con un correo y RUT reales.
3. Guardar la clave `sb_secret_...` directamente en Cloudflare.
4. Vincular un dominio o subdominio de staging si se desea separación formal.
5. Cargar o recuperar los datos y documentos históricos, si se obtiene respaldo del proyecto antiguo.
6. Hacer la validación cruzada con dos empresas reales de prueba antes de cambiar producción.
