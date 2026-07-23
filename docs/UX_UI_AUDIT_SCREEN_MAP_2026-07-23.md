# Auditoría UX/UI integral y mapa de pantallas — SERCOPREV

Fecha de revisión: 23 de julio de 2026  
Fuente: archivo `capturas pantalla sercoprev.zip` con 55 capturas del portal administrativo.

## Objetivo

Este documento identifica cada captura, la vincula con su módulo y ruta funcional, registra los principales problemas visuales observados y define el criterio aplicado en la corrección integral de la plataforma.

## Mapa completo de capturas

| Nº | Hora de captura | Módulo / pantalla | Ruta principal | Segmento visual |
|---:|---|---|---|---|
| 01 | 12:36:28 | Resumen de la cartera | `/admin` | Encabezado, acciones y métricas |
| 02 | 12:36:36 | Resumen de la cartera | `/admin` | Vencimientos, tareas, prospectos y clientes con alerta |
| 03 | 12:42:55 | Clientes | `/admin/clientes` | Encabezado, filtros y directorio |
| 04 | 12:43:04 | Clientes | `/admin/clientes#nuevo` | Formulario de alta de cliente |
| 05 | 12:46:53 | Contabilidad y rentabilidad | `/admin/contabilidad` | Encabezado, selector y métricas |
| 06 | 12:50:23 | Contabilidad y rentabilidad | `/admin/contabilidad` | Accesos funcionales y control contable |
| 07 | 12:50:33 | Configuración contable | `/admin/contabilidad/configuracion` | Encabezado, métricas, plan y centros de costo |
| 08 | 12:50:41 | Configuración contable | `/admin/contabilidad/configuracion` | Formularios de plan, centros y periodos |
| 09 | 12:50:52 | Libro diario | `/admin/contabilidad/diario` | Encabezado, métricas y creación de asiento |
| 10 | 12:51:00 | Libro diario | `/admin/contabilidad/diario` | Tabla de asientos contables |
| 11 | 12:51:58 | Compras y ventas | `/admin/contabilidad/documentos` | Encabezado, filtros y métricas tributarias |
| 12 | 12:52:06 | Compras y ventas | `/admin/contabilidad/documentos` | Registro y tabla documental |
| 13 | 12:52:21 | RCV y cartolas | `/admin/contabilidad/importaciones` | Encabezado, métricas y formularios de importación |
| 14 | 12:52:30 | RCV y cartolas | `/admin/contabilidad/importaciones` | Cuenta bancaria, RCV y cartola |
| 15 | 12:52:37 | RCV y cartolas | `/admin/contabilidad/importaciones` | Conciliación, movimientos e historial |
| 16 | 12:52:48 | Reportes y rentabilidad | `/admin/contabilidad/reportes` | Encabezado, buscador, periodo y métricas |
| 17 | 12:52:57 | Reportes y rentabilidad | `/admin/contabilidad/reportes` | Balance de comprobación y estado de resultados |
| 18 | 12:53:07 | Reportes y rentabilidad | `/admin/contabilidad/reportes` | Balance clasificado, mayor y alcance legal |
| 19 | 12:58:34 | Remuneraciones | `/admin/remuneraciones` | Encabezado, selector y métricas |
| 20 | 12:58:45 | Remuneraciones | `/admin/remuneraciones` | Accesos del flujo y recomendación operativa |
| 21 | 12:58:59 | Trabajadores | `/admin/remuneraciones/trabajadores` | Encabezado, métricas y alta |
| 22 | 12:59:07 | Trabajadores | `/admin/remuneraciones/trabajadores` | Directorio laboral |
| 23 | 12:59:20 | Contratos | `/admin/remuneraciones/contratos` | Encabezado, métricas y registro |
| 24 | 12:59:27 | Contratos | `/admin/remuneraciones/contratos` | Historial contractual |
| 25 | 12:59:44 | Parámetros legales | `/admin/remuneraciones/parametros` | Consulta oficial por fecha |
| 26 | 12:59:55 | Parámetros legales | `/admin/remuneraciones/parametros` | Indicadores, topes y tasas AFP |
| 27 | 13:00:06 | Parámetros legales | `/admin/remuneraciones/parametros` | Tabla de Impuesto Único |
| 28 | 13:00:26 | Parámetros legales | `/admin/remuneraciones/parametros` | Fuentes, verificación e historial |
| 29 | 13:00:39 | Periodos y cálculo | `/admin/remuneraciones/periodos` | Apertura y listado de periodos |
| 30 | 13:00:53 | Novedades y gestión laboral | `/admin/remuneraciones/gestion` | Encabezado, métricas y conceptos base |
| 31 | 13:01:02 | Novedades y gestión laboral | `/admin/remuneraciones/gestion` | Novedad mensual y cálculo de periodo |
| 32 | 13:01:11 | Novedades y gestión laboral | `/admin/remuneraciones/gestion` | Vacaciones y licencias médicas |
| 33 | 13:01:19 | Novedades y gestión laboral | `/admin/remuneraciones/gestion` | Finiquitos y novedades recientes |
| 34 | 13:01:36 | Liquidaciones | `/admin/remuneraciones/liquidaciones` | Selector de periodo y resultados |
| 35 | 13:01:47 | Exportaciones | `/admin/remuneraciones/exportaciones` | Filtros y exportaciones internas |
| 36 | 13:01:57 | Exportaciones | `/admin/remuneraciones/exportaciones` | Exportaciones regulatorias |
| 37 | 13:02:13 | Exportaciones | `/admin/remuneraciones/exportaciones` | Alcance de archivos y validación |
| 38 | 13:02:26 | Obligaciones y tareas | `/admin/operaciones` | Obligaciones, tareas y solicitudes activas |
| 39 | 13:02:39 | Ficha 360 de cliente | `/admin/clientes/[id]` | Cabecera, identidad y métricas |
| 40 | 13:02:48 | Ficha 360 de cliente | `/admin/clientes/[id]` | Información general y responsables |
| 41 | 13:02:57 | Ficha 360 de cliente | `/admin/clientes/[id]` | Notas, guardado, obligaciones y tareas |
| 42 | 13:03:07 | Ficha 360 de cliente | `/admin/clientes/[id]` | Solicitudes documentales y servicios |
| 43 | 13:03:17 | Ficha 360 de cliente | `/admin/clientes/[id]` | Documentos y registros financieros |
| 44 | 13:03:24 | Ficha 360 de cliente | `/admin/clientes/[id]` | Continuación documental y financiera |
| 45 | 13:03:35 | Ficha 360 de cliente | `/admin/clientes/[id]` | Honorarios, contactos y consultas |
| 46 | 13:03:43 | Ficha 360 de cliente | `/admin/clientes/[id]` | Continuación de contactos y consultas |
| 47 | 13:03:52 | Carga masiva y clasificación | `/admin/documentos-masivos` | Indicadores, nuevo lote y lotes recientes |
| 48 | 13:04:00 | Carga masiva y clasificación | `/admin/documentos-masivos` | Archivos y cola de revisión |
| 49 | 13:04:10 | Honorarios y cobranza | `/admin/cobranza` | Indicadores y cartola de honorarios |
| 50 | 13:04:22 | Consultas | `/admin/tickets` | Filtro y bandeja de consultas |
| 51 | 13:04:35 | Notificaciones | `/admin/notificaciones` | Indicadores e historial de comunicaciones |
| 52 | 13:04:53 | Usuarios y accesos | `/admin/usuarios` | Indicadores y formularios de usuarios |
| 53 | 13:05:02 | Usuarios y accesos | `/admin/usuarios` | Formularios de equipo y cliente |
| 54 | 13:05:11 | Usuarios y accesos | `/admin/usuarios` | Listados de equipo y accesos de clientes |
| 55 | 13:05:25 | Usuarios y accesos | `/admin/usuarios` | Listados y advertencia de cuenta principal |

