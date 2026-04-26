"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoogleAuthButton from "@/app/auth/_components/google-auth-button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED" && data.email) {
          router.push(
            `/auth/verify-email?email=${encodeURIComponent(data.email)}`
          );
          return;
        }
        setError(data.error || "Credenciales inválidas.");
        setLoading(false);
        return;
      }

      // Login OK → al dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight mb-2">
        Iniciar sesión
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Accedé a tu panel para gestionar tus propiedades.
      </p>

      {error && (
        <div className="mb-4 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <GoogleAuthButton
        mode="login"
        onError={handleGoogleError}
        onStart={handleGoogleStart}
        onDone={handleGoogleDone}
      />

      <div className="my-4 flex items-center gap-2 text-[11px] text-slate-500">
        <div className="h-px flex-1 bg-slate-800" />
        <span>o ingresá con email</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-4 text-xs text-slate-400 flex items-center justify-between">
        <span>¿No tenés cuenta?</span>
        <Link
          href="/auth/register"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Crear cuenta
        </Link>
      </div>

      <div className="mt-3 text-right">
        <Link
          href="/auth/forgot-password"
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Olvidé mi contraseña
        </Link>
      </div>
    </>
  );
}
