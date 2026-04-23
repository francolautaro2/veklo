const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  const from = process.env.EMAIL_FROM || "veklo <noreply@veklo.app>";

  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch {
    // email failures should not break the main flow
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendBookingConfirmation({
  booking,
  preCheckInUrl,
  propertyName,
  roomName,
}) {
  if (!booking.guestEmail) return;

  const checkIn = formatDate(booking.checkIn);
  const checkOut = formatDate(booking.checkOut);

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#10b981">Confirmación de reserva</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">Hola ${booking.guestName}, tu reserva está confirmada.</p>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px"><strong>Propiedad:</strong> ${propertyName}</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>Habitación:</strong> ${roomName}</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>Check-in:</strong> ${checkIn}</p>
      <p style="margin:0;font-size:13px"><strong>Check-out:</strong> ${checkOut}</p>
    </div>

    ${
      preCheckInUrl
        ? `<div style="margin-bottom:20px">
      <p style="font-size:13px;color:#94a3b8;margin:0 0 10px">Completá tu pre check-in digital para agilizar tu ingreso:</p>
      <a href="${preCheckInUrl}" style="display:inline-block;background:#10b981;color:#0f172a;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
        Completar pre check-in
      </a>
    </div>`
        : ""
    }

    ${
      booking.deposit?.status !== "not_required" && booking.deposit?.amount
        ? `<div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Seña:</strong> $ ${Number(booking.deposit.amount).toLocaleString("es-AR")}</p>
      ${booking.deposit?.paymentLink ? `<a href="${booking.deposit.paymentLink}" style="display:inline-block;margin-top:8px;background:#334155;color:#f1f5f9;text-decoration:none;font-size:12px;padding:8px 16px;border-radius:8px">Pagar seña</a>` : ""}
    </div>`
        : ""
    }

    <p style="font-size:11px;color:#475569;margin:0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: booking.guestEmail,
    subject: `Reserva confirmada – ${propertyName}`,
    html,
  });
}

export async function sendPreCheckInCompletedNotification({
  booking,
  ownerEmail,
  propertyName,
  roomName,
}) {
  if (!ownerEmail) return;

  const checkIn = formatDate(booking.checkIn);

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:18px;margin:0 0 4px;color:#10b981">Pre check-in completado</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">
      <strong>${booking.guestName}</strong> completó su pre check-in para el ${checkIn}.
    </p>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em">Datos del huésped</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Nombre:</strong> ${booking.guestName}</p>
      ${booking.guestEmail ? `<p style="margin:0 0 6px;font-size:13px"><strong>Email:</strong> ${booking.guestEmail}</p>` : ""}
      ${booking.guestPhone ? `<p style="margin:0 0 6px;font-size:13px"><strong>Teléfono:</strong> ${booking.guestPhone}</p>` : ""}
      ${booking.preCheckIn?.documentId ? `<p style="margin:0 0 6px;font-size:13px"><strong>Documento:</strong> ${booking.preCheckIn.documentId}</p>` : ""}
      ${booking.preCheckIn?.notes ? `<p style="margin:0;font-size:13px"><strong>Notas:</strong> ${booking.preCheckIn.notes}</p>` : ""}
    </div>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px"><strong>Propiedad:</strong> ${propertyName}</p>
      <p style="margin:0;font-size:13px"><strong>Habitación:</strong> ${roomName}</p>
    </div>

    <p style="font-size:11px;color:#475569;margin:0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: ownerEmail,
    subject: `Pre check-in completado – ${booking.guestName}`,
    html,
  });
}
