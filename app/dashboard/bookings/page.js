"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABEL = {
  reserved: "Reservado",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Cancelado",
};
const PRECHECKIN_LABEL = {
  pending: "Pendiente",
  completed: "Completado",
};
const DEPOSIT_LABEL = {
  not_required: "Sin seña",
  pending: "Pendiente",
  paid: "Pagada",
};

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function parseInputDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatPrice(value) {
  const num = Number(value) || 0;
  return `$ ${num.toLocaleString("es-AR")}`;
}

export default function BookingsPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaymentLink, setDepositPaymentLink] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // 🔎 filtros de tabla
  const [statusFilter, setStatusFilter] = useState("all");
  const [guestFilter, setGuestFilter] = useState("");

  const rangeCheckIn = parseInputDate(checkIn);
  const rangeCheckOut = parseInputDate(checkOut);
  const hasValidAvailabilityRange =
    rangeCheckIn &&
    rangeCheckOut &&
    rangeCheckOut.getTime() > rangeCheckIn.getTime();

  const roomAvailability = useMemo(() => {
    return rooms.map((room) => {
      if (!hasValidAvailabilityRange) {
        return {
          room,
          isAvailable: null,
        };
      }

      const hasConflict = bookings.some((booking) => {
        if (booking.status === "cancelled") return false;
        if (String(booking.roomId) !== String(room._id)) return false;

        const bookingIn = new Date(booking.checkIn);
        const bookingOut = new Date(booking.checkOut);

        return bookingIn < rangeCheckOut && bookingOut > rangeCheckIn;
      });

      return {
        room,
        isAvailable: !hasConflict,
      };
    });
  }, [bookings, rooms, hasValidAvailabilityRange, rangeCheckIn, rangeCheckOut]);

  const availabilityByRoomId = useMemo(() => {
    const map = new Map();
    roomAvailability.forEach((item) => {
      map.set(String(item.room._id), item);
    });
    return map;
  }, [roomAvailability]);

  const availableRoomIds = useMemo(() => {
    if (!hasValidAvailabilityRange) return new Set();
    return new Set(
      roomAvailability
        .filter((item) => item.isAvailable)
        .map((item) => String(item.room._id))
    );
  }, [roomAvailability, hasValidAvailabilityRange]);

  const selectedRoomIsAvailable =
    !hasValidAvailabilityRange ||
    (selectedRoomId && availableRoomIds.has(String(selectedRoomId)));

  async function fetchProperties() {
    try {
      const res = await fetch("/api/properties");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      const props = data.properties || [];
      setProperties(props);
      if (props.length > 0) {
        setSelectedPropertyId(props[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar propiedades.");
    }
  }

  async function fetchRooms(propertyId) {
    if (!propertyId) {
      setRooms([]);
      setSelectedRoomId("");
      return;
    }

    try {
      const res = await fetch(`/api/rooms?propertyId=${propertyId}`);
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      const rooms = data.rooms || [];
      setRooms(rooms);
      if (rooms.length > 0) {
        setSelectedRoomId(rooms[0]._id);
      } else {
        setSelectedRoomId("");
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar habitaciones.");
    }
  }

  async function fetchBookings() {
    if (!selectedPropertyId) {
      setBookings([]);
      return;
    }

    setLoadingBookings(true);
    setError("");

    try {
      const res = await fetch(
        `/api/bookings?propertyId=${selectedPropertyId}`
      );
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar reservas.");
        setLoadingBookings(false);
        return;
      }

      setBookings(data.bookings || []);
      setLoadingBookings(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar reservas.");
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchRooms(selectedPropertyId);
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!hasValidAvailabilityRange || rooms.length === 0) return;

    if (selectedRoomId && availableRoomIds.has(String(selectedRoomId))) return;

    const firstAvailable = roomAvailability.find((item) => item.isAvailable);
    if (firstAvailable) {
      setSelectedRoomId(firstAvailable.room._id);
    }
  }, [
    hasValidAvailabilityRange,
    roomAvailability,
    availableRoomIds,
    selectedRoomId,
    rooms.length,
  ]);

  async function handleCreateBooking(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!selectedPropertyId || !selectedRoomId) {
      setError("Seleccioná una propiedad y una habitación.");
      return;
    }
    if (!guestName || !checkIn || !checkOut) {
      setError("Todos los campos de la reserva son obligatorios.");
      return;
    }

    if (!hasValidAvailabilityRange) {
      setError("Ingresá un rango válido: el check-out debe ser posterior al check-in.");
      return;
    }

    if (!selectedRoomIsAvailable) {
      setError("La habitación seleccionada no está disponible en ese rango.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          roomId: selectedRoomId,
          guestName,
          guestEmail,
          guestPhone,
          checkIn,
          checkOut,
          depositAmount,
          depositPaymentLink,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        setCreating(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error al crear reserva.");
        setCreating(false);
        return;
      }

      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
      setCheckIn("");
      setCheckOut("");
      setDepositAmount("");
      setDepositPaymentLink("");

      setBookings((prev) => [data.booking, ...prev]);
      if (data.links?.preCheckInUrl) {
        setNotice("Reserva creada. Ya podés compartir el link de pre check-in.");
      }
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear reserva.");
      setCreating(false);
    }
  }

  async function updateBooking(id, payload) {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Error al actualizar reserva.");
        return;
      }

      setBookings((prev) =>
        prev.map((b) => (b._id === id ? data.booking : b))
      );
    } catch (err) {
      console.error(err);
      setError("Error inesperado al actualizar reserva.");
    }
  }

  async function copyPreCheckInLink(booking) {
    const token = booking.preCheckIn?.token;
    if (!token) {
      setError("Esta reserva no tiene token de pre check-in.");
      return;
    }

    const url = `${window.location.origin}/precheckin/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link de pre check-in copiado al portapapeles.");
    } catch {
      setError("No se pudo copiar el link. Copialo manualmente desde Abrir.");
    }
  }

  // 💡 bookings filtradas según estado + nombre
  const filteredBookings = bookings.filter((b) => {
    // filtro por estado
    const status = b.status;

    if (statusFilter === "active") {
      // activas = reservadas o en check-in
      if (status !== "reserved" && status !== "checked_in") return false;
    } else if (statusFilter === "today_checkin") {
      if (!isToday(b.checkIn) || status === "cancelled") return false;
    } else if (statusFilter === "today_checkout") {
      if (!isToday(b.checkOut) || status === "cancelled") return false;
    } else if (statusFilter === "cancelled") {
      if (status !== "cancelled") return false;
    }
    // "all" no filtra nada

    // filtro por huésped
    if (guestFilter.trim()) {
      const q = guestFilter.trim().toLowerCase();
      if (!b.guestName?.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Reservas</h2>
          <p className="text-[11px] text-slate-400">
            Administrá check-in, check-out y reservas de tus habitaciones.
          </p>
        </div>
      </div>

      {/* Selector de propiedad y habitación */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="space-y-1 mb-3">
          <label className="block text-[11px] text-slate-300">Propiedad</label>
          {properties.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No hay propiedades. Creá una primero.
            </p>
          ) : (
            <select
              className="block w-full max-w-xs rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] text-slate-300">Habitación</label>
          {rooms.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No hay habitaciones para esta propiedad.
            </p>
          ) : (
            <select
              className="block w-full max-w-xs rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              {rooms.map((r) => (
                <option
                  key={r._id}
                  value={r._id}
                  disabled={
                    hasValidAvailabilityRange &&
                    !availabilityByRoomId.get(String(r._id))?.isAvailable
                  }
                >
                  {r.name} · cap. {r.capacity} · {formatPrice(r.basePrice)}
                  {hasValidAvailabilityRange &&
                  !availabilityByRoomId.get(String(r._id))?.isAvailable
                    ? " · Ocupada"
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Form reserva */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold mb-3">Crear nueva reserva</h3>

        {error && (
          <div className="mb-3 text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-3 text-[11px] text-emerald-200 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}

        <form
          className="grid gap-3 md:grid-cols-6"
          onSubmit={handleCreateBooking}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">Huésped</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Nombre del huésped"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">Email huésped</label>
            <input
              type="email"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="huesped@email.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">Teléfono huésped</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+54 9 ..."
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">Check-in</label>
            <input
              type="date"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">Check-out</label>
            <input
              type="date"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">Seña (ARS)</label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-3">
            <label className="text-[11px] text-slate-300">
              Link de cobro de seña (opcional)
            </label>
            <input
              type="url"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="https://..."
              value={depositPaymentLink}
              onChange={(e) => setDepositPaymentLink(e.target.value)}
            />
          </div>

          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              disabled={creating || !selectedRoomId || !selectedRoomIsAvailable}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? "Creando..." : "Guardar reserva"}
            </button>
          </div>
        </form>
      </div>

      {/* Disponibilidad */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold">Disponibilidad y tarifa</h3>
          <p className="text-[11px] text-slate-400">
            Seleccioná check-in y check-out para ver qué habitaciones están libres.
          </p>
        </div>

        {!checkIn || !checkOut ? (
          <p className="text-[11px] text-slate-400">
            Elegí un rango de fechas para consultar disponibilidad.
          </p>
        ) : !hasValidAvailabilityRange ? (
          <p className="text-[11px] text-red-300">
            El check-out debe ser posterior al check-in.
          </p>
        ) : roomAvailability.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            No hay habitaciones cargadas para esta propiedad.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              Disponibles:{" "}
              {roomAvailability.filter((item) => item.isAvailable).length} de{" "}
              {roomAvailability.length}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="text-left py-2">Habitación</th>
                    <th className="text-left py-2">Capacidad</th>
                    <th className="text-left py-2">Precio por noche</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {roomAvailability.map((item) => (
                    <tr
                      key={item.room._id}
                      className="border-b border-slate-900/60 last:border-none"
                    >
                      <td className="py-2">{item.room.name}</td>
                      <td className="py-2">{item.room.capacity}</td>
                      <td className="py-2">{formatPrice(item.room.basePrice)}</td>
                      <td className="py-2">
                        {item.isAvailable ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px]">
                            Ocupada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Lista de reservas */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-semibold">Reservas</h3>
            {loadingBookings ? (
              <span className="text-[11px] text-slate-500">
                Cargando...
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                {filteredBookings.length} de {bookings.length} reserva(s)
              </span>
            )}
          </div>

          {/* Filtros tabla */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <input
              type="text"
              placeholder="Buscar huésped..."
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={guestFilter}
              onChange={(e) => setGuestFilter(e.target.value)}
            />
            <select
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="today_checkin">Check-in hoy</option>
              <option value="today_checkout">Check-out hoy</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>

        {loadingBookings ? (
          <p className="text-[11px] text-slate-400">Cargando reservas...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            No hay reservas que coincidan con el filtro actual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Huésped</th>
                  <th className="text-left py-2">Habitación</th>
                  <th className="text-left py-2">Check-in</th>
                  <th className="text-left py-2">Check-out</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Pre check-in</th>
                  <th className="text-left py-2">Seña</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const roomName =
                    rooms.find((r) => String(r._id) === String(b.roomId))
                      ?.name || b.roomId;

                  const isExternalBlock = b.origin === "ical";
                  const canCheckIn = !isExternalBlock && b.status === "reserved";
                  const canCheckOut = !isExternalBlock && b.status === "checked_in";
                  const canCancel =
                    !isExternalBlock &&
                    b.status !== "cancelled" &&
                    b.status !== "checked_out";
                  const preCheckInStatus = b.preCheckIn?.status || "pending";
                  const preCheckInToken = b.preCheckIn?.token;
                  const preCheckInUrl = preCheckInToken
                    ? `/precheckin/${preCheckInToken}`
                    : null;
                  const depositStatus = b.deposit?.status || "not_required";
                  const canMarkDepositPaid = depositStatus === "pending";

                  return (
                    <tr
                      key={b._id}
                      className="border-b border-slate-900/60 last:border-none"
                    >
                      <td className="py-2">
                        <p>{b.guestName}</p>
                        {isExternalBlock && (
                          <p className="text-[10px] text-amber-300">Bloqueo iCal</p>
                        )}
                        {b.guestEmail && (
                          <p className="text-[10px] text-slate-500">{b.guestEmail}</p>
                        )}
                      </td>
                      <td className="py-2">{roomName}</td>
                      <td className="py-2">
                        {b.checkIn
                          ? new Date(b.checkIn).toLocaleDateString("es-AR")
                          : "-"}
                        {isToday(b.checkIn) && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px]">
                            Hoy
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        {b.checkOut
                          ? new Date(b.checkOut).toLocaleDateString("es-AR")
                          : "-"}
                        {isToday(b.checkOut) && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[10px]">
                            Hoy
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-200">
                          {STATUS_LABEL[b.status] || b.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="space-y-1">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-200">
                            {PRECHECKIN_LABEL[preCheckInStatus] || preCheckInStatus}
                          </span>
                          {preCheckInUrl && (
                            <div className="flex flex-wrap gap-1">
                              <a
                                href={preCheckInUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-lg bg-slate-900 text-[10px] text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors"
                              >
                                Abrir
                              </a>
                              <button
                                type="button"
                                onClick={() => copyPreCheckInLink(b)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 transition-colors"
                              >
                                Copiar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="space-y-1">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-200">
                            {DEPOSIT_LABEL[depositStatus] || depositStatus}
                          </span>
                          {(b.deposit?.amount || 0) > 0 && (
                            <p className="text-[10px] text-slate-400">
                              $ {Number(b.deposit.amount).toLocaleString("es-AR")}
                            </p>
                          )}
                          {b.deposit?.paymentLink && (
                            <a
                              href={b.deposit.paymentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex px-2 py-1 rounded-lg bg-slate-900 text-[10px] text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors"
                            >
                              Link cobro
                            </a>
                          )}
                          {canMarkDepositPaid && (
                            <button
                              type="button"
                              onClick={() =>
                                updateBooking(b._id, { depositStatus: "paid" })
                              }
                              className="inline-flex px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 transition-colors"
                            >
                              Marcar pagada
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!canCheckIn}
                            onClick={() =>
                              canCheckIn &&
                              updateBooking(b._id, { status: "checked_in" })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Check-in
                          </button>
                          <button
                            type="button"
                            disabled={!canCheckOut}
                            onClick={() =>
                              canCheckOut &&
                              updateBooking(b._id, { status: "checked_out" })
                            }
                            className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[10px] hover:bg-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Check-out
                          </button>
                          <button
                            type="button"
                            disabled={!canCancel}
                            onClick={() => {
                              if (!canCancel) return;
                              if (
                                !confirm(
                                  "¿Seguro que querés cancelar esta reserva?"
                                )
                              )
                                return;
                              updateBooking(b._id, { status: "cancelled" });
                            }}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-[10px] hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
