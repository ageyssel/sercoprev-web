# Fórmulas SERCOPREV — interfaz no-code

Fecha: 17 de agosto de 2026

## Objetivo

El módulo `/admin/formulas` debe ser comprensible para contadores, personal de remuneraciones y administradores que no programan.

La interfaz no expone:

- expresiones del motor;
- nombres internos de variables;
- JSON de pruebas;
- funciones matemáticas internas;
- código, SQL o JavaScript.

## Experiencia de usuario

Cada regla presenta:

1. Qué calcula.
2. Cómo se calcula, explicado paso a paso en lenguaje contable.
3. Qué datos intervienen y en qué unidad se expresan.
4. Un simulador con campos numéricos normales, porcentajes, días, UF y opciones Sí/No.
5. Resultado de simulación formateado para el usuario.
6. Historial de versiones explicado sin código.

## Cambios de reglas

Los administradores modifican sólo controles de negocio autorizados. Por ejemplo:

- días estándar para prorratear sueldo mensual;
- porcentaje de gratificación;
- factor de ingreso mínimo utilizado en el tope;
- meses para mensualizar el tope;
- conceptos que se suman o restan en total imponible, total tributable, total no imponible, base de impuesto, aportes del empleador y líquido a pagar.

SERCOPREV convierte internamente esos controles a la expresión segura utilizada por el motor de cálculo. Antes de guardar se vuelve a validar la regla con el mismo parser restringido del backend.

Las tasas, topes y valores que pertenecen a parámetros legales o a datos del contrato siguen administrándose en sus módulos correspondientes y no se duplican en el editor de fórmulas.

## Seguridad y trazabilidad

- No se ejecuta código ingresado por usuarios.
- No se recibe una expresión técnica desde el navegador al guardar una nueva versión.
- La expresión base se obtiene nuevamente desde la versión publicada en la base de datos.
- Los controles recibidos se traducen mediante plantillas permitidas por tipo de regla.
- La expresión generada se valida antes de persistirse.
- Cada cambio crea un borrador versionado.
- El borrador puede simularse antes de publicar.
- La publicación continúa usando la RPC atómica existente.
- Las liquidaciones históricas conservan la versión correspondiente a su fecha.
