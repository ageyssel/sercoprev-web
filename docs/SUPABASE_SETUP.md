# Activación del nuevo Supabase de SERCOPREV

## Proyecto objetivo

- Project Ref: `kxrxlygnhukfmdgqhoaz`
- Project URL: `https://kxrxlygnhukfmdgqhoaz.supabase.co`
- Producción: `https://www.sercoprev.cl`

El proyecto antiguo debe conservarse pausado hasta agotar las posibilidades de recuperación de sus datos.

## 1. Aplicar el esquema

La fuente de verdad está en:

```text
supabase/migrations/202607210001_initial_secure_schema.sql
```

Opción SQL Editor:

1. Abra el proyecto nuevo en Supabase.
2. Entre a **SQL Editor**.
3. Cree una consulta nueva.
4. Pegue el contenido completo de la migración.
5. Ejecute una sola vez.
6. Confirme que finalice sin errores.

La migración crea:

- `public.empresas`
- `public.documentos`
- `public.datos_empresa`
- esquema privado de autorización
- índices
- políticas RLS
- bucket privado `documentos`
- políticas de Storage

## 2. Crear el primer administrador

1. En Supabase vaya a **Authentication > Users**.
2. Cree manualmente el usuario administrador con una contraseña fuerte.
3. Abra `supabase/bootstrap_admin.sql`.
4. Reemplace el correo, RUT y nombre.
5. Ejecute el script desde SQL Editor.
6. Verifique en `public.empresas` que `es_admin = true` y `must_change_password = false`.

## 3. Variables de Cloudflare

Variables públicas:

```text
NEXT_PUBLIC_SUPABASE_URL=https://kxrxlygnhukfmdgqhoaz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_LpXB0WEd-O8Y5ARxeEZ2hQ_xhw3jP1n
APP_BASE_URL=https://www.sercoprev.cl
```

Secretos, ingresados directamente en Cloudflare y nunca en GitHub:

```text
SUPABASE_SECRET_KEY=sb_secret_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=SERCOPREV <portal@sercoprev.cl>
```

Para Wrangler:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

Las variables `NEXT_PUBLIC_*` deben estar disponibles durante el build porque Next.js las incorpora al bundle del navegador.

## 4. Configuración de Auth

En **Authentication > URL Configuration**:

```text
Site URL: https://www.sercoprev.cl
Additional Redirect URLs:
https://sercoprev.cl/**
https://www.sercoprev.cl/**
```

En **Authentication > Providers > Email**:

- Mantenga habilitado Email/Password.
- Exija contraseñas seguras.
- Desactive registros públicos si solo SERCOPREV crea cuentas.
- Configure SMTP propio antes de usar correos transaccionales en producción.

## 5. Formato de documentos

Los objetos del bucket privado deben usar esta estructura:

```text
<empresa_id>/<uuid>-<nombre-seguro.ext>
```

La fila de `public.documentos` debe guardar:

- `empresa_id`
- `nombre_original`
- `storage_path`
- `categoria`: `Impuestos`, `Remuneraciones` o `Legal`

El portal genera enlaces firmados con duración de 15 minutos.

## 6. Verificación mínima

1. Un usuario anónimo no puede leer ninguna tabla pública.
2. Un cliente solo puede leer su propia empresa.
3. Un cliente solo puede leer sus documentos y datos.
4. Un cliente no puede insertar, modificar ni eliminar registros administrativos.
5. Un cliente no puede descargar archivos ubicados en la carpeta de otra empresa.
6. Un administrador puede listar clientes.
7. Las acciones de crear cliente e importar Excel rechazan usuarios no administradores.
8. Un cliente nuevo es enviado a cambiar su contraseña temporal.

## 7. Cambio de producción

Solo después de completar la verificación:

1. Actualice las variables en Cloudflare.
2. Ejecute el build y despliegue.
3. Pruebe login administrador.
4. Cree un cliente de prueba.
5. Ingrese como cliente y cambie la contraseña.
6. Pruebe aislamiento entre dos empresas.
7. Pruebe descarga de un documento privado.

No elimine el Supabase antiguo durante este proceso.
