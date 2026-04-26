"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_ATTR = "data-google-gsi-client";
const GOOGLE_API_TIMEOUT_MS = 12000;
const GOOGLE_API_POLL_MS = 50;
const GOOGLE_BUTTON_TIMEOUT_MS = 6000;
const GOOGLE_BUTTON_POLL_MS = 50;
const GOOGLE_OAUTH_STATE_KEY = "google_oauth_state";
const GOOGLE_OAUTH_NONCE_KEY = "google_oauth_nonce";
const GOOGLE_OAUTH_PLAN_KEY = "google_oauth_plan";

let googleScriptPromise = null;

function getClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

function ensureGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window_unavailable"));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  const existing = document.querySelector(`script[${GOOGLE_SCRIPT_ATTR}]`);
  const script = existing || document.createElement("script");

  if (!existing) {
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute(GOOGLE_SCRIPT_ATTR, "true");
    document.head.appendChild(script);
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    let settled = false;
    let pollInterval = null;
    let timeoutId = null;

    const cleanup = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      script.removeEventListener("error", onScriptError);
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const onScriptError = () => {
      finish(new Error("script_error"));
    };

    script.addEventListener("error", onScriptError, { once: true });

    pollInterval = setInterval(() => {
      if (window.google?.accounts?.id) {
        finish();
      }
    }, GOOGLE_API_POLL_MS);

    timeoutId = setTimeout(() => {
      finish(new Error("google_api_timeout"));
    }, GOOGLE_API_TIMEOUT_MS);

    if (window.google?.accounts?.id) {
      finish();
    }
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

function hasRenderedGoogleButton(node) {
  if (!node) return false;
  if (node.childElementCount > 0) return true;
  return Boolean(node.querySelector("iframe, div[role='button']"));
}

function waitForRenderedGoogleButton(node) {
  return new Promise((resolve, reject) => {
    if (hasRenderedGoogleButton(node)) {
      resolve();
      return;
    }

    let settled = false;
    let intervalId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    intervalId = setInterval(() => {
      if (hasRenderedGoogleButton(node)) {
        finish();
      }
    }, GOOGLE_BUTTON_POLL_MS);

    timeoutId = setTimeout(() => {
      finish(new Error("google_button_timeout"));
    }, GOOGLE_BUTTON_TIMEOUT_MS);
  });
}

function createRandomToken() {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    ""
  );
}

function buildGoogleRedirectUrl({
  clientId,
  redirectUri,
  state,
  nonce,
}) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    state,
    nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default function GoogleAuthButton({
  mode = "login",
  plan = "inicio",
  onError,
  onStart,
  onDone,
}) {
  const router = useRouter();
  const buttonRef = useRef(null);
  const clientId = getClientId();
  const [isReady, setIsReady] = useState(false);
  const [localError, setLocalError] = useState("");
  const missingClientIdMessage =
    "Google Sign-In no está configurado. Definí NEXT_PUBLIC_GOOGLE_CLIENT_ID.";
  const missingClientId = !clientId;

  const handleError = useCallback((message) => {
    setLocalError(message || "No se pudo autenticar con Google.");
    onError?.(message || "No se pudo autenticar con Google.");
  }, [onError]);

  function handleStartRedirectFallback() {
    if (!clientId) {
      handleError(missingClientIdMessage);
      return;
    }

    if (typeof window === "undefined") {
      handleError("No se pudo iniciar OAuth con Google.");
      return;
    }

    const state = createRandomToken();
    const nonce = createRandomToken();
    const selectedPlan = String(plan || "inicio");
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    try {
      sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
      sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);
      sessionStorage.setItem(GOOGLE_OAUTH_PLAN_KEY, selectedPlan);
      onStart?.();
      setLocalError("");
      const url = buildGoogleRedirectUrl({
        clientId,
        redirectUri,
        state,
        nonce,
      });
      window.location.assign(url);
    } catch {
      onDone?.();
      handleError("No se pudo iniciar OAuth con Google.");
    }
  }

  useEffect(() => {
    let isActive = true;

    if (missingClientId) {
      onError?.(missingClientIdMessage);
      return () => {
        isActive = false;
      };
    }

    async function setupGoogleButton() {
      try {
        await ensureGoogleScript();
        if (!isActive || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) {
              handleError("Google no devolvió una credencial válida.");
              return;
            }

            onStart?.();
            setLocalError("");
            onError?.("");

            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential, plan }),
              });

              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                handleError(data.error || "No se pudo autenticar con Google.");
                onDone?.();
                return;
              }

              router.push("/dashboard");
              router.refresh();
            } catch {
              handleError("Error inesperado al autenticar con Google.");
              onDone?.();
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 340,
          text: mode === "register" ? "signup_with" : "signin_with",
          logo_alignment: "left",
        });

        await waitForRenderedGoogleButton(buttonRef.current);

        if (isActive) {
          setIsReady(true);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error && error.message === "google_api_timeout"
              ? "Google Sign-In tardó demasiado en cargar. Revisá bloqueadores/CSP e intentá recargar."
              : error instanceof Error &&
                  error.message === "google_button_timeout"
                ? "Google cargó pero no pudo mostrar el botón. Verificá Authorized JavaScript origins (incluí http://localhost:3000) y desactivá bloqueadores."
              : "No se pudo cargar Google Sign-In.";
          handleError(message);
        }
      }
    }

    setupGoogleButton();

    return () => {
      isActive = false;
    };
  }, [
    clientId,
    handleError,
    missingClientId,
    missingClientIdMessage,
    mode,
    onDone,
    onError,
    onStart,
    plan,
    router,
  ]);

  const visibleError = localError || (missingClientId ? missingClientIdMessage : "");

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <div ref={buttonRef} />
      </div>
      {!isReady && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 text-center">
            Cargando acceso con Google...
          </p>
          <button
            type="button"
            onClick={handleStartRedirectFallback}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:bg-slate-900 transition-colors"
          >
            Continuar con Google (alternativo)
          </button>
        </div>
      )}
      {visibleError && (
        <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {visibleError}
        </div>
      )}
    </div>
  );
}
