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
- Cobro de suscripción con MercadoPago
- Tema claro/oscuro en panel
