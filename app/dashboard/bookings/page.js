"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABEL = {
  reserved: "Reservado",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Cancelado",
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

export default function BookingsPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // 🔎 filtros de tabla
  const [statusFilter, setStatusFilter] = useState("all");
  const [guestFilter, setGuestFilter] = useState("");

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

  async function handleCreateBooking(e) {
    e.preventDefault();
    setError("");

    if (!selectedPropertyId || !selectedRoomId) {
      setError("Seleccioná una propiedad y una habitación.");
      return;
    }
    if (!guestName || !checkIn || !checkOut) {
      setError("Todos los campos de la reserva son obligatorios.");
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
          checkIn,
          checkOut,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error al crear reserva.");
        setCreating(false);
        return;
      }

      setGuestName("");
      setCheckIn("");
      setCheckOut("");

      setBookings((prev) => [data.booking, ...prev]);
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear reserva.");
      setCreating(false);
    }
  }

  async function updateBookingStatus(id, status) {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
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
                <option key={r._id} value={r._id}>
                  {r.name} · cap. {r.capacity}
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

        <form
          className="grid gap-3 md:grid-cols-4"
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

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={creating || !selectedRoomId}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? "Creando..." : "Guardar reserva"}
            </button>
          </div>
        </form>
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
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const roomName =
                    rooms.find((r) => r._id === b.roomId)?.name || b.roomId;

                  const canCheckIn = b.status === "reserved";
                  const canCheckOut = b.status === "checked_in";
                  const canCancel =
                    b.status !== "cancelled" && b.status !== "checked_out";

                  return (
                    <tr
                      key={b._id}
                      className="border-b border-slate-900/60 last:border-none"
                    >
                      <td className="py-2">{b.guestName}</td>
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
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!canCheckIn}
                            onClick={() =>
                              canCheckIn &&
                              updateBookingStatus(b._id, "checked_in")
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
                              updateBookingStatus(b._id, "checked_out")
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
                              updateBookingStatus(b._id, "cancelled");
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
