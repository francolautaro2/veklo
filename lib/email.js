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

// Todo dato que venga de usuarios o huéspedes pasa por acá antes de ir al HTML.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:"
      ? escapeHtml(url.toString())
      : "";
  } catch {
    return "";
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
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
  const guestName = escapeHtml(booking.guestName);
  const safePropertyName = escapeHtml(propertyName);
  const safeRoomName = escapeHtml(roomName);
  const safePreCheckInUrl = safeHttpUrl(preCheckInUrl);
  const safePaymentLink = safeHttpUrl(booking.deposit?.paymentLink);

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#10b981">Confirmación de reserva</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">Hola ${guestName}, tu reserva está confirmada.</p>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px"><strong>Propiedad:</strong> ${safePropertyName}</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>Habitación:</strong> ${safeRoomName}</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>Check-in:</strong> ${checkIn}</p>
      <p style="margin:0;font-size:13px"><strong>Check-out:</strong> ${checkOut}</p>
    </div>

    ${
      safePreCheckInUrl
        ? `<div style="margin-bottom:20px">
      <p style="font-size:13px;color:#94a3b8;margin:0 0 10px">Completá tu pre check-in digital para agilizar tu ingreso:</p>
      <a href="${safePreCheckInUrl}" style="display:inline-block;background:#10b981;color:#0f172a;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
        Completar pre check-in
      </a>
    </div>`
        : ""
    }

    ${
      booking.deposit?.status !== "not_required" && booking.deposit?.amount
        ? `<div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Seña:</strong> $ ${Number(booking.deposit.amount).toLocaleString("es-AR")}</p>
      ${safePaymentLink ? `<a href="${safePaymentLink}" style="display:inline-block;margin-top:8px;background:#334155;color:#f1f5f9;text-decoration:none;font-size:12px;padding:8px 16px;border-radius:8px">Pagar seña</a>` : ""}
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

export async function sendPreCheckInReminder({
  booking,
  preCheckInUrl,
  propertyName,
  roomName,
}) {
  if (!booking.guestEmail) return { ok: false, skipped: true };

  const safePreCheckInUrl = safeHttpUrl(preCheckInUrl);
  if (!safePreCheckInUrl) return { ok: false, skipped: true };

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#10b981">Tu estadía se acerca</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">Hola ${escapeHtml(booking.guestName)}, te esperamos el ${formatDate(booking.checkIn)}.</p>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px"><strong>Propiedad:</strong> ${escapeHtml(propertyName)}</p>
      <p style="margin:0;font-size:13px"><strong>Habitación:</strong> ${escapeHtml(roomName)}</p>
    </div>

    <p style="font-size:13px;color:#94a3b8;margin:0 0 10px">Completá tu pre check-in para agilizar tu ingreso. Te lleva un par de minutos:</p>
    <a href="${safePreCheckInUrl}" style="display:inline-block;background:#10b981;color:#0f172a;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
      Completar pre check-in
    </a>

    <p style="font-size:11px;color:#475569;margin:24px 0 0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: booking.guestEmail,
    subject: `Completá tu pre check-in – ${propertyName}`,
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

      return `<p style="margin:0 0 6px;font-size:13px"><strong>${escapeHtml(answer.label)}:</strong> ${escapeHtml(value)}${cost}</p>`;
    })
    .join("");

  const guestName = escapeHtml(booking.guestName);
  const safePropertyName = escapeHtml(propertyName);
  const safeRoomName = escapeHtml(roomName);

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:18px;margin:0 0 4px;color:#10b981">Pre check-in completado</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">
      <strong>${guestName}</strong> completó su pre check-in para el ${checkIn}.
    </p>

    <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em">Datos del huésped</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Nombre:</strong> ${guestName}</p>
      ${booking.guestEmail ? `<p style="margin:0 0 6px;font-size:13px"><strong>Email:</strong> ${escapeHtml(booking.guestEmail)}</p>` : ""}
      ${booking.guestPhone ? `<p style="margin:0 0 6px;font-size:13px"><strong>Teléfono:</strong> ${escapeHtml(booking.guestPhone)}</p>` : ""}
      ${booking.preCheckIn?.documentId ? `<p style="margin:0 0 6px;font-size:13px"><strong>Documento:</strong> ${escapeHtml(booking.preCheckIn.documentId)}</p>` : ""}
      ${booking.preCheckIn?.notes ? `<p style="margin:0;font-size:13px"><strong>Notas:</strong> ${escapeHtml(booking.preCheckIn.notes)}</p>` : ""}
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
      <p style="margin:0 0 8px;font-size:13px"><strong>Propiedad:</strong> ${safePropertyName}</p>
      <p style="margin:0;font-size:13px"><strong>Habitación:</strong> ${safeRoomName}</p>
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
    <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">Hola ${escapeHtml(user.name || "Usuario")}, recibimos un pedido para cambiar tu contraseña de veklo.</p>

    <a href="${safeHttpUrl(resetUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">
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
    <p style="font-size:13px;color:#94a3b8;margin:0 0 18px">Hola ${escapeHtml(user.name || "Usuario")}, usá este código para crear una contraseña nueva:</p>
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
    <p style="font-size:13px;color:#94a3b8;margin:0 0 18px">Hola ${escapeHtml(user.name || "Usuario")}, ingresá este código para activar tu cuenta en veklo:</p>
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

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "hola@veklo.app";
}

// Botón de arrepentimiento: constancia al usuario (con el código de trámite) y
// aviso al equipo para procesar la baja y el reintegro.
export async function sendRevocationRequestEmails({ request }) {
  const code = escapeHtml(request.code);
  const name = escapeHtml(request.name);
  const email = escapeHtml(request.email);
  const details = escapeHtml(request.details || "-");

  const userHtml = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155">
    <h1 style="font-size:20px;margin:0 0 4px;color:#10b981">Recibimos tu pedido de arrepentimiento</h1>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 18px">Hola ${name}, registramos tu solicitud para revocar la contratación de veklo.</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;font-size:22px;font-weight:800;letter-spacing:.12em;color:#f8fafc">${code}</div>
    <p style="font-size:12px;color:#94a3b8;margin:18px 0 0">Este es tu código de trámite. Vamos a cancelar la suscripción y reintegrar lo cobrado, y te escribimos a este email cuando esté procesado.</p>
    <p style="font-size:11px;color:#475569;margin:24px 0 0">veklo · Sistema de gestión hotelera</p>
  </div>
</body>
</html>`;

  const supportHtml = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;margin:0;padding:20px">
  <h1 style="font-size:18px">Nuevo pedido de arrepentimiento ${code}</h1>
  <p><strong>Nombre:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Cuenta encontrada:</strong> ${request.userId ? "Sí" : "No"}</p>
  <p><strong>Detalle:</strong> ${details}</p>
  <p>Cancelar la suscripción en MercadoPago y reintegrar lo cobrado.</p>
</body>
</html>`;

  const [userResult, supportResult] = await Promise.all([
    sendEmail({
      to: request.email,
      subject: `Pedido de arrepentimiento recibido – ${request.code}`,
      html: userHtml,
    }),
    sendEmail({
      to: getSupportEmail(),
      subject: `[veklo] Arrepentimiento ${request.code} – ${request.email}`,
      html: supportHtml,
    }),
  ]);

  return { userResult, supportResult };
}
