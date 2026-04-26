// app/dashboard/page.js
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BrandLogo from "@/app/_components/brand-logo";

const BRAND_COLOR = "#D85A30";
const SPARKLINE_DATA = {
  pending: [42, 45, 39, 54, 58, 61, 67],
  occupancy: [30, 38, 42, 48, 44, 55, 63],
  active: [8, 10, 9, 11, 12, 12, 14],
  revenue: [22, 28, 26, 36, 34, 45, 52],
};
const AGENDA_TABS = [
  { value: "today", label: "Hoy" },
  { value: "tomorrow", label: "Mañana" },
  { value: "week", label: "Esta semana" },
];
const TREND_TABS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];
const PAYMENT_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "overdue", label: "Vencidos" },
  { value: "next7", label: "Próximos 7 días" },
];
const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "otro", label: "Otro" },
];

/**
 * TypeScript shape del contrato de pagos manuales:
 *
 * type EstadoPago = "pendiente" | "pagado" | "parcial";
 * type MetodoPago = "efectivo" | "transferencia" | "mercadopago" | "otro";
 *
 * type BookingPaymentFields = {
 *   monto_total: number;
 *   estado_pago: EstadoPago;
 *   fecha_pago: string | null;
 *   metodo_pago: MetodoPago | null;
 *   monto_pagado: number;
 *   fecha_vencimiento_pago: string | null;
 *   notas_pago?: string;
 * };
 *
 * PATCH /api/bookings/:id
 * body: Pick<BookingPaymentFields,
 *   "estado_pago" | "fecha_pago" | "metodo_pago" | "monto_pagado" | "notas_pago"
 * >
 * response: { booking: Booking & BookingPaymentFields }
 *
 * deposit.{amount,status,paidAt} se mantiene como fallback de lectura para
 * reservas creadas antes de la migración de pagos manuales.
 */

/**
 * @typedef {Object} KpiCardProps
 * @property {string} title
 * @property {string} value
 * @property {string} subtitle
 * @property {boolean} [warning]
 */

/**
 * @typedef {Object} AgendaItem
 * @property {string} id
 * @property {string} guestName
 * @property {string} propertyName
 * @property {string} roomName
 * @property {string} time
 * @property {"pagado" | "pendiente" | "parcial"} paymentStatus
 * @property {boolean} paymentOverdue
 */

function formatCurrency(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100) / 100;
}

function getBookingId(booking) {
  return String(booking._id || booking.id);
}

