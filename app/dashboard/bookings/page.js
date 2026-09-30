"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatDateOnly,
  isSameDateOnly,
  parseDateOnly,
  toDateKey,
  todayDateOnly,
} from "@/lib/date-only";

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
const SORTABLE_COLUMNS = new Set(["guest", "checkIn", "checkOut", "status", "deposit"]);
const DENSITY_CLASS = {
  compact: "py-1.5",
  comfortable: "py-2.5",
  spacious: "py-3.5",
};

function formatDate(value) {
  if (!value) return "-";
  return formatDateOnly(value);
}

function isToday(value) {
  return isSameDateOnly(value, todayDateOnly());
}

function formatPrice(value) {
  const num = Number(value) || 0;
  return `$ ${num.toLocaleString("es-AR")}`;
}

function getDepositInfo(booking) {
  const amount = Number(booking.deposit?.amount || 0);
  const status = booking.deposit?.status || "not_required";
  const dueDate =
    booking.fecha_vencimiento_pago ||
    booking.paymentDueAt ||
    booking.dueDate ||
    null;
  const isOverdue =
    status === "pending" &&
    dueDate &&
    new Date(dueDate).getTime() < todayDateOnly().getTime();

  if (!amount) {
    return {
      status: "not_required",
      label: "Sin seña",
      amount,
      isOverdue: false,
      className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
    };
  }

  if (status === "paid") {
    return {
      status,
      label: `Pagada · ${formatPrice(amount)}`,
      amount,
      isOverdue: false,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    };
  }

  return {
    status,
    label: `${isOverdue ? "Vencida" : "Pendiente"} · ${formatPrice(amount)}`,
    amount,
    isOverdue: Boolean(isOverdue),
    className: isOverdue
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-amber-500/20 bg-amber-500/10 text-amber-400",
  };
}

function getStatusBadgeClass(status) {
  if (status === "cancelled") return "border-red-500/40 bg-red-500/10 text-red-200";
  if (status === "checked_out") return "border-slate-600 bg-slate-800/80 text-slate-300";
  if (status === "checked_in") return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}

function getRowIndicator(booking) {
  const deposit = getDepositInfo(booking);
  if (deposit.isOverdue) {
    return { color: "bg-red-400", title: "Seña vencida" };
  }
  if (isToday(booking.checkIn) && booking.status !== "cancelled") {
    return { color: "bg-orange-400", title: "Check-in hoy" };
  }
  if (isToday(booking.checkOut) && booking.status !== "cancelled") {
    return { color: "bg-cyan-400", title: "Check-out hoy" };
  }
  return null;
}

function getPrimaryAction(booking, isExternalBlock) {
  if (isExternalBlock) return null;
  if (booking.status === "reserved") return "check_in";
  if (booking.status === "checked_in") return "check_out";
  return null;
}

