"use client";

import { useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

export default function RevocationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/legal/arrepentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, details }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "No se pudo registrar el pedido.");
        return;
      }

      setResult(data);
    } catch {
      setError("Error de conexión. Probá de nuevo o escribinos por email.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 p-4 text-sm text-emerald-100">
        <p className="font-semibold">Recibimos tu pedido.</p>
        <p className="mt-2">
          Tu código de trámite es{" "}
          <span className="font-mono font-bold tracking-wider">{result.code}</span>.
          Guardalo para cualquier consulta.
        </p>
        {result.emailSent && (
          <p className="mt-2 text-emerald-200/80">
            También te lo enviamos por email.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="revocation-name" className="text-xs text-slate-300">
          Nombre y apellido
        </label>
        <input
          id="revocation-name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="revocation-email" className="text-xs text-slate-300">
          Email de tu cuenta en veklo
        </label>
        <input
          id="revocation-email"
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="revocation-details" className="text-xs text-slate-300">
          Comentarios (opcional)
        </label>
        <textarea
          id="revocation-details"
          rows={3}
          maxLength={2000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
      >
        {sending ? "Enviando..." : "Solicitar la revocación"}
      </button>
    </form>
  );
}
