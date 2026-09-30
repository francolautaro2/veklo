# veklo

SaaS para gestión de alojamientos: propiedades, habitaciones, reservas, pre check-in digital, sincronización iCal y suscripciones con MercadoPago.

## Requisitos

- Node.js 20+
- MongoDB

## Configuración

1. Copiá variables de entorno:

```bash
cp .env.example .env.local
```

2. Completá credenciales en `.env.local`.

Para emails transaccionales con Resend:
- Creá una API key en Resend y guardala como `RESEND_API_KEY`.
- Verificá tu dominio de envío en Resend.
- Configurá `EMAIL_FROM` con un remitente de ese dominio, por ejemplo `veklo <noreply@tudominio.com>`.
- En desarrollo podés probar con el dominio de sandbox de Resend, pero para producción usá dominio propio.

3. Para habilitar acceso con Google, configurá:
   - `GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Ambas deben usar el mismo Web Client ID de Google Cloud OAuth 2.0.
Además, en Google Cloud agregá como redirect URI autorizado:
- `http://localhost:3000/auth/google/callback`
- `https://tu-dominio.com/auth/google/callback` (producción)

## Desarrollo

```bash
npm install
npm run db          # MongoDB local sin Docker (dejalo corriendo en otra terminal)
npm run seed:demo   # opcional: cuenta demo@veklo.app / Demo1234! con datos de ejemplo
npm run dev
```

Abrí `http://localhost:3000`.

`npm run db` levanta un MongoDB liviano (~130 MB de RAM) con los datos en
`.mongo-dev/`, que se conservan entre ejecuciones. Usá
`MONGODB_URI=mongodb://127.0.0.1:27017/veklo` en `.env.local`. También podés
apuntar a MongoDB Atlas o levantar Mongo con `docker compose up -d`.

## Funcionalidades principales

- Dashboard operativo de reservas y ocupación
- Gestión de propiedades y habitaciones (alta, edición y baja)
- Pre check-in digital por link, con recordatorio automático por email
- Import/export iCal por habitación con sincronización automática (plan Plus)
- Exportación de reservas a CSV (plan Plus)
- Control manual de pagos, señas y saldos pendientes
- Recuperación de contraseña por email
- Cobro de suscripción con MercadoPago
- Tema claro/oscuro en panel

Los planes, precios y límites están en `lib/subscription.js` (fuente única: la
usan el cobro, los límites, la landing, el registro, el perfil y los términos).

## Despliegue a producción

### 1. Servicios externos

- **MongoDB**: un cluster administrado (por ejemplo MongoDB Atlas) con backups
  automáticos activados. Restringí el acceso por IP/red si tu hosting lo permite.
- **Resend**: dominio propio verificado (SPF/DKIM) y `EMAIL_FROM` de ese dominio.
- **MercadoPago**: credenciales de producción (`APP_USR-...`, no `TEST-...`).
  Configurá la URL de notificaciones de suscripciones en el panel de
  MercadoPago: `https://tu-dominio.com/api/billing/mercadopago/webhook?token=<MERCADOPAGO_WEBHOOK_TOKEN>`.
- **Google OAuth**: agregá `https://tu-dominio.com/auth/google/callback` como
  redirect URI autorizado.

### 2. Variables de entorno

Todas están documentadas en `.env.example`. Obligatorias: `MONGODB_URI`,
`JWT_SECRET` (32+ caracteres, `openssl rand -hex 32`) y `APP_URL` con `https://`.
Para que todo funcione además hacen falta `RESEND_API_KEY`, `EMAIL_FROM`,
`SUPPORT_EMAIL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`,
`CRON_SECRET`, `GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Al iniciar, el servidor avisa en los logs (`[config]`) si falta alguna.

### 3. Tareas programadas

Dos endpoints se tienen que llamar periódicamente con el header
`Authorization: Bearer <CRON_SECRET>`:

| Endpoint | Qué hace | Frecuencia recomendada |
| --- | --- | --- |
| `/api/cron/ical-sync` | Importa los calendarios de Airbnb/Booking de las cuentas Plus | Cada 15–30 minutos |
| `/api/cron/precheckin-reminders` | Recuerda el pre check-in a huéspedes que llegan en 2 días | 1 vez por día |

- **Vercel**: `vercel.json` ya los programa. Configurá `CRON_SECRET` en el
  proyecto y Vercel manda el header solo. El plan Hobby solo permite una
  ejecución diaria; para sincronizar iCal cada 15–30 minutos usá el plan Pro
  (cambiá el `schedule` en `vercel.json`) o un programador externo.
- **Otro hosting / programador externo** (cron-job.org, GitHub Actions, etc.):
  hacé un `GET` a cada endpoint con el header de autorización.

### 4. Monitoreo

- `GET /api/health` responde `{"status":"ok"}` si la app y la base funcionan:
  configuralo en un monitor de uptime (UptimeRobot, Better Stack, etc.).
- Los errores de las APIs se registran con `console.error("[ruta]", error)` y
  las tareas programadas dejan un resumen en los logs.

### 5. Antes de abrir al público

- Completar los `[COMPLETAR: ...]` de `/terminos`, `/privacidad` y
  `/arrepentimiento` (datos del titular en `app/_components/legal-page.js`) y
  hacerlos revisar por un abogado.
- Probar de punta a punta con una cuenta real: registro con código por email,
  login con Google, propiedad → habitación → reserva, email de confirmación,
  pre check-in completo y aviso al dueño, pago manual, iCal (Plus), exportar CSV,
  suscripción con MercadoPago y su cancelación, botón de arrepentimiento.
- Revisar que el webhook de MercadoPago actualice el plan después de pagar.
