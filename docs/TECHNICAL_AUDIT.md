# Auditoría técnica y funcional SERCOPREV

**Repositorio:** `ageyssel/sercoprev-web`  
**Base productiva:** `main`  
**Reconstrucción:** `feature/platform-redesign-operational-core`  
**Pull request:** `#10`  
**Fecha:** 22 de julio de 2026

## Resumen ejecutivo

SERCOPREV fue recuperado inicialmente desde un estado con Supabase pausado, ausencia de esquema versionado, controles administrativos insuficientes y un Worker incompatible con el plan Free de Cloudflare. Esa etapa dejó autenticación, RLS, Storage privado, despliegue atómico, health check y CI en condiciones operativas.

La segunda auditoría detectó una brecha de producto: la aplicación funcionaba como un sitio institucional y repositorio documental, pero no como una plataforma contable. La administración solo creaba clientes e importaba registros; el portal no mostraba la información financiera importada y no existían obligaciones, tareas, solicitudes, cobranza, contactos, consultas ni pipeline comercial estructurado.

La rama de reconstrucción convierte el sistema en una plataforma operacional multiempresa con:

- landing orientada a conversión;
- CRM básico de prospectos;
- cartera de clientes y ficha 360°;
- obligaciones, tareas y solicitudes documentales;
- carga segura de documentos desde administración y clientes;
- servicios contratados;
- honorarios y cobranza;
- consultas con historial de mensajes;
- información financiera visible para el cliente;
- auditoría de acciones;
- RLS y aislamiento por empresa.

## Evaluación comparativa

| Área | Estado anterior | Estado reconstruido |
|---|---|---|
| Landing | Institucional, CTA único y contenidos simulados | Propuesta comercial, servicios, método, FAQ y formulario de leads |
| Navegación móvil | Incompleta | Menú responsivo y accesible |
| Administración | Una página con alta, importación y tabla | App shell, dashboard, cartera y módulos especializados |
| Cliente | Carpeta de documentos | Panel con obligaciones, solicitudes, finanzas, documentos, honorarios y consultas |
| Datos | Tres tablas genéricas | Modelo operacional separado por entidad |
| Documentos | Solo lectura del cliente | Carga administrativa, respuesta del cliente, metadatos y solicitud asociada |
| Comunicación | Fuera de la plataforma | Tickets y mensajes vinculados a la empresa |
| Cobranza | Sin módulo | Cartola de honorarios y estados de pago |
| Comercial | WhatsApp sin registro | Leads desde landing y pipeline administrable |
| Auditoría | Logs parciales | Eventos estructurados por actor, empresa y entidad |

## Arquitectura funcional

### Sitio público

| Ruta | Función |
|---|---|
| `/` | Landing comercial, servicios, método, FAQ y formulario de evaluación |
| `/login` | Acceso seguro de clientes y administración |
| `/privacidad` | Política de privacidad |
| `/terminos` | Condiciones de uso |
| `/sitemap.xml` | Indexación de rutas públicas |
| `/robots.txt` | Exclusión de administración, portal y API |

### Administración

| Ruta | Función |
|---|---|
| `/admin` | Indicadores de cartera, vencimientos, tareas, leads y alertas |
| `/admin/clientes` | Búsqueda, filtros y alta de clientes |
| `/admin/clientes/[id]` | Ficha 360° operacional |
| `/admin/clientes/[id]/gestion` | Contactos, honorarios y consultas de la empresa |
| `/admin/operaciones` | Obligaciones, tareas y solicitudes de toda la cartera |
| `/admin/importaciones` | Importación CSV estructurada |
| `/admin/cobranza` | Honorarios pendientes, vencidos y pagados |
| `/admin/tickets` | Consultas y respuestas de clientes |
| `/admin/leads` | Pipeline comercial |

### Portal de clientes

| Ruta | Función |
|---|---|
| `/dashboard` | Resumen, obligaciones, solicitudes, finanzas, servicios y documentos |
| `/dashboard/cobranza` | Estado de honorarios |
| `/dashboard/consultas` | Creación de consultas e historial de mensajes |
| `/cuenta/cambiar-clave` | Rotación obligatoria de contraseña temporal |

## Modelo de datos

### Esquema inicial

- `empresas`
- `documentos`
- `datos_empresa`
- bucket privado `documentos`

### Esquema operacional

- `leads`
- `servicios_contratados`
- `obligaciones`
- `tareas`
- `solicitudes_documentos`
- `auditoria_eventos`
- `honorarios`
- `tickets`
- `ticket_mensajes`
- `contactos_empresa`

La tabla `empresas` se amplía con información societaria, tributaria, geográfica, responsables, estado de servicio, plan, honorarios y actividad reciente.

## Migraciones

Orden obligatorio:

```text
202607210001_initial_secure_schema.sql
202607220001_operational_platform.sql
202607220002_operational_trigger_fix.sql
202607220003_billing_support.sql
```

La aplicación no debe desplegarse antes de aplicar y verificar las tres migraciones operativas. El health check consulta explícitamente las nuevas columnas y tablas, por lo que un despliegue con esquema incompleto queda reportado como `degraded` y falla la verificación productiva.

## Autorización y RLS

