"use client";

// Último recurso: se muestra si falla el layout raíz.
export default function GlobalError({ reset }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "sans-serif", background: "#020617", color: "#f1f5f9", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>
            Probá de nuevo en unos segundos. Si sigue pasando, escribinos a hola@veklo.app.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: 0, background: "#10b981", color: "#020617", fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
