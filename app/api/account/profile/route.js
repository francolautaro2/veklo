import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import {
  createSessionToken,
  getUserContextFromRequest,
  setSessionCookie,
} from "@/lib/auth";
import { ensureUserOrganization } from "@/lib/organization";

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    documentId: user.documentId || "",
    organizationId: user.organizationId?.toString() || null,
    role: user.role || "owner",
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionProvider: user.subscriptionProvider || null,
    subscriptionExternalId: user.subscriptionExternalId || "",
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
    subscriptionLastWebhookAt: user.subscriptionLastWebhookAt || null,
    trialStartsAt: user.trialStartsAt || null,
    trialEndsAt: user.trialEndsAt || null,
    createdAt: user.createdAt || null,
  };
}

export async function GET(request) {
  await dbConnect();

  const sessionUser = await getUserContextFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await User.findById(sessionUser.id).select(
    "name email phone documentId role organizationId plan subscriptionStatus subscriptionProvider subscriptionExternalId subscriptionCurrentPeriodEnd subscriptionLastWebhookAt trialStartsAt trialEndsAt createdAt"
  );

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  await ensureUserOrganization(user);

  return NextResponse.json({ user: buildSafeUser(user) }, { status: 200 });
}

export async function PUT(request) {
  await dbConnect();

  const sessionUser = await getUserContextFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await User.findById(sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  await ensureUserOrganization(user);

  const { name, email, phone, documentId, currentPassword, newPassword } =
    await request.json();

  const normalizedName = typeof name === "string" ? name.trim() : undefined;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : undefined;
  const normalizedPhone = typeof phone === "string" ? phone.trim() : undefined;
  const normalizedDocumentId =
    typeof documentId === "string" ? documentId.trim() : undefined;
  const normalizedCurrentPassword =
    typeof currentPassword === "string" ? currentPassword : "";
  const normalizedNewPassword = typeof newPassword === "string" ? newPassword : "";

  if (name !== undefined && !normalizedName) {
    return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
  }

  if (email !== undefined && !normalizedEmail) {
    return NextResponse.json({ error: "El email no puede estar vacío." }, { status: 400 });
  }

  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  if (normalizedPhone !== undefined && normalizedPhone.length > 30) {
    return NextResponse.json(
      { error: "El teléfono no puede superar 30 caracteres." },
      { status: 400 }
    );
  }

  if (normalizedDocumentId !== undefined && normalizedDocumentId.length > 40) {
    return NextResponse.json(
      { error: "El documento no puede superar 40 caracteres." },
      { status: 400 }
    );
  }

  const wantsNameChange =
    normalizedName !== undefined && normalizedName !== user.name;
  const wantsEmailChange =
    normalizedEmail !== undefined && normalizedEmail !== user.email;
  const wantsPhoneChange =
    normalizedPhone !== undefined && normalizedPhone !== (user.phone || "");
  const wantsDocumentIdChange =
    normalizedDocumentId !== undefined &&
    normalizedDocumentId !== (user.documentId || "");
  const wantsPasswordChange = normalizedNewPassword.length > 0;

  if (wantsPasswordChange && normalizedNewPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const needsPasswordValidation = wantsEmailChange || wantsPasswordChange;
  if (needsPasswordValidation) {
    if (!normalizedCurrentPassword) {
      return NextResponse.json(
        { error: "La contraseña actual es obligatoria para este cambio." },
        { status: 400 }
      );
    }

    const isValidCurrentPassword = await bcrypt.compare(
      normalizedCurrentPassword,
      user.passwordHash
    );
    if (!isValidCurrentPassword) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta." },
        { status: 401 }
      );
    }
  }

  if (wantsEmailChange) {
    const existing = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    }).select("_id");

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email." },
        { status: 409 }
      );
    }
  }

  if (
    !wantsNameChange &&
    !wantsEmailChange &&
    !wantsPhoneChange &&
    !wantsDocumentIdChange &&
    !wantsPasswordChange
  ) {
    return NextResponse.json(
      { user: buildSafeUser(user), message: "No hay cambios para guardar." },
      { status: 200 }
    );
  }

  if (wantsNameChange) user.name = normalizedName;
  if (wantsEmailChange) user.email = normalizedEmail;
  if (wantsPhoneChange) user.phone = normalizedPhone;
  if (wantsDocumentIdChange) user.documentId = normalizedDocumentId;
  if (wantsPasswordChange) {
    user.passwordHash = await bcrypt.hash(normalizedNewPassword, 10);
    // Cierra las demás sesiones abiertas; esta se renueva abajo.
    user.sessionVersion = (user.sessionVersion || 0) + 1;
  }

  await user.save();

  const response = NextResponse.json(
    { user: buildSafeUser(user), message: "Perfil actualizado correctamente." },
    { status: 200 }
  );
  setSessionCookie(response, createSessionToken(user));

  return response;
}
