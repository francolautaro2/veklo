"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Algo salió mal</h1>
        <p className="text-sm text-slate-400">
          Tuvimos un problema al mostrar esta página. Probá de nuevo; si sigue
          pasando, escribinos a hola@veklo.app.
        </p>
        {error?.digest && (
          <p className="text-[11px] text-slate-500">Código de error: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-800"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
