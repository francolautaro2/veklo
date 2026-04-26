"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el email.");
        setLoading(false);
        return;
      }

      setSuccess(data.message);
      setLoading(false);
      window.setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }, 900);
    } catch {
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight mb-2">
        Recuperar contraseña
      </h2>
      <p className="text-sm leading-5 text-slate-400 mb-6">
        Ingresá tu email y te vamos a enviar un código de 6 dígitos para
        continuar.
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Email</label>
          <input
            type="email"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="tu@hotel.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Enviando..." : "Enviar código"}
        </button>
      </form>

      <div className="mt-4 text-xs text-slate-400">
        <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
          Volver a iniciar sesión
        </Link>
      </div>
    </>
  );
}
