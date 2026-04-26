const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] Email no enviado: falta RESEND_API_KEY o destinatario.");
    }
    return { ok: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM || "veklo <noreply@veklo.app>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[email] Resend rechazó el email status=${res.status} to=${to} from=${from} body=${body}`
      );
      return { ok: false, status: res.status, body };
    }

    if (process.env.NODE_ENV !== "production") {
      const body = await res.text();
      console.info(
        `[email] Resend aceptó el email to=${to} from=${from} body=${body}`
      );
    }

    return { ok: true };
  } catch (error) {
    console.error(`[email] Error de red enviando email con Resend: ${error}`);
    return { ok: false };
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
  const customAnswers = booking.preCheckIn?.customAnswers || [];
  const customAnswersHtml = customAnswers
    .filter((answer) => answer?.label)
    .map((answer) => {
      const value =
        answer.type === "boolean"
          ? answer.value
            ? "Sí"
            : "No"
          : answer.value || "-";
      const cost =
        answer.hasCost && answer.cost
          ? ` <span style="color:#fbbf24">(+ $ ${Number(answer.cost).toLocaleString("es-AR")})</span>`
          : "";

      return `<p style="margin:0 0 6px;font-size:13px"><strong>${answer.label}:</strong> ${value}${cost}</p>`;
    })
    .join("");

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

    ${
      customAnswersHtml
        ? `<div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="margin:0 0 8px;color:#94a3b8;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em">Extras y preferencias</p>
      ${customAnswersHtml}
    </div>`
        : ""
    }

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

export async function sendPasswordResetEmail({ user, resetUrl }) {
  if (!user?.email || !resetUrl) return;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#f97316">Restablecer contraseña</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">Hola ${user.name || "Usuario"}, recibimos un pedido para cambiar tu contraseña de veklo.</p>

    <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
      Crear nueva contraseña
    </a>

    <p style="font-size:12px;color:#94a3b8;margin:20px 0 0">El link vence en 1 hora. Si no pediste este cambio, podés ignorar este email.</p>
    <p style="font-size:11px;color:#475569;margin:24px 0 0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: user.email,
    subject: "Restablecer contraseña de veklo",
    html,
  });
}

export async function sendPasswordResetCodeEmail({ user, code }) {
  if (!user?.email || !code) return;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#f97316">Código para restablecer contraseña</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 18px">Hola ${user.name || "Usuario"}, usá este código para crear una contraseña nueva:</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;font-size:28px;font-weight:800;letter-spacing:.22em;color:#f8fafc">${code}</div>
    <p style="font-size:12px;color:#94a3b8;margin:18px 0 0">El código vence en 15 minutos. Si no pediste este cambio, podés ignorar este email.</p>
    <p style="font-size:11px;color:#475569;margin:24px 0 0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: user.email,
    subject: "Código para restablecer contraseña de veklo",
    html,
  });
}

export async function sendEmailVerificationCode({ user, code }) {
  if (!user?.email || !code) return;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#f97316">Verificá tu email</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 18px">Hola ${user.name || "Usuario"}, ingresá este código para activar tu cuenta en veklo:</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;font-size:28px;font-weight:800;letter-spacing:.22em;color:#f8fafc">${code}</div>
    <p style="font-size:12px;color:#94a3b8;margin:18px 0 0">El código vence en 15 minutos.</p>
    <p style="font-size:11px;color:#475569;margin:24px 0 0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: user.email,
    subject: "Código de verificación de veklo",
    html,
  });
}