function getGuestLastName(name) {
  if (!name) return "Huésped";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateOffset(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isCurrentMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function getBookingNights(booking) {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 0;
  }

  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return 0;

  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function getPaymentInfo(booking) {
  const explicitTotal =
    booking.monto_total ??
    booking.totalAmount ??
    booking.total_amount ??
    booking.amountTotal;
  const fallbackTotal = booking.deposit?.amount ?? 0;
  const total = parseMoney(explicitTotal ?? fallbackTotal);

  const explicitPaid =
    booking.monto_pagado ??
    booking.paidAmount ??
    booking.paid_amount ??
    booking.amountPaid;
  const fallbackPaid = booking.deposit?.status === "paid" ? total : 0;
  const paid = Math.min(parseMoney(explicitPaid ?? fallbackPaid), total);

  const fallbackStatus =
    booking.deposit?.status === "paid"
      ? "pagado"
      : booking.deposit?.status === "pending"
        ? "pendiente"
        : total > 0 && paid < total
          ? "pendiente"
          : "pagado";

  const status = booking.estado_pago || booking.paymentStatus || fallbackStatus;
  const dueDate =
    booking.fecha_vencimiento_pago || booking.paymentDueAt || booking.dueDate || null;
  const paidAt = booking.fecha_pago || booking.paymentPaidAt || booking.deposit?.paidAt || null;
  const method = booking.metodo_pago || booking.paymentMethod || null;
  const pending = Math.max(total - paid, 0);
  const isOverdue =
    status !== "pagado" &&
    dueDate &&
    new Date(dueDate).getTime() < getDateOffset(0).getTime();

  return {
    total,
    paid,
    pending,
    status,
    dueDate,
    paidAt,
    method,
    isOverdue: Boolean(isOverdue),
  };
}

function enrichBooking(booking, roomMap, propertyMap) {
  const payment = getPaymentInfo(booking);
  return {
    ...booking,
    bookingId: getBookingId(booking),
    propertyName:
      propertyMap.get(String(booking.propertyId))?.name ||
      booking.propertyName ||
      "Propiedad",
    roomName:
      roomMap.get(String(booking.roomId))?.name ||
      booking.roomName ||
      "Habitación",
    payment,
  };
}

function getAgendaForTab(bookings, tab, roomMap, propertyMap) {
  const today = getDateOffset(0);
  const tomorrow = getDateOffset(1);
  const weekEnd = getDateOffset(7);

  const matchesTab = (date) => {
    if (tab === "today") return isSameDay(date, today);
    if (tab === "tomorrow") return isSameDay(date, tomorrow);
    return date >= today && date < weekEnd;
  };

  const mapBooking = (booking, type) => {
    const enriched = enrichBooking(booking, roomMap, propertyMap);
    return {
      id: `${enriched.bookingId}-${type}`,
      guestName: enriched.guestName,
      roomName: enriched.roomName,
      propertyName: enriched.propertyName,
      time: formatTime(type === "in" ? enriched.checkIn : enriched.checkOut),
      paymentStatus: enriched.payment.status,
      paymentOverdue: enriched.payment.isOverdue,
    };
  };

  return {
    checkIns: bookings
      .filter((booking) => booking.status !== "cancelled")
      .filter((booking) => matchesTab(new Date(booking.checkIn)))
      .map((booking) => mapBooking(booking, "in")),
    checkOuts: bookings
      .filter((booking) => booking.status !== "cancelled")
      .filter((booking) => matchesTab(new Date(booking.checkOut)))
      .map((booking) => mapBooking(booking, "out")),
  };
}

function getDashboardMetrics(bookings) {
  const today = getDateOffset(0);
  const in30Days = getDateOffset(30);
  const payableBookings = bookings.filter((booking) => booking.status !== "cancelled");

  const currentMonthPaidBookings = bookings.filter((booking) => {
    const payment = getPaymentInfo(booking);
    return (
      payment.paid > 0 &&
      (payment.status === "pagado" || payment.status === "parcial") &&
      isCurrentMonth(payment.paidAt || booking.updatedAt || booking.createdAt)
    );
  });

  const collectedThisMonth = currentMonthPaidBookings.reduce(
    (sum, booking) => sum + getPaymentInfo(booking).paid,
    0
  );

  const pendingBookings = bookings.filter((booking) => {
    const payment = getPaymentInfo(booking);
    return payment.status !== "pagado" && payment.pending > 0;
  });

  const pendingTotal = pendingBookings.reduce(
    (sum, booking) => sum + getPaymentInfo(booking).pending,
    0
  );

  const activeReservations = bookings.filter((booking) => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    return (
      booking.status !== "cancelled" &&
      !Number.isNaN(checkIn.getTime()) &&
      !Number.isNaN(checkOut.getTime()) &&
      checkOut >= today &&
      checkIn < in30Days
    );
  }).length;

  const bookedNights = payableBookings.reduce(
    (sum, booking) => sum + getBookingNights(booking),
    0
  );

  const upcomingNights = payableBookings
    .filter((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      return (
        !Number.isNaN(checkIn.getTime()) &&
        !Number.isNaN(checkOut.getTime()) &&
        checkOut >= today &&
        checkIn < in30Days
      );
    })
    .reduce((sum, booking) => sum + getBookingNights(booking), 0);

  const bookedRevenue = payableBookings.reduce(
    (sum, booking) => sum + getPaymentInfo(booking).total,
    0
  );
  const averageNightlyRate =
    bookedNights > 0 ? Math.round(bookedRevenue / bookedNights) : 0;

  return {
    collectedThisMonth,
    collectedCount: currentMonthPaidBookings.length,
    pendingTotal,
    pendingCount: pendingBookings.length,
    activeReservations,
    bookedNights,
    upcomingNights,
    bookedRevenue,
    averageNightlyRate,
  };
}

function getPendingPayments(bookings, roomMap, propertyMap) {
  return bookings
    .map((booking) => enrichBooking(booking, roomMap, propertyMap))
    .filter(
      (booking) =>
        booking.status !== "cancelled" &&
        booking.payment.status !== "pagado" &&
        booking.payment.pending > 0
    )
    .sort((a, b) => {
      if (a.payment.isOverdue !== b.payment.isOverdue) {
        return a.payment.isOverdue ? -1 : 1;
      }
      return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
    });
}

/** @param {KpiCardProps} props */
function KpiSparkline({ data = SPARKLINE_DATA.revenue, prominent = false }) {
  return (
    <div className={prominent ? "h-14 w-32" : "h-9 w-24"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((value, index) => ({ index, value }))}>
          <defs>
            <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_COLOR} stopOpacity={0.24} />
              <stop offset="100%" stopColor={BRAND_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="value"
            stroke={BRAND_COLOR}
            strokeOpacity={0.72}
            strokeWidth={prominent ? 2.5 : 2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  warning = false,
  featured = false,
  sparkline = SPARKLINE_DATA.revenue,
  index = 0,
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, borderColor: "rgba(249,115,22,0.3)" }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
      className={`relative overflow-hidden rounded-xl border p-4 shadow-2xl shadow-black/40 ${
        featured ? "min-h-40 xl:col-span-2" : "min-h-40"
      } ${
        warning
          ? "border-[color:var(--warning)]/40 bg-amber-500/10"
          : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <p className="mb-3 text-[11px] font-medium text-slate-400">{title}</p>
      <p
        className={`vk-display font-semibold ${
          featured ? "text-4xl" : "text-3xl"
        } ${
          warning ? "text-amber-100" : "text-slate-100"
        }`}
      >
        {value}
      </p>
      <p className="mt-3 max-w-[13rem] text-[11px] text-slate-500">{subtitle}</p>
      <div className="absolute bottom-3 right-3 opacity-90">
        <KpiSparkline data={sparkline} prominent={featured} />
      </div>
    </motion.article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="vk-shimmer h-40 rounded-xl lg:col-span-2" />
      <div className="vk-shimmer h-40 rounded-xl" />
      <div className="vk-shimmer h-40 rounded-xl" />
      <div className="vk-shimmer h-40 rounded-xl" />
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div>
      <h2 className="vk-section-title vk-display text-sm font-semibold text-slate-100">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}
    </div>
  );
}

function MetricStrip({ metrics }) {
  return (
    <div className="mt-4 grid gap-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <div key={metric.title} className="relative p-4">
          {index > 0 && (
            <div className="absolute left-0 top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent sm:block" />
          )}
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            {metric.title}
          </p>
          <p className="vk-display mt-2 text-xl font-semibold text-slate-100">
            {metric.value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{metric.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

function OnboardingCard({ steps }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Primeros pasos</h2>
        <p className="text-xs text-slate-400">
          Completá la configuración base para empezar a operar desde el panel.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                  step.done
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-600 text-slate-500"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <p className="text-xs font-medium text-slate-100">{step.label}</p>
            </div>
            <Link
              href={step.href}
              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              {step.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function PropertyDropdown({
  properties,
  selectedPropertyId,
  propertiesCount,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const selectedProperty = properties.find(
    (property) => String(property._id) === selectedPropertyId
  );
  const label =
    selectedProperty?.name ||
    `Todas las propiedades (${propertiesCount || properties.length})`;

  return (
    <div className="relative space-y-1">
      <label className="block text-[11px] text-slate-300">Ver métricas de</label>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-100 shadow-lg shadow-black/20 outline-none transition-colors hover:border-orange-500/30 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 sm:w-72"
      >
        <span className="truncate">{label}</span>
        <span className="text-slate-500">{open ? "↑" : "↓"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl shadow-black/50 backdrop-blur sm:w-72"
          >
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.04]"
            >
              Todas las propiedades
              {selectedPropertyId === "all" && (
                <span className="text-orange-300">✓</span>
              )}
            </button>
            {properties.map((property) => (
              <button
                key={property._id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(property._id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.04]"
              >
                <span className="truncate">{property.name}</span>
                {String(property._id) === selectedPropertyId && (
                  <span className="text-orange-300">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  bookings,
  properties,
  rooms,
  pendingPayments,
  onSelectProperty,
}) {
  const router = useRouter();
  const visibleBookings = bookings.slice(0, 8);

  function run(action) {
    onOpenChange(false);
    action();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Cerrar búsqueda"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-command-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-3 top-10 mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur md:top-24"
          >
            <h2 id="dashboard-command-title" className="sr-only">
              Acciones rápidas
            </h2>
            <Command
              label="Acciones rápidas"
              loop
              className="max-h-[82vh] overflow-hidden"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  onOpenChange(false);
                }
              }}
            >
              <div className="border-b border-white/10 p-3">
                <Command.Input
                  autoFocus
                  placeholder="Buscar reservas, habitaciones o acciones..."
                  className="w-full bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
              <Command.List className="max-h-[70vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-xs text-slate-500">
                  No encontramos resultados.
                </Command.Empty>

                <Command.Group
                  heading="Acciones rápidas"
                  className="text-[11px] text-slate-500"
                >
                  <Command.Item
                    value="nueva reserva crear booking"
                    onSelect={() => run(() => router.push("/dashboard/bookings"))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                  >
                    Nueva reserva
                  </Command.Item>
                  <Command.Item
                    value="ver pagos vencidos pendientes"
                    onSelect={() => run(() => router.push("/dashboard"))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                  >
                    Ver pagos vencidos (
                    {
                      pendingPayments.filter((item) => item.payment.isOverdue)
                        .length
                    }
                    )
                  </Command.Item>
                  <Command.Item
                    value="calendario ocupacion timeline"
                    onSelect={() => run(() => router.push("/dashboard/calendar"))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                  >
                    Abrir calendario
                  </Command.Item>
                </Command.Group>

                <Command.Group
                  heading="Reservas"
                  className="mt-2 text-[11px] text-slate-500"
                >
                  {visibleBookings.map((booking) => (
                    <Command.Item
                      key={booking.bookingId}
                      value={`${booking.guestName} ${booking.propertyName} ${booking.roomName}`}
                      onSelect={() => run(() => router.push("/dashboard/bookings"))}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                    >
                      <span className="truncate">{booking.guestName}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {booking.propertyName} · {booking.roomName}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Propiedades"
                  className="mt-2 text-[11px] text-slate-500"
                >
                  <Command.Item
                    value="todas las propiedades cambiar propiedad"
                    onSelect={() => run(() => onSelectProperty("all"))}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                  >
                    Todas las propiedades
                  </Command.Item>
                  {properties.map((property) => (
                    <Command.Item
                      key={property._id}
                      value={`cambiar propiedad ${property.name}`}
                      onSelect={() => run(() => onSelectProperty(property._id))}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                    >
                      {property.name}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Habitaciones"
                  className="mt-2 text-[11px] text-slate-500"
                >
                  {rooms.slice(0, 10).map((room) => (
                    <Command.Item
                      key={room._id}
                      value={`habitacion ${room.name}`}
                      onSelect={() => run(() => router.push("/dashboard/rooms"))}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-orange-100"
                    >
                      {room.name}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PaymentStatusDot({ status, overdue }) {
  const color = overdue
    ? "var(--danger)"
    : status === "pagado"
      ? "var(--success)"
      : "var(--warning)";

  return (
    <span
      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={overdue ? "Pago vencido" : status}
    />
  );
}

function PendingPaymentsCard({ payments, properties, onOpenPayment }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [settlingId, setSettlingId] = useState("");
  const totalPending = payments.reduce(
    (sum, booking) => sum + booking.payment.pending,
    0
  );
  const today = getDateOffset(0);
  const nextSevenDays = addDays(today, 7);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredPayments = payments.filter((booking) => {
    const guestMatches =
      !normalizedSearch ||
      booking.guestName?.toLowerCase().includes(normalizedSearch);
    const propertyMatches =
      propertyFilter === "all" || String(booking.propertyId) === propertyFilter;
    const dueDate = booking.payment.dueDate
      ? new Date(booking.payment.dueDate)
      : new Date(booking.checkIn);
    const filterMatches =
      filter === "all" ||
      (filter === "overdue" && booking.payment.isOverdue) ||
      (filter === "next7" &&
        dueDate >= today &&
        dueDate <= nextSevenDays &&
        !booking.payment.isOverdue);

    return guestMatches && propertyMatches && filterMatches;
  });
  const visiblePayments = filteredPayments.slice(0, 20);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl shadow-black/30">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          title="Pagos pendientes de confirmar"
          subtitle="Marcá como pagado cuando confirmes el cobro."
        />
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            payments.length > 0
              ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {payments.length} · {formatCurrency(totalPending)}
        </span>
      </div>

      {payments.length > 0 && (
        <div className="mb-3 space-y-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar huésped"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/30"
          />
          <div className="flex flex-wrap gap-2">
            {PAYMENT_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  filter === option.value
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-700 text-slate-300 hover:bg-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
            <select
              value={propertyFilter}
              onChange={(event) => setPropertyFilter(event.target.value)}
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-[#D85A30]"
            >
              <option value="all">Por propiedad</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-8 text-center text-xs text-emerald-100">
          <BrandLogo
            hideText
            size="lg"
            className="mb-3 justify-center opacity-70"
          />
          Todo cobrado. No hay pagos pendientes.
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-xs text-slate-400">
          No hay pagos que coincidan con los filtros.
        </div>
      ) : (
        <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
          {visiblePayments.map((booking) => (
            <motion.div
              key={booking.bookingId}
              animate={
                settlingId === booking.bookingId
                  ? { opacity: 0, x: 80, scale: 0.98 }
                  : { opacity: 1, x: 0, scale: 1 }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:bg-white/[0.02] md:grid-cols-[minmax(0,1fr)_130px_120px_125px]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-medium text-slate-100">
                    {booking.guestName}
                  </p>
                  {booking.payment.isOverdue && (
                    <span className="rounded-full border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                      vencido
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-400">
                  {booking.propertyName} · {booking.roomName}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">
                  Pendiente
                </p>
                <p className="text-xs font-semibold text-amber-100">
                  {formatCurrency(booking.payment.pending)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">
                  Check-in
                </p>
                <p className="text-xs text-slate-200">
                  {formatDate(booking.checkIn)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettlingId(booking.bookingId);
                  window.setTimeout(() => {
                    setSettlingId("");
                    onOpenPayment(booking);
                  }, 180);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                <motion.span
                  animate={
                    settlingId === booking.bookingId
                      ? { scale: [1, 1.35, 1], rotate: [0, -8, 0] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.18 }}
                  className="mr-1"
                >
                  ✓
                </motion.span>
                Marcar pagado
              </button>
            </motion.div>
          ))}

          {filteredPayments.length > visiblePayments.length && (
            <Link
              href="/dashboard/bookings"
              className="inline-flex text-[11px] font-medium text-slate-300 transition-colors hover:text-white"
            >
              Ver todas las reservas ({filteredPayments.length - visiblePayments.length} más) →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function RevenueChartCard({
  data,
  error,
  loading,
  activeRange,
  onRangeChange,
}) {
  const total = data.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  const pending = data.reduce((sum, item) => sum + (Number(item.pending) || 0), 0);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/40">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Ingresos cobrados vs por cobrar"
          subtitle={`${formatCurrency(total)} cobrados · ${formatCurrency(pending)} por cobrar`}
        />
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {TREND_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onRangeChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                activeRange === tab.value
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="vk-shimmer h-[300px] rounded-xl" />
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_COLOR} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={BRAND_COLOR} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#71717a" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(value, name) => [
                  formatCurrency(value),
                  name === "revenue" ? "Cobrados" : "Por cobrar",
                ]}
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke="#71717a"
                strokeOpacity={0.75}
                fill="url(#pendingGradient)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke={BRAND_COLOR}
                fill="url(#paidGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function PaymentModal({
  booking,
  amount,
  method,
  paidAt,
  notes,
  saving,
  error,
  onAmountChange,
  onMethodChange,
  onPaidAtChange,
  onNotesChange,
  onClose,
  onConfirm,
}) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Confirmar pago
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {booking.guestName} · pendiente{" "}
            {formatCurrency(booking.payment.pending)}
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Monto</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/30"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">
              Método de pago
            </span>
            <select
              value={method}
              onChange={(event) => onMethodChange(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/30"
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">
              Fecha de pago
            </span>
            <input
              type="date"
              value={paidAt}
              onChange={(event) => onPaidAtChange(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/30"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">
              Notas opcionales
            </span>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D85A30] focus:ring-2 focus:ring-[#D85A30]/30"
              placeholder="Referencia de transferencia, aclaraciones, etc."
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Confirmando..." : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @param {{ title: string, items: AgendaItem[], showPaymentDot?: boolean }} props */
function AgendaColumn({ title, items, showPaymentDot = false }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-slate-400">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-[11px] text-slate-500">
          Sin movimientos programados
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <div className="flex min-w-0 gap-2">
                {showPaymentDot && (
                  <PaymentStatusDot
                    status={item.paymentStatus}
                    overdue={item.paymentOverdue}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-100">
                    {getGuestLastName(item.guestName)}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.propertyName} · {item.roomName}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-slate-300">
                {item.time}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaCard({ activeTab, onTabChange, agenda, error, loading }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Agenda"
          subtitle="Llegadas y salidas programadas por período."
        />
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {AGENDA_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[11px] text-slate-400">Cargando agenda...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <AgendaColumn title="Check-in" items={agenda.checkIns} showPaymentDot />
          <AgendaColumn title="Check-out" items={agenda.checkOuts} />
        </div>
      )}
    </section>
  );
}

function TrendsCard({
  trendData,
  trendError,
  trendLoading,
  activeRange,
  onRangeChange,
}) {
  const visibleData = trendData.slice(-activeRange);
  const hasEnoughData = visibleData.length >= 7;
  const average =
    hasEnoughData && visibleData.length > 0
      ? Math.round(
          visibleData.reduce(
            (sum, item) => sum + (item.occupancyPercent || 0),
            0
          ) / visibleData.length
        )
      : 0;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Ocupación"
          subtitle={
            hasEnoughData
              ? `Promedio del período: ${average}%`
              : "Necesitás al menos 7 días de actividad para ver tendencias"
          }
        />
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {TREND_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onRangeChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                activeRange === tab.value
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {trendError && (
        <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
          {trendError}
        </div>
      )}

      {trendLoading ? (
        <p className="text-[11px] text-slate-400">
          Cargando datos de ocupación...
        </p>
      ) : !hasEnoughData ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3 py-8 text-center text-xs text-slate-400">
          Necesitás al menos 7 días de actividad para ver tendencias
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={visibleData}
              margin={{ left: 0, right: 20, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(value, name) => {
                  if (name === "occupancyPercent") return [`${value}%`, "Ocupación"];
                  if (name === "checkIns") return [value, "Check-in"];
                  if (name === "checkOuts") return [value, "Check-out"];
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="occupancyPercent"
                stroke={BRAND_COLOR}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Ocupación"
              />
              <Line
                type="monotone"
                dataKey="checkIns"
                stroke="#38bdf8"
                strokeWidth={1}
                dot={false}
                name="Check-in"
              />
              <Line
                type="monotone"
                dataKey="checkOuts"
                stroke="#f97373"
                strokeWidth={1}
                dot={false}
                name="Check-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function DashboardHome() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summary, setSummary] = useState({
    propertiesCount: 0,
    roomsCount: 0,
    bookingsCount: 0,
    todayCheckins: 0,
    todayCheckouts: 0,
    todayOccupiedRooms: 0,
    totalRooms: 0,
    bookingsByStatus: {
      reserved: 0,
      checked_in: 0,
      checked_out: 0,
      cancelled: 0,
    },
  });

  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [agendaTab, setAgendaTab] = useState("today");

  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState("");
  const [trendData, setTrendData] = useState([]);
  const [trendRange, setTrendRange] = useState(7);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState("");
  const [revenueData, setRevenueData] = useState([]);
  const [revenueRange, setRevenueRange] = useState(30);
  const [showAdditionalMetrics, setShowAdditionalMetrics] = useState(false);

  const [properties, setProperties] = useState([]);
  const [propertiesError, setPropertiesError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentDate, setPaymentDate] = useState(formatDateInput());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [toast, setToast] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const trendQuery = useMemo(() => {
    const params = new URLSearchParams({ days: String(trendRange) });
    if (selectedPropertyId !== "all") {
      params.set("propertyId", selectedPropertyId);
    }

    return params.toString();
  }, [selectedPropertyId, trendRange]);
  const revenueQuery = useMemo(() => {
    const params = new URLSearchParams({ days: String(revenueRange) });
    if (selectedPropertyId !== "all") {
      params.set("propertyId", selectedPropertyId);
    }

    return params.toString();
  }, [selectedPropertyId, revenueRange]);

  const fetchOperationalData = useCallback(async () => {
    try {
      setAgendaLoading(true);
      setAgendaError("");

      const query =
        selectedPropertyId === "all" ? "" : `?propertyId=${selectedPropertyId}`;

      const [bookingsRes, roomsRes] = await Promise.all([
        fetch(`/api/bookings${query}`),
        fetch(`/api/rooms${query}`),
      ]);

      if (bookingsRes.status === 401 || roomsRes.status === 401) {
        router.push("/auth/login");
        return;
      }

      const [bookingsData, roomsData] = await Promise.all([
        bookingsRes.json(),
        roomsRes.json(),
      ]);

      if (!bookingsRes.ok) {
        setAgendaError(bookingsData.error || "Error al cargar reservas.");
        setAgendaLoading(false);
        return;
      }

      if (!roomsRes.ok) {
        setAgendaError(roomsData.error || "Error al cargar habitaciones.");
        setAgendaLoading(false);
        return;
      }

      setBookings(bookingsData.bookings || []);
      setRooms(roomsData.rooms || []);
      setAgendaLoading(false);
    } catch (err) {
      console.error(err);
      setAgendaError("Error inesperado al cargar la agenda.");
      setAgendaLoading(false);
    }
  }, [router, selectedPropertyId]);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setPropertiesError(data.error || "Error al cargar propiedades.");
          return;
        }

        setProperties(data.properties || []);
      } catch (err) {
        console.error(err);
        setPropertiesError("Error inesperado al cargar propiedades.");
      }
    }

    fetchProperties();
  }, [router]);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        setSummaryError("");

        const query =
          selectedPropertyId === "all" ? "" : `?propertyId=${selectedPropertyId}`;

        const res = await fetch(`/api/dashboard/summary${query}`);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setSummaryError(data.error || "Error al cargar el dashboard.");
          setLoading(false);
          return;
        }

        setSummary(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setSummaryError("Error inesperado al cargar el dashboard.");
        setLoading(false);
      }
    }

    fetchSummary();
  }, [router, selectedPropertyId]);

  useEffect(() => {
    async function fetchTrends() {
      try {
        setTrendLoading(true);
        setTrendError("");

        const res = await fetch(`/api/dashboard/trends?${trendQuery}`);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setTrendError(data.error || "Error al cargar tendencias.");
          setTrendLoading(false);
          return;
        }

        setTrendData(data.data || []);
        setTrendLoading(false);
      } catch (err) {
        console.error(err);
        setTrendError("Error inesperado al cargar tendencias.");
        setTrendLoading(false);
      }
    }

    fetchTrends();
  }, [router, trendQuery]);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        setRevenueLoading(true);
        setRevenueError("");

        const res = await fetch(`/api/dashboard/revenue?${revenueQuery}`);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setRevenueError(data.error || "Error al cargar ingresos.");
          setRevenueLoading(false);
          return;
        }

        setRevenueData(data.data || []);
        setRevenueLoading(false);
      } catch (err) {
        console.error(err);
        setRevenueError("Error inesperado al cargar ingresos.");
        setRevenueLoading(false);
      }
    }

    fetchRevenue();
  }, [router, revenueQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchOperationalData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchOperationalData]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const {
    propertiesCount,
    roomsCount,
    bookingsCount,
    todayOccupiedRooms,
    totalRooms,
  } = summary;

  const occupancyPercent =
    totalRooms > 0 ? Math.round((todayOccupiedRooms / totalRooms) * 100) : 0;

  const propertyMap = useMemo(
    () => new Map(properties.map((property) => [String(property._id), property])),
    [properties]
  );
  const roomMap = useMemo(
    () => new Map(rooms.map((room) => [String(room._id), room])),
    [rooms]
  );

  const metrics = useMemo(() => getDashboardMetrics(bookings), [bookings]);
  const pendingPayments = useMemo(
    () => getPendingPayments(bookings, roomMap, propertyMap),
    [bookings, propertyMap, roomMap]
  );
  const commandBookings = useMemo(
    () => bookings.map((booking) => enrichBooking(booking, roomMap, propertyMap)),
    [bookings, propertyMap, roomMap]
  );

  const onboardingSteps = [
    {
      label: "Cargá tu primera propiedad",
      href: "/dashboard/properties",
      cta: "Cargar",
      done: propertiesCount > 0 || properties.length > 0,
    },
    {
      label: "Agregá habitaciones",
      href: "/dashboard/rooms",
      cta: "Agregar",
      done: roomsCount > 0,
    },
    {
      label: "Creá tu primera reserva",
      href: "/dashboard/bookings",
      cta: "Crear",
      done: bookingsCount > 0,
    },
  ];

  const shouldShowOnboarding =
    !loading && onboardingSteps.some((step) => !step.done);

  const agenda = useMemo(
    () => getAgendaForTab(bookings, agendaTab, roomMap, propertyMap),
    [agendaTab, bookings, propertyMap, roomMap]
  );

  function openPaymentModal(booking) {
    setPaymentModalBooking(booking);
    setPaymentAmount(String(booking.payment.pending));
    setPaymentMethod("transferencia");
    setPaymentDate(formatDateInput());
    setPaymentNotes("");
    setPaymentError("");
  }

  async function confirmPayment() {
    if (!paymentModalBooking) return;

    const amount = parseMoney(paymentAmount);
    if (amount <= 0) {
      setPaymentError("Ingresá un monto mayor a cero.");
      return;
    }

    const nextPaid = Math.min(
      paymentModalBooking.payment.paid + amount,
      paymentModalBooking.payment.total
    );
    const nextStatus =
      nextPaid >= paymentModalBooking.payment.total ? "pagado" : "parcial";

    setPaymentSaving(true);
    setPaymentError("");

    try {
      const res = await fetch(`/api/bookings/${paymentModalBooking.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto_pagado: nextPaid,
          estado_pago: nextStatus,
          fecha_pago: paymentDate,
          metodo_pago: paymentMethod,
          notas_pago: paymentNotes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentError(
          data.error ||
            "No se pudo confirmar el pago. TODO: implementar PATCH /api/bookings/:id para campos de cobro manual."
        );
        setPaymentSaving(false);
        return;
      }

      setPaymentModalBooking(null);
      setPaymentSaving(false);
      setToast("Pago confirmado correctamente.");
      await fetchOperationalData();
    } catch {
      setPaymentError(
        "No se pudo confirmar el pago. TODO: implementar PATCH /api/bookings/:id para campos de cobro manual."
      );
      setPaymentSaving(false);
    }
  }

  return (
    <div className="relative space-y-6">
      <BrandLogo
        hideText
        size="lg"
        className="pointer-events-none fixed bottom-8 right-8 z-0 hidden opacity-[0.025] md:flex"
        iconClassName="h-52 w-44"
      />
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-xl">
          {toast}
        </div>
      )}

      {summaryError && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
          {summaryError}
        </div>
      )}

      {propertiesError && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-[11px] text-yellow-300">
          {propertiesError}
        </div>
      )}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="vk-section-title vk-display text-xl font-semibold text-slate-100">
            Resumen
          </h2>
          <p className="text-sm text-slate-400">
            Estado operativo, ocupación y cobros manuales.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {properties.length > 0 && (
            <PropertyDropdown
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              propertiesCount={propertiesCount}
              onChange={setSelectedPropertyId}
            />
          )}

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-orange-500/30 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            Buscar <span className="ml-2 text-slate-500">⌘K</span>
          </button>

          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            + Nueva reserva
          </Link>
        </div>
      </header>

      {shouldShowOnboarding ? (
        <OnboardingCard steps={onboardingSteps} />
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <KpiCard
            title="Por cobrar"
            value={formatCurrency(metrics.pendingTotal)}
            subtitle={`${metrics.pendingCount} reservas pendientes`}
            warning={metrics.pendingTotal > 0}
            featured
            sparkline={SPARKLINE_DATA.pending}
            index={0}
          />
          <KpiCard
            title="Ocupación actual"
            value={loading ? "…" : `${occupancyPercent}%`}
            subtitle={
              loading
                ? "Calculando ocupación..."
                : `${todayOccupiedRooms} de ${totalRooms} habitaciones ocupadas`
            }
            sparkline={SPARKLINE_DATA.occupancy}
            index={1}
          />
          <KpiCard
            title="Reservas vigentes"
            value={String(metrics.activeReservations)}
            subtitle="Confirmadas (incluye check-ins futuros)"
            sparkline={SPARKLINE_DATA.active}
            index={2}
          />
          <KpiCard
            title="Ingresos cobrados"
            value={formatCurrency(metrics.collectedThisMonth)}
            subtitle={`Este mes · ${metrics.collectedCount} reservas`}
            sparkline={SPARKLINE_DATA.revenue}
            index={3}
          />
        </div>
      )}

      {!shouldShowOnboarding && (
        <RevenueChartCard
          data={revenueData}
          error={revenueError}
          loading={revenueLoading}
          activeRange={revenueRange}
          onRangeChange={setRevenueRange}
        />
      )}

      {!shouldShowOnboarding && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            type="button"
            onClick={() => setShowAdditionalMetrics((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <h2 className="text-xs font-semibold text-slate-100">
                Métricas adicionales
              </h2>
              <p className="text-[11px] text-slate-400">
                Noches, valor reservado y promedio por noche.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-emerald-300">
              {showAdditionalMetrics ? "Ocultar métricas ↑" : "Ver más métricas ↓"}
            </span>
          </button>

          {showAdditionalMetrics && (
            <MetricStrip
              metrics={[
                {
                  title: "Noches reservadas",
                  value: String(metrics.bookedNights),
                  subtitle: "Total confirmado sin cancelaciones",
                },
                {
                  title: "Noches próximas",
                  value: String(metrics.upcomingNights),
                  subtitle: "Estadías que tocan los próximos 30 días",
                },
                {
                  title: "Valor reservado",
                  value: formatCurrency(metrics.bookedRevenue),
                  subtitle: "Suma total de reservas no canceladas",
                },
                {
                  title: "Promedio por noche",
                  value: formatCurrency(metrics.averageNightlyRate),
                  subtitle: "Valor reservado dividido por noches",
                },
              ]}
            />
          )}
        </section>
      )}

      <PendingPaymentsCard
        payments={pendingPayments}
        properties={properties}
        onOpenPayment={openPaymentModal}
      />

      <AgendaCard
        activeTab={agendaTab}
        onTabChange={setAgendaTab}
        agenda={agenda}
        error={agendaError}
        loading={agendaLoading}
      />

      <TrendsCard
        trendData={trendData}
        trendError={trendError}
        trendLoading={trendLoading}
        activeRange={trendRange}
        onRangeChange={setTrendRange}
      />

      <PaymentModal
        booking={paymentModalBooking}
        amount={paymentAmount}
        method={paymentMethod}
        paidAt={paymentDate}
        notes={paymentNotes}
        saving={paymentSaving}
        error={paymentError}
        onAmountChange={setPaymentAmount}
        onMethodChange={setPaymentMethod}
        onPaidAtChange={setPaymentDate}
        onNotesChange={setPaymentNotes}
        onClose={() => setPaymentModalBooking(null)}
        onConfirm={confirmPayment}
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        bookings={commandBookings}
        properties={properties}
        rooms={rooms}
        pendingPayments={pendingPayments}
        onSelectProperty={setSelectedPropertyId}
      />
    </div>
  );
}
