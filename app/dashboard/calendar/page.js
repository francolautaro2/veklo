"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DAY_WIDTH = 88;
const ROOM_LABEL_WIDTH = 190;
const STATUS_STYLES = {
  overdue: "border-rose-400/70 bg-rose-500/30 text-rose-50",
  today: "border-orange-300/80 bg-orange-500/35 text-orange-50",
  pending: "border-amber-300/70 bg-amber-500/25 text-amber-50",
  confirmed: "border-emerald-300/60 bg-emerald-500/20 text-emerald-50",
  checkedOut: "border-slate-500/70 bg-slate-700/70 text-slate-200",
};

function getMonthDays(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days = [];

  for (let day = 1; day <= end.getDate(); day += 1) {
    const current = new Date(start);
    current.setDate(day);
    current.setHours(0, 0, 0, 0);
    days.push(current);
  }

  return days;
}

function formatMonth(value) {
  return value.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getPaymentStatus(booking) {
  if (booking.estado_pago) return booking.estado_pago;
  if (booking.deposit?.status === "paid") return "pagado";
  if (booking.deposit?.status === "pending") return "pendiente";
  return "pendiente";
}

function getBookingVisualState(booking) {
  const today = startOfDay(new Date());
  const checkIn = startOfDay(booking.checkIn);
  const dueDate = booking.fecha_vencimiento_pago
    ? startOfDay(booking.fecha_vencimiento_pago)
    : null;
  const paymentStatus = getPaymentStatus(booking);

  if (booking.status === "checked_out") return "checkedOut";
  if (paymentStatus !== "pagado" && dueDate && dueDate < today) return "overdue";
  if (checkIn.getTime() === today.getTime()) return "today";
  if (paymentStatus !== "pagado") return "pending";
  return "confirmed";
}

function getBookingPosition(booking, days) {
  const monthStart = days[0];
  const monthEnd = days[days.length - 1];
  const checkIn = startOfDay(booking.checkIn);
  const checkOut = startOfDay(booking.checkOut);
  const visibleStart = checkIn < monthStart ? monthStart : checkIn;
  const visibleEnd = checkOut > monthEnd ? monthEnd : checkOut;
  const startIndex = Math.max(
    0,
    Math.round((visibleStart - monthStart) / 86400000)
  );
  const endIndex = Math.max(
    startIndex + 1,
    Math.round((visibleEnd - monthStart) / 86400000)
  );

  return {
    left: startIndex * DAY_WIDTH + 8,
    width: Math.max((endIndex - startIndex) * DAY_WIDTH - 12, 70),
  };
}

function BookingDetailModal({ booking, room, property, onClose }) {
  if (!booking) return null;

  const total = Number(booking.monto_total || booking.deposit?.amount || 0);
  const paid = Number(booking.monto_pagado || 0);
  const pending = Math.max(total - paid, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {booking.guestName}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {property?.name || "Propiedad"} · {room?.name || "Habitación"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900"
          >
            Cerrar
          </button>
        </div>

        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-slate-900/70 p-3">
            <dt className="text-slate-500">Check-in</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {formatDate(booking.checkIn)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-900/70 p-3">
            <dt className="text-slate-500">Check-out</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {formatDate(booking.checkOut)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-900/70 p-3">
            <dt className="text-slate-500">Estado</dt>
            <dd className="mt-1 font-medium text-slate-100">{booking.status}</dd>
          </div>
          <div className="rounded-lg bg-slate-900/70 p-3">
            <dt className="text-slate-500">Pago pendiente</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              }).format(pending)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => {
    const current = new Date();
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
    return current;
  });
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const days = useMemo(() => getMonthDays(month), [month]);
  const propertyMap = useMemo(
    () => new Map(properties.map((property) => [String(property._id), property])),
    [properties]
  );
  const roomMap = useMemo(
    () => new Map(rooms.map((room) => [String(room._id), room])),
    [rooms]
  );

  const groupedRooms = useMemo(
    () =>
      properties.map((property) => ({
        property,
        rooms: rooms.filter((room) => String(room.propertyId) === String(property._id)),
      })),
    [properties, rooms]
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        const [propertiesRes, roomsRes, bookingsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/rooms"),
          fetch("/api/bookings"),
        ]);

        if (
          propertiesRes.status === 401 ||
          roomsRes.status === 401 ||
          bookingsRes.status === 401
        ) {
          router.push("/auth/login");
          return;
        }

        const [propertiesData, roomsData, bookingsData] = await Promise.all([
          propertiesRes.json(),
          roomsRes.json(),
          bookingsRes.json(),
        ]);

        if (!propertiesRes.ok || !roomsRes.ok || !bookingsRes.ok) {
          setError("No se pudo cargar el calendario.");
          setLoading(false);
          return;
        }

        setProperties(propertiesData.properties || []);
        setRooms(roomsData.rooms || []);
        setBookings(bookingsData.bookings || []);
        setLoading(false);
      } catch {
        setError("Error inesperado al cargar el calendario.");
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  function moveMonth(offset) {
    setMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return next;
    });
  }

  const monthStart = days[0];
  const monthEnd = days[days.length - 1];
  const visibleBookings = bookings.filter((booking) => {
    if (booking.status === "cancelled") return false;
    const checkIn = startOfDay(booking.checkIn);
    const checkOut = startOfDay(booking.checkOut);
    return checkIn <= monthEnd && checkOut >= monthStart;
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">
            Calendario
          </h2>
          <p className="text-sm text-slate-400">
            Ocupación mensual por habitación y propiedad.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
          >
            Anterior
          </button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize text-slate-100">
            {formatMonth(month)}
          </span>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
          >
            Siguiente
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        {loading ? (
          <p className="p-4 text-xs text-slate-400">Cargando calendario...</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="min-w-max"
              style={{ width: ROOM_LABEL_WIDTH + days.length * DAY_WIDTH }}
            >
              <div className="sticky top-0 z-10 flex border-b border-slate-800 bg-slate-900">
                <div
                  className="shrink-0 border-r border-slate-800 px-3 py-2 text-[11px] font-medium text-slate-400"
                  style={{ width: ROOM_LABEL_WIDTH }}
                >
                  Habitaciones
                </div>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="shrink-0 border-r border-slate-800 px-2 py-2 text-center"
                    style={{ width: DAY_WIDTH }}
                  >
                    <p className="text-[10px] uppercase text-slate-500">
                      {day.toLocaleDateString("es-AR", { weekday: "short" })}
                    </p>
                    <p className="text-xs font-semibold text-slate-200">
                      {day.getDate()}
                    </p>
                  </div>
                ))}
              </div>

              {groupedRooms.map(({ property, rooms: propertyRooms }) => (
                <div key={property._id}>
                  <div className="border-b border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200">
                    {property.name}
                  </div>
                  {propertyRooms.map((room) => {
                    const roomBookings = visibleBookings.filter(
                      (booking) => String(booking.roomId) === String(room._id)
                    );

                    return (
                      <div
                        key={room._id}
                        className="relative flex min-h-14 border-b border-slate-800"
                      >
                        <div
                          className="shrink-0 border-r border-slate-800 px-3 py-3"
                          style={{ width: ROOM_LABEL_WIDTH }}
                        >
                          <p className="truncate text-xs font-medium text-slate-100">
                            {room.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {room.capacity} pax
                          </p>
                        </div>
                        <div className="relative h-14">
                          {days.map((day) => (
                            <div
                              key={day.toISOString()}
                              className="absolute top-0 h-full border-r border-slate-800/80"
                              style={{
                                left:
                                  Math.round((day - monthStart) / 86400000) *
                                  DAY_WIDTH,
                                width: DAY_WIDTH,
                              }}
                            />
                          ))}
                          {roomBookings.map((booking) => {
                            const position = getBookingPosition(booking, days);
                            const visualState = getBookingVisualState(booking);

                            return (
                              <button
                                key={booking._id}
                                type="button"
                                onClick={() => setSelectedBooking(booking)}
                                className={`absolute top-2 z-10 h-10 truncate rounded-lg border px-2 text-left text-[11px] font-medium shadow-sm ${STATUS_STYLES[visualState]}`}
                                style={position}
                                title={booking.guestName}
                              >
                                {booking.guestName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-1">
          Confirmada
        </span>
        <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-1">
          Pendiente de pago
        </span>
        <span className="rounded-full border border-orange-300/40 bg-orange-500/10 px-2 py-1">
          Check-in hoy
        </span>
        <span className="rounded-full border border-rose-300/40 bg-rose-500/10 px-2 py-1">
          Vencido
        </span>
      </div>

      <BookingDetailModal
        booking={selectedBooking}
        room={selectedBooking ? roomMap.get(String(selectedBooking.roomId)) : null}
        property={
          selectedBooking
            ? propertyMap.get(String(selectedBooking.propertyId))
            : null
        }
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
