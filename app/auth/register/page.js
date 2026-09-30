"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoogleAuthButton from "@/app/auth/_components/google-auth-button";
import {
  DEFAULT_PLAN,
  PLAN_LIMITS,
  formatPlanPrice,
  normalizePlan,
} from "@/lib/subscription";

const PLAN_OPTIONS = Object.values(PLAN_LIMITS);

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PLAN;
    const params = new URLSearchParams(window.location.search);
    return normalizePlan(params.get("plan"));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleStart = useCallback(() => {
    setLoading(true);
  }, []);

  const handleGoogleDone = useCallback(() => {
    setLoading(false);
  }, []);

  const handleGoogleError = useCallback((message) => {
    setError(message || "No se pudo autenticar con Google.");
    setLoading(false);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse.");
        setLoading(false);
        return;
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error(err);
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight mb-2">
        Crear cuenta
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Empezá a centralizar la gestión de tus hoteles en minutos.
      </p>
      <p className="text-[11px] text-emerald-300 mb-4">
        Prueba gratuita de 14 días incluida.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <GoogleAuthButton
        mode="register"
        plan={plan}
        onError={handleGoogleError}
        onStart={handleGoogleStart}
        onDone={handleGoogleDone}
      />

      <div className="my-4 flex items-center gap-2 text-[11px] text-slate-500">
        <div className="h-px flex-1 bg-slate-800" />
        <span>o registrate con email</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Nombre completo</label>
          <input
            type="text"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Juan Pérez"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Email</label>
          <input
            type="email"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="tu@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Contraseña</label>
          <input
            type="password"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Plan inicial</label>
          <select
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} · {formatPlanPrice(option.key)} / mes ·{" "}
                {option.description}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Al crear tu cuenta aceptás los{" "}
          <Link href="/terminos" className="text-emerald-400 hover:text-emerald-300">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="text-emerald-400 hover:text-emerald-300">
            Política de privacidad
          </Link>
          .
        </p>
      </form>

      <div className="mt-4 text-xs text-slate-400 flex items-center justify-between">
        <span>¿Ya tenés cuenta?</span>
        <Link
          href="/auth/login"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Iniciar sesión
        </Link>
      </div>
    </>
  );
}