function SortHeader({ column, sort, onSort, children }) {
  const active = sort.column === column;
  const icon = active ? (sort.direction === "asc" ? "⌃" : "⌄") : "↕";

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`group inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-left text-[11px] transition-colors ${
        active ? "font-medium text-white" : "font-medium text-slate-400 hover:text-slate-100"
      }`}
    >
      {children}
      {SORTABLE_COLUMNS.has(column) && (
        <span
          className={
            active
              ? "text-orange-400"
              : "text-slate-500 opacity-30 transition-opacity group-hover:opacity-60"
          }
        >
          {icon}
        </span>
      )}
    </button>
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
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaymentLink, setDepositPaymentLink] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExportBookings() {
    setError("");
    setExporting(true);
    try {
      const res = await fetch("/api/bookings/export");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudieron exportar las reservas.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] || "veklo-reservas.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al exportar las reservas.");
    } finally {
      setExporting(false);
    }
  }
  const [notice, setNotice] = useState("");

  // 🔎 filtros de tabla
  const [statusFilter, setStatusFilter] = useState("all");
  const [guestFilter, setGuestFilter] = useState("");
  const [debouncedGuestFilter, setDebouncedGuestFilter] = useState("");
  const [sort, setSort] = useState({ column: "checkIn", direction: "asc" });
  const [openPreCheckInMenuId, setOpenPreCheckInMenuId] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editStatus, setEditStatus] = useState("reserved");
  const [editDepositAmount, setEditDepositAmount] = useState("");
  const [editDepositPaymentLink, setEditDepositPaymentLink] = useState("");
  const [editDepositStatus, setEditDepositStatus] = useState("not_required");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [density, setDensity] = useState("comfortable");
  const searchInputRef = useRef(null);

  const rangeCheckIn = parseDateOnly(checkIn);
  const rangeCheckOut = parseDateOnly(checkOut);
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
    const stored = window.localStorage.getItem("veklo-bookings-density");
    if (stored && DENSITY_CLASS[stored]) setDensity(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("veklo-bookings-density", density);
  }, [density]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedGuestFilter(guestFilter);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [guestFilter]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.target instanceof HTMLElement &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setOpenPreCheckInMenuId("");
        setSelectedBooking(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      setSelectedBooking((current) =>
        current?._id === id ? data.booking : current
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

  function cycleSort(column) {
    setSort((current) => {
      if (current.column !== column) {
        return { column, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { column, direction: "desc" };
      }
      return { column: "", direction: "" };
    });
  }

  function openBookingDetail(booking) {
    setOpenPreCheckInMenuId("");
    setSelectedBooking(booking);
    setEditingBooking(false);
    setEditError("");
    const url = new URL(window.location.href);
    url.searchParams.set("reserva", booking._id);
    window.history.replaceState(null, "", url.toString());
  }

  function closeBookingDetail() {
    setSelectedBooking(null);
    setEditingBooking(false);
    setEditError("");
    const url = new URL(window.location.href);
    url.searchParams.delete("reserva");
    window.history.replaceState(null, "", url.toString());
  }

  function startEditingBooking() {
    if (!selectedBooking) return;
    setEditCheckIn(toDateKey(selectedBooking.checkIn));
    setEditCheckOut(toDateKey(selectedBooking.checkOut));
    setEditStatus(selectedBooking.status || "reserved");
    setEditDepositAmount(String(selectedBooking.deposit?.amount || ""));
    setEditDepositPaymentLink(selectedBooking.deposit?.paymentLink || "");
    setEditDepositStatus(selectedBooking.deposit?.status || "not_required");
    setEditError("");
    setEditingBooking(true);
  }

  async function saveBookingEdit(event) {
    event.preventDefault();
    if (!selectedBooking) return;

    setEditSaving(true);
    setEditError("");

    try {
      const res = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: editCheckIn,
          checkOut: editCheckOut,
          status: editStatus,
          depositAmount: editDepositAmount,
          depositPaymentLink: editDepositPaymentLink,
          depositStatus: editDepositStatus,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        setEditError(data.error || "No se pudo guardar la edición.");
        setEditSaving(false);
        return;
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === selectedBooking._id ? data.booking : booking
        )
      );
      setSelectedBooking(data.booking);
      setEditingBooking(false);
      setEditSaving(false);
      setNotice("Reserva actualizada correctamente.");
    } catch {
      setEditError("Error inesperado al editar la reserva.");
      setEditSaving(false);
    }
  }

  const roomMap = useMemo(
    () => new Map(rooms.map((room) => [String(room._id), room])),
    [rooms]
  );

  const filteredBookings = useMemo(() => {
    const query = debouncedGuestFilter.trim().toLowerCase();

    const result = bookings.filter((booking) => {
      const status = booking.status;

      if (statusFilter === "active") {
        if (status !== "reserved" && status !== "checked_in") return false;
      } else if (statusFilter === "today_checkin") {
        if (!isToday(booking.checkIn) || status === "cancelled") return false;
      } else if (statusFilter === "today_checkout") {
        if (!isToday(booking.checkOut) || status === "cancelled") return false;
      } else if (statusFilter === "cancelled") {
        if (status !== "cancelled") return false;
      }

      if (query) {
        const roomName =
          roomMap.get(String(booking.roomId))?.name || String(booking.roomId || "");
        const haystack = [
          booking.guestName,
          booking.guestEmail,
          booking.guestPhone,
          roomName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    if (!sort.column || !sort.direction) return result;

    return [...result].sort((a, b) => {
      let aValue = "";
      let bValue = "";

      if (sort.column === "guest") {
        aValue = a.guestName || "";
        bValue = b.guestName || "";
      } else if (sort.column === "status") {
        aValue = STATUS_LABEL[a.status] || a.status || "";
        bValue = STATUS_LABEL[b.status] || b.status || "";
      } else if (sort.column === "checkIn") {
        aValue = new Date(a.checkIn).getTime() || 0;
        bValue = new Date(b.checkIn).getTime() || 0;
      } else if (sort.column === "checkOut") {
        aValue = new Date(a.checkOut).getTime() || 0;
        bValue = new Date(b.checkOut).getTime() || 0;
      } else if (sort.column === "deposit") {
        aValue = getDepositInfo(a).amount;
        bValue = getDepositInfo(b).amount;
      }

      const comparison =
        typeof aValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), "es");

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [bookings, debouncedGuestFilter, roomMap, sort, statusFilter]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) + (guestFilter.trim() ? 1 : 0);

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
        <button
          type="button"
          onClick={handleExportBookings}
          disabled={exporting}
          className="self-start rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:self-auto"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
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
              ref={searchInputRef}
              type="text"
              placeholder="Buscar huésped, email, teléfono o habitación...  /"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={guestFilter}
              onChange={(e) => setGuestFilter(e.target.value)}
            />
            {[
              ["all", "Todas"],
              ["active", "Activas"],
              ["today_checkin", "Check-in hoy"],
              ["today_checkout", "Check-out hoy"],
              ["cancelled", "Canceladas"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  statusFilter === value
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                {label}
              </button>
            ))}
            <select
              value={density}
              onChange={(event) => setDensity(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="compact">Compacta</option>
              <option value="comfortable">Cómoda</option>
              <option value="spacious">Espaciosa</option>
            </select>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setGuestFilter("");
                }}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-white/[0.03]"
              >
                Limpiar filtros · {activeFiltersCount}
              </button>
            )}
          </div>
        </div>

        {loadingBookings ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-lg bg-white/[0.04]"
              />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-100">
              {bookings.length === 0
                ? "Todavía no hay reservas"
                : "No encontramos reservas con esos filtros"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {bookings.length === 0
                ? "Creá la primera reserva para empezar a operar."
                : "Probá limpiar filtros o buscar otro huésped."}
            </p>
            {bookings.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setGuestFilter("");
                }}
                className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400">
                  <th className="w-6 whitespace-nowrap px-2 py-2" />
                  <th className="min-w-[210px] whitespace-nowrap px-4 py-2 text-left">
                    <SortHeader column="guest" sort={sort} onSort={cycleSort}>
                      Huésped
                    </SortHeader>
                  </th>
                  <th className="min-w-[130px] whitespace-nowrap px-4 py-2 text-left">Habitación</th>
                  <th className="min-w-[110px] whitespace-nowrap px-4 py-2 text-left">
                    <SortHeader column="checkIn" sort={sort} onSort={cycleSort}>
                      Entrada
                    </SortHeader>
                  </th>
                  <th className="min-w-[110px] whitespace-nowrap px-4 py-2 text-left">
                    <SortHeader column="checkOut" sort={sort} onSort={cycleSort}>
                      Salida
                    </SortHeader>
                  </th>
                  <th className="min-w-[110px] whitespace-nowrap px-4 py-2 text-left">
                    <SortHeader column="status" sort={sort} onSort={cycleSort}>
                      Estado
                    </SortHeader>
                  </th>
                  <th className="min-w-[150px] whitespace-nowrap px-4 py-2 text-left">Pre check-in</th>
                  <th className="min-w-[180px] whitespace-nowrap px-4 py-2 text-left">
                    <SortHeader column="deposit" sort={sort} onSort={cycleSort}>
                      Seña
                    </SortHeader>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, index) => {
                  const roomName =
                    roomMap.get(String(b.roomId))?.name || b.roomId;

                  const isExternalBlock = b.origin === "ical";
                  const preCheckInStatus = b.preCheckIn?.status || "pending";
                  const preCheckInToken = b.preCheckIn?.token;
                  const preCheckInUrl = preCheckInToken
                    ? `/precheckin/${preCheckInToken}`
                    : null;
                  const deposit = getDepositInfo(b);
                  const rowIndicator = getRowIndicator(b);
                  const isCancelled = b.status === "cancelled";
                  const isSelected = selectedBooking?._id === b._id;

                  return (
                    <tr
                      key={b._id}
                      onClick={() => openBookingDetail(b)}
                      className={`group cursor-pointer border-b border-white/[0.04] transition-colors duration-150 last:border-none hover:bg-white/[0.04] ${
                        index % 2 === 0 ? "bg-white/[0.015]" : ""
                      } ${isSelected ? "border-l-2 border-l-orange-500 bg-orange-500/[0.05]" : ""}`}
                    >
                      <td className={`px-2 ${DENSITY_CLASS[density]}`}>
                        {rowIndicator ? (
                          <span
                            className={`block h-2.5 w-2.5 rounded-full ${rowIndicator.color}`}
                            title={rowIndicator.title}
                          />
                        ) : (
                          <span className="block h-2.5 w-2.5" aria-hidden="true" />
                        )}
                      </td>
                      <td className={`px-4 ${DENSITY_CLASS[density]}`}>
                        <div className={`space-y-0.5 ${isCancelled ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-white">
                              {b.guestName}
                            </p>
                            {isExternalBlock && (
                              <span
                                className="whitespace-nowrap rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-400/80"
                                title="Bloqueo iCal"
                              >
                                Bloqueo iCal
                              </span>
                            )}
                          </div>
                          {b.guestEmail && (
                            <p className="text-xs text-zinc-500">{b.guestEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 text-slate-300 ${DENSITY_CLASS[density]}`}>
                        <span className={isCancelled ? "opacity-50" : ""}>
                          {roomName}
                        </span>
                      </td>
                      <td className={`px-4 text-slate-300 ${DENSITY_CLASS[density]}`}>
                        <span className={isCancelled ? "opacity-50" : ""}>
                          {formatDate(b.checkIn)}
                        </span>
                      </td>
                      <td className={`px-4 text-slate-300 ${DENSITY_CLASS[density]}`}>
                        <span className={isCancelled ? "opacity-50" : ""}>
                          {formatDate(b.checkOut)}
                        </span>
                      </td>
                      <td className={`px-4 ${DENSITY_CLASS[density]}`}>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(b.status)}`}>
                          {STATUS_LABEL[b.status] || b.status}
                        </span>
                      </td>
                      <td className={`px-4 ${DENSITY_CLASS[density]}`}>
                        <div className={`relative ${isCancelled ? "opacity-50" : ""}`}>
                          {preCheckInUrl ? (
                            <>
                              <button
                                type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenPreCheckInMenuId((current) =>
                                  current === b._id ? "" : b._id
                                );
                                }}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                title={
                                  PRECHECKIN_LABEL[preCheckInStatus] ||
                                  preCheckInStatus
                                }
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    preCheckInStatus === "completed"
                                      ? "bg-emerald-400"
                                      : "bg-amber-400"
                                  }`}
                                />
                                Link pre check-in
                                <span className="text-slate-500">▾</span>
                              </button>
                              <AnimatePresence>
                                {openPreCheckInMenuId === b._id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                    transition={{ duration: 0.14 }}
                                    onClick={(event) => event.stopPropagation()}
                                    className="absolute left-0 top-8 z-30 w-36 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-2xl shadow-black/40"
                                  >
                                    <a
                                      href={preCheckInUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => setOpenPreCheckInMenuId("")}
                                      className="block rounded-lg px-3 py-2 text-[11px] text-slate-200 hover:bg-white/[0.04]"
                                    >
                                      Abrir link
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenPreCheckInMenuId("");
                                        copyPreCheckInLink(b);
                                      }}
                                      className="block w-full rounded-lg px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-white/[0.04]"
                                    >
                                      Copiar link
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                              Sin link
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 ${DENSITY_CLASS[density]}`}>
                        <div className={`flex flex-wrap items-center gap-1.5 ${isCancelled ? "opacity-50" : ""}`}>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${deposit.className}`}>
                            {deposit.label}
                          </span>
                          {b.deposit?.paymentLink && deposit.status === "pending" && (
                            <a
                              href={b.deposit.paymentLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex px-2 py-1 rounded-lg bg-slate-900 text-[10px] text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors"
                            >
                              Link cobro
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filteredBookings.map((b) => {
              const roomName = roomMap.get(String(b.roomId))?.name || b.roomId;
              const deposit = getDepositInfo(b);
              const rowIndicator = getRowIndicator(b);

              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => openBookingDetail(b)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {rowIndicator && (
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${rowIndicator.color}`}
                            title={rowIndicator.title}
                          />
                        )}
                        <p className="truncate text-sm font-medium text-white">
                          {b.guestName}
                        </p>
                        {b.origin === "ical" && (
                          <span
                            className="whitespace-nowrap rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-400/80"
                            title="Bloqueo iCal"
                          >
                            iCal
                          </span>
                        )}
                      </div>
                      {b.guestEmail && (
                        <p className="text-xs text-zinc-500">{b.guestEmail}</p>
                      )}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusBadgeClass(b.status)}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <p>{roomName}</p>
                    <p className="text-right">{deposit.label}</p>
                    <p>In: {formatDate(b.checkIn)}</p>
                    <p className="text-right">Out: {formatDate(b.checkOut)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          </>
        )}
      </div>
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBookingDetail}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="h-full w-full overflow-y-auto border-l border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/50 md:w-[60vw] lg:w-[520px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedBooking.guestName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedBooking.guestEmail || "Sin email"} ·{" "}
                    {selectedBooking.guestPhone || "Sin teléfono"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeBookingDetail}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {getPrimaryAction(
                  selectedBooking,
                  selectedBooking.origin === "ical"
                ) === "check_in" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBooking(selectedBooking._id, {
                        status: "checked_in",
                      })
                    }
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Check-in
                  </button>
                )}
                {getPrimaryAction(
                  selectedBooking,
                  selectedBooking.origin === "ical"
                ) === "check_out" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBooking(selectedBooking._id, {
                        status: "checked_out",
                      })
                    }
                    className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Check-out
                  </button>
                )}
                {getDepositInfo(selectedBooking).status === "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBooking(selectedBooking._id, {
                        depositStatus: "paid",
                      })
                    }
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/15"
                  >
                    Marcar seña pagada
                  </button>
                )}
                {selectedBooking.preCheckIn?.token && (
                  <>
                    <a
                      href={`/precheckin/${selectedBooking.preCheckIn.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900"
                    >
                      Abrir pre check-in
                    </a>
                    <button
                      type="button"
                      onClick={() => copyPreCheckInLink(selectedBooking)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900"
                    >
                      Copiar link
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={startEditingBooking}
                  disabled={selectedBooking.origin === "ical"}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900"
                >
                  {selectedBooking.origin === "ical" ? "Edición iCal bloqueada" : "Editar"}
                </button>
                {selectedBooking.origin !== "ical" &&
                  selectedBooking.status !== "cancelled" &&
                  selectedBooking.status !== "checked_out" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !confirm("¿Seguro que querés cancelar esta reserva?")
                        )
                          return;
                        updateBooking(selectedBooking._id, {
                          status: "cancelled",
                        });
                      }}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-200 hover:bg-red-500/15"
                    >
                      Cancelar reserva
                    </button>
                  )}
              </div>

              {editingBooking && (
                <form
                  className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"
                  onSubmit={saveBookingEdit}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Editar reserva
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Podés modificar fechas, estado y seña.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBooking(false);
                        setEditError("");
                      }}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  {editError && (
                    <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
                      {editError}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-300">Entrada</span>
                      <input
                        type="date"
                        value={editCheckIn}
                        onChange={(event) => setEditCheckIn(event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-300">Salida</span>
                      <input
                        type="date"
                        value={editCheckOut}
                        onChange={(event) => setEditCheckOut(event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-300">Estado</span>
                      <select
                        value={editStatus}
                        onChange={(event) => setEditStatus(event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="reserved">Reservado</option>
                        <option value="checked_in">Check-in</option>
                        <option value="checked_out">Check-out</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-300">
                        Estado de seña
                      </span>
                      <select
                        value={editDepositStatus}
                        onChange={(event) =>
                          setEditDepositStatus(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="not_required">Sin seña</option>
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagada</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-300">
                        Monto de seña
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={editDepositAmount}
                        onChange={(event) =>
                          setEditDepositAmount(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-[11px] text-slate-300">
                        Link de cobro
                      </span>
                      <input
                        type="url"
                        value={editDepositPaymentLink}
                        onChange={(event) =>
                          setEditDepositPaymentLink(event.target.value)
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Estado
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {STATUS_LABEL[selectedBooking.status] || selectedBooking.status}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Seña
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {getDepositInfo(selectedBooking).label}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Check-in
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {formatDate(selectedBooking.checkIn)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Check-out
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {formatDate(selectedBooking.checkOut)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Habitación
                  </p>
                  <p className="mt-1 text-sm text-slate-100">
                    {roomMap.get(String(selectedBooking.roomId))?.name ||
                      selectedBooking.roomId}
                  </p>
                </div>
              </div>

              {selectedBooking.preCheckIn?.customAnswers?.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Extras y preferencias
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedBooking.preCheckIn.customAnswers.map((answer) => (
                      <div
                        key={answer.fieldId}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-200">
                            {answer.label}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {answer.type === "boolean"
                              ? answer.value
                                ? "Sí"
                                : "No"
                              : answer.value || "-"}
                          </p>
                        </div>
                        {answer.hasCost && answer.cost > 0 && (
                          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                            + $ {Number(answer.cost).toLocaleString("es-AR")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
