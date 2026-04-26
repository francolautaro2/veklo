"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const email = initialEmail;
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Pedí un código de recuperación antes de continuar.");
      return;
    }

    if (!code.trim()) {
      setError("Ingresá el código que recibiste por email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo verificar el código.");
        setLoading(false);
        return;
      }

      setCodeVerified(true);
      setSuccess(data.message);
      setLoading(false);
    } catch {
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }

      setSuccess(data.message);
      setLoading(false);
      window.setTimeout(() => router.push("/auth/login"), 1200);
    } catch {
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight mb-2">
        {codeVerified ? "Nueva contraseña" : "Verificá tu código"}
      </h2>
      <p className="text-sm leading-5 text-slate-400 mb-6">
        {codeVerified
          ? "Elegí una contraseña segura para volver a entrar a tu panel."
          : "Ingresá el código de 6 dígitos que te enviamos por email."}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {!codeVerified ? (
        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Código</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-center text-lg font-semibold tracking-[0.35em] text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="123456"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Verificar código"}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleChangePassword}>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Nueva contraseña</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Repetí la contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      )}

      <div className="mt-4 text-xs text-slate-400">
        <Link
          href="/auth/forgot-password"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Pedir otro código
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-300">Cargando recuperación...</p>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
