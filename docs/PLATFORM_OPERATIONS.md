# Guía operativa de la plataforma SERCOPREV

## Objetivo

La plataforma organiza la relación entre SERCOPREV, su equipo y cada empresa cliente. No reemplaza el criterio profesional ni los comprobantes oficiales; centraliza trabajo, fechas, documentos y estados.

## Flujo recomendado para un nuevo cliente

1. Registrar el cliente en **Administración → Clientes**.
2. Entregar la contraseña temporal por un canal seguro.
3. Abrir la ficha 360° y completar datos legales, tributarios y de contacto.
4. Asignar contador y ejecutivo responsable.
5. Agregar los servicios contratados y honorarios.
6. Crear las obligaciones del primer periodo.
7. Crear solicitudes de documentos para antecedentes pendientes.
8. Publicar documentos iniciales o importar registros financieros.
9. Confirmar que el cliente cambió su contraseña y accede al portal.

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
- clientes que requieren atención;
- prospectos nuevos.

## Revisión mensual

- actualizar estado de impuestos;
- verificar servicios y honorarios;
- archivar obligaciones completadas mediante su estado;
- revisar clientes sin actividad;
- confirmar documentos y registros publicados;
- revisar auditoría ante incidencias.

## Seguridad

- nunca compartir cuentas administrativas;
- utilizar contraseñas únicas;
- no enviar secretos por correo o chat;
- verificar empresa antes de cargar o cambiar información;
- descargar documentos solo desde el portal;
- cerrar sesión en equipos compartidos;
- reportar accesos o acciones sospechosas.