## Hallazgo crítico de navegación

Las capturas muestran que el acceso a las solicitudes recibidas desde el formulario público no estaba visible en el menú lateral. La ruta y el módulo existían como `/admin/leads`, pero su acceso no era suficientemente visible y podía quedar fuera del área útil del sidebar.

Corrección aplicada:

- `Prospectos` queda ubicado inmediatamente después de `Clientes`.
- Se identifica con la etiqueta `Landing`.
- El sidebar ahora tiene desplazamiento interno seguro para pantallas de menor altura.
- La navegación se agrupa en Cartera y comercial, Gestión operativa, Especialidades y Configuración.
- La portada administrativa incorpora un acceso directo a Prospectos.

## Problemas transversales detectados

1. Tipografía demasiado genérica y poca diferenciación entre jerarquías.
2. Encabezados excesivamente grandes frente a la densidad operativa.
3. Sidebar largo sin agrupación, con riesgo de ocultar elementos inferiores.
4. Tarjetas con demasiada altura, padding y radios poco consistentes.
5. Exceso de `rounded-3xl` y sombras similares en todos los niveles.
6. Formularios con etiquetas, inputs y ayudas sin una escala consistente.
7. Tablas demasiado planas y con encabezados de alto peso visual.
8. Navegaciones internas con demasiados botones compitiendo con el título.
9. Estados visuales sin un indicador rápido común.
10. Empty states excesivamente altos para tareas operativas frecuentes.
11. Selector de empresa visualmente desconectado del encabezado.
12. Pantallas extensas sin una lectura clara de prioridad y siguiente acción.

## Sistema visual aplicado

- Tipografía principal: Manrope.
- Fondo administrativo con gradiente sutil y superficies blancas.
- Azul marino principal: `#10283d`.
- Azul funcional: `#174f7a`.
- Dorado de acento: `#cfa84b`.
- Bordes más suaves y consistentes.
- Radios predominantes de 12 a 16 px, reservando radios mayores para casos específicos.
- Sombras con menor opacidad y mejor jerarquía.
- Encabezados de página más compactos y balanceados.
- Métricas más densas y fáciles de escanear.
- Badges con punto de color y tipografía más pequeña.
- Inputs con estados hover/focus consistentes.
- Tablas con encabezados sobrios y hover de fila sutil.
- Navegación interna compacta y horizontal con contexto de módulo.

## Pantallas rediseñadas directamente en esta intervención

- Shell administrativo y sidebar.
- Navegación principal y móvil.
- Prospectos.
- Resumen de la cartera.
- Clientes.
- Contabilidad y rentabilidad.
- Remuneraciones.
- Encabezados reutilizables de módulos.
- Navegación interna de Contabilidad y Remuneraciones.
- Buscador de empresas.
- Métricas, badges e información contextual.

## Alcance transversal

El sistema visual global afecta además a todas las pantallas restantes mediante:

- tipografía;
- fondos y superficies;
- inputs, selects y textareas;
- estados de foco;
- tablas;
- tarjetas y secciones blancas;
- interacción de botones y enlaces;
- comportamiento responsive;
- scrollbar del menú lateral;
- reducción de movimiento cuando el sistema operativo lo solicita.

## Validación requerida antes de producción

1. Lint.
2. TypeScript.
3. Build OpenNext/Cloudflare.
4. Límite de tamaño del Worker.
5. Smoke tests públicos.
6. QA visual autenticado en escritorio y móvil.
7. Verificación de Prospectos con una solicitud real del formulario del landing.
8. Verificación de navegación completa en pantallas de baja altura.
