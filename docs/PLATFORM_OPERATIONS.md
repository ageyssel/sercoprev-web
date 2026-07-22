# Guía operativa de la plataforma SERCOPREV

## Objetivo

La plataforma organiza la relación entre SERCOPREV, su equipo y cada empresa cliente. No reemplaza el criterio profesional ni los comprobantes oficiales; centraliza trabajo, fechas, documentos, cobros, consultas y estados.

## Flujo recomendado para un nuevo cliente

1. Registrar el cliente en **Administración → Clientes**.
2. Entregar la contraseña temporal por un canal seguro.
3. Abrir la ficha 360° y completar datos legales, tributarios y de contacto.
4. Asignar contador y ejecutivo responsable.
5. Agregar contactos autorizados de la empresa.
6. Agregar los servicios contratados y honorarios acordados.
7. Crear las obligaciones del primer periodo.
8. Crear solicitudes de documentos para antecedentes pendientes.
9. Publicar documentos iniciales o importar registros financieros.
10. Confirmar que el cliente cambió su contraseña y accede al portal.

## Estados de cliente

- **En incorporación:** antecedentes, configuración o accesos todavía incompletos.
- **Activo:** servicio normal y vigente.
- **Requiere atención:** existe una contingencia, incumplimiento o decisión pendiente.
- **Suspendido:** la prestación se encuentra detenida.
- **Archivado:** relación finalizada; se conserva el historial.

## Obligaciones

Las obligaciones representan declaraciones, pagos, entregas o hitos con fecha.

Estados:

- Pendiente
- En proceso
- Esperando cliente
- Presentada
- Pagada
- No aplica
- Vencida

Use **requiere acción del cliente** cuando la obligación dependa de un pago, autorización o antecedente externo.

## Tareas internas

Las tareas son trabajo del equipo y no aparecen en el portal del cliente.

Estados:

- Pendiente
- En curso
- Bloqueada
- Completada

Cada tarea debe tener un título específico, responsable, prioridad y fecha cuando corresponda.

## Solicitudes documentales

Las solicitudes aparecen en el portal del cliente. El cliente puede responder adjuntando un archivo.

Flujo:

1. Solicitado
2. Recibido
3. En revisión
4. Observado o Aprobado
5. Vencido cuando ya no corresponde recibirlo

Cuando el cliente carga una respuesta, el sistema crea el documento, lo vincula a la solicitud y cambia el estado a **Recibido**.

## Documentos

Categorías actuales:

- Impuestos
- Remuneraciones
- Legal

Buenas prácticas:

- indicar periodo;
- usar una descripción comprensible;
- evitar archivos duplicados;
- no cargar contraseñas o claves privadas;
- confirmar que el archivo corresponda a la empresa seleccionada.

## Importaciones

La importación CSV se utiliza para publicar registros estructurados visibles en la ficha y portal del cliente.

Columnas obligatorias:

```text
periodo;descripcion;monto;estado
```

Límites:

- 500 filas;
- 2 MB;
- CSV UTF-8;
- montos numéricos y periodos identificables.

Las importaciones agregan registros. No eliminan ni reemplazan automáticamente información anterior.

## Honorarios y cobranza

Cada registro de honorarios debe representar un cobro identificable por empresa y periodo.

Datos mínimos:

- periodo;
- concepto;
- monto;
- fecha de vencimiento;
- estado.

Estados:

- **Pendiente:** emitido o informado, todavía no pagado.
- **Pagado:** pago confirmado; el sistema registra la fecha.
- **Vencido:** plazo superado y requiere seguimiento.
- **Anulado:** cobro sin efecto.

Buenas prácticas:

- no marcar como pagado hasta confirmar el abono;
- registrar observaciones cuando el monto difiera del honorario mensual;
- revisar diariamente los vencidos;
- usar la ficha del cliente para crear el cobro y el módulo transversal para seguimiento;
- responder dudas de cobro mediante una consulta con categoría **Cobranza**.

## Consultas de clientes

Las consultas evitan que acuerdos y respuestas importantes queden dispersos en correo o WhatsApp.

Categorías:

- Contabilidad
- Impuestos
- Remuneraciones
- Documentos
- Legal
- Cobranza
- Consulta general

Estados:

1. Abierto
2. En revisión
3. Esperando cliente
4. Resuelto
5. Cerrado

Reglas recomendadas:

- responder desde el hilo del portal;
- indicar acciones, responsables y fechas;
- usar **Esperando cliente** cuando falte información externa;
- usar **Resuelto** cuando la respuesta esté entregada, pero el cliente aún pueda complementar;
- usar **Cerrado** cuando no deban admitirse nuevas respuestas;
- una respuesta del cliente puede reabrir automáticamente una consulta resuelta.

## Contactos empresariales

La ficha complementaria permite registrar contactos adicionales sin crearles acceso automático al portal.

- marque solo un contacto principal;
- indique cargo y datos vigentes;
- use **recibe notificaciones** únicamente para personas autorizadas;
- no utilice este módulo para almacenar contraseñas, claves tributarias ni datos innecesarios.

## Leads

El formulario público crea prospectos con estado **Nuevo**. El flujo comercial recomendado es:

1. Nuevo
2. Contactado
3. Evaluación
4. Propuesta enviada
5. Ganado o Descartado

Los datos solo deben usarse para responder la solicitud y gestionar la relación comercial.

## Revisión diaria

- obligaciones vencidas o próximas;
- tareas críticas y bloqueadas;
- solicitudes recibidas u observadas;
- honorarios vencidos;
- consultas nuevas o reabiertas;
- clientes que requieren atención;
- prospectos nuevos.

## Revisión semanal

- carga de trabajo por responsable;
- consultas esperando respuesta;
- clientes sin actividad reciente;
- cobros pendientes;
- solicitudes documentales próximas a vencer;
- incorporaciones incompletas.

## Revisión mensual

- actualizar estado de impuestos;
- verificar servicios y honorarios;
- archivar obligaciones completadas mediante su estado;
- revisar contactos autorizados;
- confirmar documentos y registros publicados;
- revisar auditoría ante incidencias;
- cerrar consultas ya resueltas;
- actualizar clientes suspendidos o archivados.

## Seguridad

- nunca compartir cuentas administrativas;
- utilizar contraseñas únicas;
- no enviar secretos por correo o chat;
- verificar empresa antes de cargar o cambiar información;
- descargar documentos solo desde el portal;
- cerrar sesión en equipos compartidos;
- registrar únicamente datos necesarios para el servicio;
- reportar accesos o acciones sospechosas.
