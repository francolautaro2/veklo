"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDateOnly } from "@/lib/date-only";

export default function PreCheckInPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({});

  function formatMoney(value) {
    const amount = Number(value || 0);
    if (!amount) return "$ 0";
    return `$ ${amount.toLocaleString("es-AR")}`;
  }

  function buildAnswerMap(fields, answers = []) {
    const initialAnswers = {};
    fields.forEach((field) => {
      initialAnswers[field.fieldId] = field.type === "boolean" ? false : "";
    });

    answers.forEach((answer) => {
      if (!answer?.fieldId) return;
      initialAnswers[answer.fieldId] = answer.value;
    });

    return initialAnswers;
  }

  function updateCustomAnswer(fieldId, value) {
    setCustomAnswers((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  useEffect(() => {
    if (!token) return;

    async function fetchBooking() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/precheckin/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "No se pudo cargar el pre check-in.");
          setLoading(false);
          return;
        }

        const nextBooking = data.booking;
        setBooking(nextBooking);
        setGuestName(nextBooking.guestName || "");
        setGuestEmail(nextBooking.guestEmail || "");
        setGuestPhone(nextBooking.guestPhone || "");
        setCustomFields(nextBooking.customFields || []);
        setCustomAnswers(
          buildAnswerMap(
            nextBooking.customFields || [],
            nextBooking.customAnswers || []
          )
        );
        setSuccess(nextBooking.preCheckInStatus === "completed");
        setLoading(false);
      } catch {
        setError("Error inesperado al cargar el pre check-in.");
        setLoading(false);
      }
    }

    fetchBooking();
  }, [token]);

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-800 bg-red-900/20 p-4">
          <p className="text-sm text-red-200">Token de pre check-in inválido.</p>
        </div>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/precheckin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestEmail,
          guestPhone,
          documentId,
          notes,
          customAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar el pre check-in.");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setSaving(false);
    } catch {
      setError("Error inesperado al guardar el pre check-in.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <p className="text-sm text-slate-300">Cargando pre check-in...</p>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-800 bg-red-900/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">Pre check-in digital</h1>
          <p className="text-xs text-slate-400">
            Completá tus datos antes de llegar para agilizar tu ingreso.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-1">
          <p className="text-slate-200 font-medium">
            {booking.propertyName} · {booking.roomName}
          </p>
          <p className="text-slate-400">
            Check-in: {formatDateOnly(booking.checkIn)}
          </p>
          <p className="text-slate-400">
            Check-out: {formatDateOnly(booking.checkOut)}
          </p>
          {booking.deposit?.status !== "not_required" && (
            <div className="pt-2 text-slate-300">
              <p>
                Seña:{" "}
                {booking.deposit?.amount
                  ? `$ ${booking.deposit.amount.toLocaleString("es-AR")}`
                  : "a confirmar"}
              </p>
              {booking.deposit?.paymentLink && (
                <a
                  href={booking.deposit.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Pagar seña
                </a>
              )}
            </div>
          )}
        </section>

        {success && (
          <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 p-3 text-xs text-emerald-200">
            Pre check-in completado correctamente.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-900/20 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Nombre completo</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Teléfono</label>
              <input
                type="text"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Documento</label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="DNI / Pasaporte"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {customFields.length > 0 && (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Extras y preferencias
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Completá las opciones solicitadas por el alojamiento.
                </p>
              </div>

              {customFields.map((field) => (
                <div key={field.fieldId} className="space-y-1">
                  <label className="flex items-center justify-between gap-3 text-xs text-slate-300">
                    <span>
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-emerald-300">*</span>
                      )}
                    </span>
                    {field.hasCost && (
                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                        + {formatMoney(field.cost)}
                      </span>
                    )}
                  </label>

                  {field.type === "boolean" ? (
                    <select
                      value={customAnswers[field.fieldId] ? "true" : "false"}
                      onChange={(event) =>
                        updateCustomAnswer(
                          field.fieldId,
                          event.target.value === "true"
                        )
                      }
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={customAnswers[field.fieldId] || ""}
                      onChange={(event) =>
                        updateCustomAnswer(field.fieldId, event.target.value)
                      }
                      rows={3}
                      required={field.required}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={customAnswers[field.fieldId] || ""}
                      onChange={(event) =>
                        updateCustomAnswer(field.fieldId, event.target.value)
                      }
                      required={field.required}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold px-4 py-2 hover:bg-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Guardando..." : "Confirmar pre check-in"}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Tus datos los recibe {booking.propertyName} para gestionar tu
              estadía, a través de veklo. Más información en nuestra{" "}
              <a
                href="/privacidad"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                política de privacidad
              </a>
              .
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