- Las rutas privadas verifican sesión mediante Supabase Auth.
- El layout administrativo comprueba `es_admin`.
- Cada Server Action administrativa vuelve a ejecutar `requireAdmin()`.
- Los clientes solo pueden leer filas vinculadas a `private.current_empresa_id()`.
- La clave privada de Supabase solo se utiliza en servidor.
- Las tablas operativas revocan escritura directa a `authenticated`.
- Las mutaciones se ejecutan con autorización de servidor y registran auditoría.
- Los documentos se almacenan en rutas encabezadas por UUID de empresa.

## Seguridad documental

- Bucket privado.
- Formatos permitidos: PDF, Excel, CSV, JPEG y PNG.
- Máximo 7 MB desde la plataforma.
- Server Actions limitadas a 8 MB.
- Nombre sanitizado y ruta aleatoria.
- Metadatos separados del nombre físico.
- URL firmada durante 15 minutos.
- Rollback del archivo cuando falla la inserción de metadatos.
- Respuestas del cliente vinculadas a la solicitud correspondiente.

## Validaciones de negocio

- RUT chileno en altas iniciales.
- UUID en operaciones sensibles.
- correos y teléfonos normalizados;
- estados restringidos por listas permitidas y constraints;
- montos finitos y acotados;
- fechas ISO verificadas;
- categorías documentales restringidas;
- máximo 500 filas y 2 MB en importaciones;
- honeypot y deduplicación temporal de leads;
- cierre de tickets impide nuevas respuestas del cliente;
- respuesta del cliente puede reabrir un ticket resuelto;
- cambio a honorario pagado registra fecha de pago.

## UX y accesibilidad

- navegación móvil y escritorio;
- foco visible;
- etiquetas asociadas a campos;
- estados con texto además de color;
- reducción de movimiento según preferencia del sistema;
- mensajes con `aria-live` o `role=status`;
- tablas con scroll horizontal controlado;
- layouts responsivos;
- eliminación de testimonios simulados y enlaces de video genéricos;
- navegación persistente del portal de clientes.

## CI y Cloudflare

El workflow `Validate` ejecuta:

1. instalación reproducible;
2. ESLint;
3. TypeScript;
4. build OpenNext con Webpack;
5. `wrangler deploy --dry-run`;
6. límite de 3000 KiB comprimidos;
7. ejecución en `workerd`;
8. pruebas de landing, login, privacidad, términos, sitemap y health.

La reconstrucción completa, incluidos honorarios y consultas, superó lint, TypeScript, build OpenNext, límite del plan Free y smoke tests en `workerd` en el PR #10.

El despliegue productivo utiliza una versión atómica de código y `SUPABASE_SECRET_KEY` mediante `--secrets-file`, preservando las demás variables runtime.

## Riesgos residuales y controles

| Riesgo | Control aplicado | Pendiente operativo |
|---|---|---|
| Desplegar interfaz antes del esquema | Health check de esquema | Aplicar migraciones antes del merge |
| Error humano al seleccionar cliente | Ficha identificada por razón social y RUT | Capacitación y revisión previa |
| Archivos equivocados | Categoría, periodo, descripción y auditoría | Procedimiento interno de doble revisión |
| Consultas urgentes sin respuesta | Prioridad y dashboard | Definir SLA interno |
| Cobranza desactualizada | Estados y fecha de pago | Conciliación periódica |
| Exceso de privilegios de la clave privada | Solo servidor y GitHub Secret | Rotación periódica |
| Pérdida de trazabilidad | `auditoria_eventos` | Definir política de conservación |

## Checklist de liberación

### Código

- [x] Landing reconstruida.
- [x] Administración reconstruida.
- [x] Portal de clientes reconstruido.
- [x] Honorarios y cobranza.
- [x] Consultas e historial.
- [x] Contactos empresariales.
- [x] Documentación operativa.
- [x] Lint.
- [x] TypeScript.
- [x] Build OpenNext.
- [x] Límite Cloudflare Free.
- [x] Smoke tests públicos en `workerd`.

### Supabase

- [ ] Aplicar `202607220001_operational_platform.sql`.
- [ ] Aplicar `202607220002_operational_trigger_fix.sql`.
- [ ] Aplicar `202607220003_billing_support.sql`.
- [ ] Verificar columnas ampliadas de `empresas`.
- [ ] Verificar RLS de todas las tablas nuevas.
- [ ] Confirmar health `operationalSchema=true`.

### Producción

- [ ] Fusionar PR #10 después de la migración.
- [ ] Confirmar despliegue atómico de Cloudflare.
- [ ] Verificar `/`, `/login` y `/api/health`.
- [ ] Probar login administrador.
- [ ] Probar alta y ficha de cliente.
- [ ] Probar respuesta documental desde cuenta cliente.
- [ ] Probar consulta cliente-administración.
- [ ] Probar honorario visible en ambos portales.
- [ ] Probar aislamiento entre dos empresas.

## Conclusión

La reconstrucción resuelve la brecha entre un portal documental y una plataforma de trabajo contable. La base técnica está validada y el diseño funcional cubre captación, incorporación, operación mensual, documentos, comunicación y cobranza. La liberación queda condicionada exclusivamente a aplicar y verificar el esquema operacional en Supabase y completar las pruebas autenticadas de producción.
