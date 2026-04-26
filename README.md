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
npm run dev
```

Abrí `http://localhost:3000`.

## Funcionalidades principales

- Dashboard operativo de reservas y ocupación
- Gestión de propiedades y habitaciones
- Pre check-in digital por link
- Import/export iCal por habitación
- Control manual de pagos, señas y saldos pendientes
- Recuperación de contraseña por email
- Cobro de suscripción con MercadoPago
- Tema claro/oscuro en panel

## Checklist MVP para producción

- Configurar `APP_URL`, `JWT_SECRET`, MongoDB y credenciales de email.
- Activar backups automáticos de MongoDB.
- Probar registro, login, recuperación de contraseña y logout.
- Crear una propiedad, una habitación y una reserva real de prueba.
- Verificar email de confirmación de reserva y link de pre check-in.
- Completar un pre check-in y confirmar que llega el aviso al dueño.
- Marcar un pago manual como pagado desde el dashboard.
- Probar import/export iCal en una habitación de prueba.
- Revisar suscripción de prueba de MercadoPago para cobrar Veklo.
