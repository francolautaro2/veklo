"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const OAUTH_STATE_KEY = "google_oauth_state";
const OAUTH_NONCE_KEY = "google_oauth_nonce";
const OAUTH_PLAN_KEY = "google_oauth_plan";

function readHashParams() {
  const raw = typeof window !== "undefined" ? window.location.hash : "";
  const hash = raw.startsWith("#") ? raw.slice(1) : raw;
  const params = new URLSearchParams(hash);
  return {
    idToken: params.get("id_token") || "",
    state: params.get("state") || "",
    error: params.get("error") || "",
    errorDescription: params.get("error_description") || "",
  };
}

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Procesando acceso con Google...");
  const [error, setError] = useState("");

  const fallbackHref = useMemo(() => "/auth/login", []);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      if (typeof window === "undefined") return;

      const { idToken, state, error: oauthError, errorDescription } =
        readHashParams();

      const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY) || "";
      const nonce = sessionStorage.getItem(OAUTH_NONCE_KEY) || "";
      const plan = sessionStorage.getItem(OAUTH_PLAN_KEY) || "inicio";

      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_NONCE_KEY);
      sessionStorage.removeItem(OAUTH_PLAN_KEY);

      if (oauthError) {
        setError(
          `Google devolvió un error: ${oauthError}${errorDescription ? ` (${errorDescription})` : ""}.`
        );
        return;
      }

      if (!idToken) {
        setError("Google no devolvió un token de acceso válido.");
        return;
      }

      if (!state || !expectedState || state !== expectedState) {
        setError("No se pudo validar el estado de seguridad de Google OAuth.");
        return;
      }

      try {
        setStatus("Validando cuenta de Google...");

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: idToken,
            plan,
            nonce,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "No se pudo completar el acceso con Google.");
          return;
        }

        if (cancelled) return;

        setStatus("Acceso exitoso. Redirigiendo...");
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setError("Error inesperado al completar Google OAuth.");
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">
          Acceso con Google
        </h1>

        {error ? (
          <div className="space-y-4">
            <div className="text-sm text-red-200 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
            <Link
              href={fallbackHref}
              className="inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-300">{status}</p>
        )}
      </div>
    </div>
  );
}
