# Reintento controlado de despliegue — 23 de julio de 2026

Este cambio genera un nuevo release verificable para promover a producción la automatización de indicadores oficiales, el health ampliado y el componente de ayudas informativas corregido.

No modifica reglas de negocio ni datos. El despliegue debe comprobar `/api/health` y `/api/version` después de publicar el Worker.
