"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo verificar el email.");
        setLoading(false);
        return;
      }

      setSuccess(data.message);
      setLoading(false);
      window.setTimeout(() => router.push("/auth/login"), 1000);
    } catch {
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo reenviar el código.");
        setResending(false);
        return;
      }

      setSuccess(data.message);
      setResending(false);
    } catch {
      setError("Error inesperado. Intentalo de nuevo.");
      setResending(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight mb-2">
        Verificá tu email
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Ingresá el código de 6 dígitos que te enviamos.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Email</label>
          <input
            type="email"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="tu@hotel.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Código</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm tracking-[0.35em] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Verificando..." : "Verificar email"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="mt-3 w-full px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-200 hover:bg-slate-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {resending ? "Reenviando..." : "Reenviar código"}
      </button>

      <div className="mt-4 text-xs text-slate-400">
        <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
          Volver a iniciar sesión
        </Link>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-300">Cargando...</p>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
