"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/dashboard/_components/theme-toggle";
import {
  DEFAULT_PLAN,
  PLAN_LIMITS,
  formatPlanPrice,
  normalizePlan,
} from "@/lib/subscription";

const STATUS_LABEL = {
  trialing: "En prueba",
  active: "Activo",
  paused: "Pausado",
};

const PLAN_OPTIONS = Object.values(PLAN_LIMITS);

const STATUS_BADGE_CLASS = {
  trialing: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  paused: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function calculateTrialDaysLeft(value) {
  if (!value) return null;
  const end = new Date(value);
  if (isNaN(end.getTime())) return null;
  const msLeft = end.getTime() - Date.now();
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [syncingBilling, setSyncingBilling] = useState(false);
  const [cancellingBilling, setCancellingBilling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLAN);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const currentPlan = normalizePlan(profile?.plan);
  const currentStatus = profile?.subscriptionStatus || "trialing";
  const statusLabel = STATUS_LABEL[currentStatus] || currentStatus;
  const statusBadgeClass =
    STATUS_BADGE_CLASS[currentStatus] ||
    "border-slate-700 bg-slate-800/60 text-slate-200";

  const hasSubscriptionId = Boolean(profile?.subscriptionExternalId);
  const nextChargeLabel = formatDateTime(profile?.subscriptionCurrentPeriodEnd);
  const lastSyncLabel = formatDateTime(profile?.subscriptionLastWebhookAt);

  const trialToneClass =
    typeof trialDaysLeft !== "number"
      ? "text-slate-400"
      : trialDaysLeft > 7
        ? "text-emerald-300"
        : trialDaysLeft > 3
          ? "text-amber-300"
          : "text-rose-300";

  function applyBillingState(nextBilling) {
    if (!nextBilling) return;

    setProfile((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        plan: nextBilling.plan ?? prev.plan,
        subscriptionStatus:
          nextBilling.subscriptionStatus ?? prev.subscriptionStatus,
        subscriptionProvider:
          nextBilling.subscriptionProvider ?? prev.subscriptionProvider ?? null,
        subscriptionExternalId:
          nextBilling.subscriptionExternalId ?? prev.subscriptionExternalId ?? "",
        subscriptionCurrentPeriodEnd:
          nextBilling.subscriptionCurrentPeriodEnd ??
          prev.subscriptionCurrentPeriodEnd ??
          null,
        subscriptionLastWebhookAt:
          nextBilling.subscriptionLastWebhookAt ??
          prev.subscriptionLastWebhookAt ??
          null,
        trialEndsAt: nextBilling.trialEndsAt ?? prev.trialEndsAt ?? null,
      };
    });

    if (nextBilling.plan) {
      setSelectedPlan(nextBilling.plan);
    }

    if (Object.prototype.hasOwnProperty.call(nextBilling, "trialEndsAt")) {
      setTrialDaysLeft(calculateTrialDaysLeft(nextBilling.trialEndsAt));
    }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/account/profile");
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo cargar el perfil.");
          setLoading(false);
          return;
        }

        setProfile(data.user);
        setTrialDaysLeft(calculateTrialDaysLeft(data.user.trialEndsAt));
        setSelectedPlan(normalizePlan(data.user.plan));
        setName(data.user.name || "");
        setEmail(data.user.email || "");
        setPhone(data.user.phone || "");
        setDocumentId(data.user.documentId || "");
        setLoading(false);
      } catch {
        setError("Error inesperado al cargar perfil.");
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("La confirmación de contraseña no coincide.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        email,
        phone,
        documentId,
      };

      if (currentPassword) payload.currentPassword = currentPassword;
      if (newPassword) payload.newPassword = newPassword;

      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setSaving(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el perfil.");
        setSaving(false);
        return;
      }

      setProfile(data.user);
      setTrialDaysLeft(calculateTrialDaysLeft(data.user.trialEndsAt));
      setName(data.user.name || "");
      setEmail(data.user.email || "");
      setPhone(data.user.phone || "");
      setDocumentId(data.user.documentId || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(data.message || "Perfil actualizado correctamente.");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Error inesperado al actualizar perfil.");
      setSaving(false);
    }
  }

  async function handleStartCheckout() {
    setError("");
    setSuccess("");
    setStartingCheckout(true);

    try {
      const res = await fetch("/api/billing/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setStartingCheckout(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar checkout con MercadoPago.");
        setStartingCheckout(false);
        return;
      }

      if (data.subscription) {
        applyBillingState({
          plan: data.subscription.plan,
          subscriptionStatus: data.subscription.status,
          subscriptionProvider: "mercadopago",
          subscriptionExternalId: data.subscription.id,
        });
      }

      if (!data.checkoutUrl) {
        setError("MercadoPago no devolvió URL de checkout.");
        setStartingCheckout(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Error inesperado al iniciar checkout.");
      setStartingCheckout(false);
    }
  }

  async function handleSyncBilling() {
    setError("");
    setSuccess("");
    setSyncingBilling(true);

    try {
      const res = await fetch("/api/billing/mercadopago/sync", {
        method: "POST",
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setSyncingBilling(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo sincronizar la suscripción.");
        setSyncingBilling(false);
        return;
      }

      applyBillingState(data.billing);
      setSuccess("Suscripción sincronizada correctamente.");
      setSyncingBilling(false);
    } catch {
      setError("Error inesperado al sincronizar la suscripción.");
      setSyncingBilling(false);
    }
  }

  async function handleCancelBilling() {
    if (!confirm("¿Seguro que querés cancelar tu suscripción en MercadoPago?")) {
      return;
    }

    setError("");
    setSuccess("");
    setCancellingBilling(true);

    try {
      const res = await fetch("/api/billing/mercadopago/cancel", {
        method: "POST",
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setCancellingBilling(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cancelar la suscripción.");
        setCancellingBilling(false);
        return;
      }

      applyBillingState(data.billing);
      setSuccess("Suscripción cancelada.");
      setCancellingBilling(false);
    } catch {
      setError("Error inesperado al cancelar suscripción.");
      setCancellingBilling(false);
    }
  }

  async function handleCopySubscriptionId() {
    if (!profile?.subscriptionExternalId) return;

    try {
      await navigator.clipboard.writeText(profile.subscriptionExternalId);
      setSuccess("ID de suscripción copiado al portapapeles.");
    } catch {
      setError("No se pudo copiar el ID de suscripción.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Cargando configuración de perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Perfil</h2>
          <p className="text-sm text-slate-400">
            Gestioná cuenta, seguridad y estado de facturación.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusBadgeClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabel}
        </div>
      </header>

      {error && (
        <div className="text-sm text-red-200 bg-red-900/25 border border-red-700/60 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-emerald-200 bg-emerald-900/20 border border-emerald-700/60 rounded-xl px-4 py-3">
          {success}
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Preferencias
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ajustes visuales de tu panel.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section
        id="suscripcion"
        className="scroll-mt-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-100">Suscripción</h3>
          <p className="text-xs text-slate-400">
            Tu plan se actualiza desde MercadoPago. Si pagaste recién, sincronizá
            estado.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] text-slate-400 mb-1">Plan actual</p>
            <p className="text-base font-semibold text-slate-100">
              {PLAN_LIMITS[currentPlan].label}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {PLAN_LIMITS[currentPlan].description}
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] text-slate-400 mb-1">Fin de prueba</p>
            <p className="text-base font-semibold text-slate-100">
              {formatDate(profile?.trialEndsAt)}
            </p>
            {typeof trialDaysLeft === "number" && (
              <p className={`text-[11px] mt-1 ${trialToneClass}`}>
                {trialDaysLeft > 0
                  ? `${trialDaysLeft} día(s) restantes`
                  : "Prueba finalizada"}
              </p>
            )}
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] text-slate-400 mb-1">Próximo cobro</p>
            <p className="text-sm font-semibold text-slate-100">{nextChargeLabel}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Proveedor: {profile?.subscriptionProvider || "-"}
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-[11px] text-slate-400 mb-1">Última sincronización</p>
            <p className="text-sm font-semibold text-slate-100">{lastSyncLabel}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Estado actual: {statusLabel}
            </p>
          </article>
        </div>

        <div className="pt-4 border-t border-slate-800 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">
                Plan a contratar
              </label>
              <select
                value={selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {PLAN_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} · {formatPlanPrice(option.key)} / mes
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {PLAN_LIMITS[normalizePlan(selectedPlan)].description}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-medium">ID de suscripción</p>
              <div className="flex gap-2">
                <p className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 break-all">
                  {profile?.subscriptionExternalId || "Sin suscripción vinculada"}
                </p>
                <button
                  type="button"
                  onClick={handleCopySubscriptionId}
                  disabled={!hasSubscriptionId}
                  className="px-3 rounded-lg border border-slate-700 text-xs text-slate-200 hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copiar
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Usalo para soporte o validaciones manuales.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={startingCheckout}
              className="w-full px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {startingCheckout ? "Redirigiendo..." : "Abrir MercadoPago"}
            </button>

            <button
              type="button"
              onClick={handleSyncBilling}
              disabled={syncingBilling}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {syncingBilling ? "Sincronizando..." : "Sincronizar estado"}
            </button>

            <button
              type="button"
              onClick={handleCancelBilling}
              disabled={cancellingBilling || !hasSubscriptionId}
              className="w-full px-4 py-2.5 rounded-lg border border-red-700 text-sm text-red-300 hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancellingBilling ? "Cancelando..." : "Cancelar suscripción"}
            </button>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        id="datos-personales"
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Modificar perfil
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Actualizá tus datos personales y de acceso.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">
              Documento
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="DNI / Pasaporte"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Nombre completo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Cambiar contraseña</h4>
            <p className="text-xs text-slate-500 mt-1">
              Para cambiar email o contraseña, ingresá tu contraseña actual.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Contraseña actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Tu contraseña actual"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Repetí la nueva contraseña"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
