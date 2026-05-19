# Rivera M Trucking

Aplicación web para la gestión de drivers, rutas, penalidades y pay stubs para Rivera M Trucking.

## Características

- **Dashboard:** Resumen de actividad semanal, KPIs, y total pagado.
- **Gestión de Drivers:** Listado, creación, edición, desactivación y vista de perfil.
- **Gestión de Rutas:** Definición de rutas con tarifas base por paquete y double.
- **Registro Diario:** Registro de paquetes entregados y doubles por driver y ruta.
- **Penalidades:** Registro de multas o penalidades aplicadas a drivers con descripciones predefinidas.
- **Pay Stubs:** Generación y envío masivo de comprobantes de pago semanales (calculando ingresos brutos y descontando penalidades).
- **Portal del Driver:** Vista exclusiva para drivers donde pueden ver su ID/DVR, contraseña, subir fotos de entregas y revisar sus pay stubs.

## Tecnologías

- **Frontend:** React, Tailwind CSS, shadcn/ui, Lucide Icons, Wouter
- **Backend:** Express, tRPC
- **Base de Datos:** PostgreSQL (Supabase) con Drizzle ORM
- **Autenticación:** Sistema híbrido (Local Auth con JWT + OAuth)
- **Despliegue:** Vercel

## Credenciales de Demo

- **Admin:** admin@rivera.com / admin123
- **Driver:** driver1@rivera.com / driver123

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
DATABASE_URL="postgresql://postgres.[tu-proyecto]:[tu-password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
VITE_SUPABASE_URL="https://[tu-proyecto].supabase.co"
VITE_SUPABASE_ANON_KEY="tu-anon-key"
VITE_APP_NAME="Rivera M Trucking"
JWT_SECRET="tu-secreto-jwt"
```

## Instalación Local

1. Clonar el repositorio
2. Instalar dependencias: `pnpm install`
3. Generar migraciones: `pnpm run db:generate`
4. Aplicar migraciones: `pnpm run db:push`
5. Iniciar en desarrollo: `pnpm run dev`

## Despliegue en Vercel

El proyecto está configurado para desplegarse fácilmente en Vercel. Asegúrate de configurar las variables de entorno mencionadas anteriormente en la configuración del proyecto en Vercel. El comando de build es `pnpm run build` y el directorio de salida es `dist/public`.
