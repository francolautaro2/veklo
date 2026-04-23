"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const propertyTypesLabel = {
  hotel: "Hotel",
  cabana: "Cabaña",
  casa: "Casa",
};

const icalProviderLabel = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  other: "Otro",
};

export default function RoomsPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [basePrice, setBasePrice] = useState(0);

  const [creating, setCreating] = useState(false);
  const [updatingRoomId, setUpdatingRoomId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [priceDrafts, setPriceDrafts] = useState({});

  const [selectedIcalRoomId, setSelectedIcalRoomId] = useState("");
  const [icalConfig, setIcalConfig] = useState(null);
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [savingIcal, setSavingIcal] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState("");
  const [newIcalProvider, setNewIcalProvider] = useState("airbnb");
  const [newIcalName, setNewIcalName] = useState("");
  const [newIcalUrl, setNewIcalUrl] = useState("");

  function syncPriceDrafts(nextRooms) {
    const drafts = {};
    nextRooms.forEach((room) => {
      drafts[String(room._id)] = String(room.basePrice ?? 0);
    });
    setPriceDrafts(drafts);
  }

  async function fetchProperties() {
    try {
      const res = await fetch("/api/properties");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      setProperties(data.properties || []);
      if (data.properties?.length > 0) {
        setSelectedPropertyId(data.properties[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar propiedades.");
    }
  }

  async function fetchRooms(propertyId) {
    if (!propertyId) {
      setRooms([]);
      return;
    }

    setLoadingRooms(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms?propertyId=${propertyId}`);
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar habitaciones.");
        setLoadingRooms(false);
        return;
      }

      const nextRooms = data.rooms || [];
      setRooms(nextRooms);
      syncPriceDrafts(nextRooms);
      setLoadingRooms(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar habitaciones.");
      setLoadingRooms(false);
    }
  }

  async function fetchIcalConfig(roomId) {
    if (!roomId) {
      setIcalConfig(null);
      return;
    }

    setLoadingIcal(true);
    try {
      const res = await fetch(`/api/ical/rooms/${roomId}`);
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar la configuración iCal.");
        setLoadingIcal(false);
        return;
      }

      setIcalConfig(data.config || null);
      setLoadingIcal(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar la configuración iCal.");
      setLoadingIcal(false);
    }
  }

  async function postIcalAction(roomId, payload, successMessage) {
    setSavingIcal(true);
    try {
      const res = await fetch(`/api/ical/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setSavingIcal(false);
        return null;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar la acción iCal.");
        setSavingIcal(false);
        return null;
      }

      if (data.config) {
        setIcalConfig(data.config);
      }

      if (successMessage) {
        setNotice(successMessage);
      } else if (data.message) {
        setNotice(data.message);
      }

      setSavingIcal(false);
      return data;
    } catch (err) {
      console.error(err);
      setError("Error inesperado en iCal.");
      setSavingIcal(false);
      return null;
    }
  }

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchRooms(selectedPropertyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!rooms.length) {
      setSelectedIcalRoomId("");
      setIcalConfig(null);
      return;
    }

    const currentExists = rooms.some(
      (room) => String(room._id) === String(selectedIcalRoomId)
    );

    if (!currentExists) {
      setSelectedIcalRoomId(String(rooms[0]._id));
    }
  }, [rooms, selectedIcalRoomId]);

  useEffect(() => {
    if (selectedIcalRoomId) {
      fetchIcalConfig(selectedIcalRoomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIcalRoomId]);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!selectedPropertyId) {
      setError("Seleccioná primero una propiedad.");
      return;
    }
    setCreating(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          name,
          capacity: Number(capacity) || 2,
          basePrice: Number(basePrice) || 0,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        setCreating(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error al crear habitación.");
        setCreating(false);
        return;
      }

      setName("");
      setCapacity(2);
      setBasePrice(0);
      setRooms((prev) => {
        const next = [data.room, ...prev];
        syncPriceDrafts(next);
        return next;
      });
      setNotice("Habitación creada correctamente.");
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear habitación.");
      setCreating(false);
    }
  }

  async function handleUpdateRoomPrice(roomId) {
    setError("");
    setNotice("");

    const draftValue = priceDrafts[String(roomId)];
    const parsedPrice = Number(draftValue);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Ingresá un precio válido mayor o igual a 0.");
      return;
    }

    setUpdatingRoomId(String(roomId));
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: parsedPrice }),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        setUpdatingRoomId("");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el precio.");
        setUpdatingRoomId("");
        return;
      }

      setRooms((prev) => {
        const next = prev.map((room) =>
          String(room._id) === String(roomId) ? data.room : room
        );
        syncPriceDrafts(next);
        return next;
      });
      setNotice("Precio actualizado correctamente.");
      setUpdatingRoomId("");
    } catch (err) {
      console.error(err);
      setError("Error inesperado al actualizar el precio.");
      setUpdatingRoomId("");
    }
  }

  async function handleAddIcalSource(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedIcalRoomId) {
      setError("Seleccioná una habitación para configurar iCal.");
      return;
    }

    if (!newIcalUrl.trim()) {
      setError("Pegá una URL iCal para agregar la fuente.");
      return;
    }

    const data = await postIcalAction(
      selectedIcalRoomId,
      {
        action: "add_source",
        provider: newIcalProvider,
        name: newIcalName,
        url: newIcalUrl,
      },
      "Fuente iCal agregada."
    );

    if (!data) return;

    setNewIcalUrl("");
    setNewIcalName("");
  }

  async function handleDeleteIcalSource(sourceId) {
    setError("");
    setNotice("");
    if (!selectedIcalRoomId || !sourceId) return;

    await postIcalAction(
      selectedIcalRoomId,
      { action: "delete_source", sourceId },
      "Fuente iCal eliminada."
    );
  }

  async function handleRegenerateExportToken() {
    setError("");
    setNotice("");
    if (!selectedIcalRoomId) return;

    await postIcalAction(
      selectedIcalRoomId,
      { action: "regenerate_export_token" },
      "Link de exportación regenerado."
    );
  }

  async function handleSyncIcal(sourceId = "") {
    setError("");
    setNotice("");
    if (!selectedIcalRoomId) return;

    setSyncingSourceId(sourceId || "all");
    const data = await postIcalAction(selectedIcalRoomId, {
      action: "sync",
      sourceId,
    });
    setSyncingSourceId("");

    if (!data) return;

    const successCount = (data.results || []).filter((item) => item.ok).length;
    const errorCount = (data.results || []).length - successCount;
    setNotice(
      `Sincronización finalizada. ${successCount} fuente(s) OK${
        errorCount > 0 ? `, ${errorCount} con error` : ""
      }.`
    );
  }

  async function handleCopyExportUrl() {
    const exportUrl = icalConfig?.exportUrl || "";
    if (!exportUrl) {
      setError("No se pudo resolver el link de exportación iCal.");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportUrl);
      setNotice("Link iCal copiado al portapapeles.");
    } catch {
      setError("No se pudo copiar el link iCal.");
    }
  }

  const selectedProperty = properties.find((p) => p._id === selectedPropertyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Habitaciones</h2>
          <p className="text-[11px] text-slate-400">
            Administrá las habitaciones de tus propiedades.
          </p>
        </div>
      </div>

      {/* Selector de propiedad */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="space-y-2">
          <label className="block text-[11px] text-slate-300">
            Propiedad seleccionada
          </label>
          {properties.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Todavía no tenés propiedades. Creá una desde la sección
              &quot;Propiedades&quot;.
            </p>
          ) : (
            <select
              className="w-full max-w-xs rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} · {propertyTypesLabel[p.type] || p.type}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Formulario de creación */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold mb-3">
          Agregar nueva habitación
        </h3>

        {error && (
          <div className="mb-3 text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-3 text-[11px] text-emerald-300 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}

        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={handleCreateRoom}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">Nombre</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Habitación 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">
              Capacidad (personas)
            </label>
            <input
              type="number"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">
              Precio base por noche
            </label>
            <input
              type="number"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-end justify-end">
            <button
              type="submit"
              disabled={creating || !selectedPropertyId}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? "Guardando..." : "Guardar habitación"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de habitaciones */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold">Habitaciones</h3>
          {selectedProperty && (
            <span className="text-[11px] text-slate-500">
              {selectedProperty.name}
            </span>
          )}
        </div>

        {loadingRooms ? (
          <p className="text-[11px] text-slate-400">
            Cargando habitaciones...
          </p>
        ) : rooms.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            No hay habitaciones para esta propiedad.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Capacidad</th>
                  <th className="text-left py-2">Precio base</th>
                  <th className="text-left py-2">Creado</th>
                  <th className="text-left py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-slate-900/60 last:border-none"
                  >
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">{r.capacity}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={priceDrafts[String(r._id)] ?? ""}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [String(r._id)]: e.target.value,
                            }))
                          }
                          className="w-28 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </td>
                    <td className="py-2 text-slate-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateRoomPrice(r._id)}
                        disabled={updatingRoomId === String(r._id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updatingRoomId === String(r._id)
                          ? "Guardando..."
                          : "Guardar precio"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integración iCal */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold">Sincronización iCal</h3>
            <p className="text-[11px] text-slate-400">
              Exportá tu disponibilidad e importá bloqueos desde Airbnb,
              Booking.com u otros calendarios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSyncIcal()}
            disabled={
              !selectedIcalRoomId || savingIcal || syncingSourceId === "all"
            }
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncingSourceId === "all" ? "Sincronizando..." : "Sincronizar todo"}
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Creá al menos una habitación para habilitar iCal.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                Habitación para sincronizar
              </label>
              <select
                value={selectedIcalRoomId}
                onChange={(e) => setSelectedIcalRoomId(e.target.value)}
                className="w-full max-w-sm rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingIcal ? (
              <p className="text-[11px] text-slate-400">
                Cargando configuración iCal...
              </p>
            ) : !icalConfig ? (
              <p className="text-[11px] text-slate-400">
                Seleccioná una habitación para ver su configuración iCal.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <p className="text-[11px] text-slate-300 font-medium">
                    Exportar disponibilidad
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pegá este link en Airbnb/Booking.com para que lean tu
                    disponibilidad.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      readOnly
                      value={icalConfig.exportUrl || ""}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-[11px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyExportUrl}
                      className="px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-200 hover:bg-slate-900 transition-colors"
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateExportToken}
                      disabled={savingIcal}
                      className="px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-3">
                  <p className="text-[11px] text-slate-300 font-medium">
                    Agregar calendario externo
                  </p>

                  <form
                    onSubmit={handleAddIcalSource}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <select
                      value={newIcalProvider}
                      onChange={(e) => setNewIcalProvider(e.target.value)}
                      className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="airbnb">Airbnb</option>
                      <option value="booking">Booking.com</option>
                      <option value="other">Otro</option>
                    </select>
                    <input
                      type="text"
                      value={newIcalName}
                      onChange={(e) => setNewIcalName(e.target.value)}
                      placeholder="Nombre (opcional)"
                      className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <input
                      type="url"
                      required
                      value={newIcalUrl}
                      onChange={(e) => setNewIcalUrl(e.target.value)}
                      placeholder="https://.../calendar.ics"
                      className="md:col-span-2 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <div className="md:col-span-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingIcal}
                        className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        Agregar fuente
                      </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] text-slate-300 font-medium mb-2">
                    Fuentes conectadas
                  </p>

                  {icalConfig.sources?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800">
                            <th className="text-left py-2">Proveedor</th>
                            <th className="text-left py-2">Nombre</th>
                            <th className="text-left py-2">Última sync</th>
                            <th className="text-left py-2">Estado</th>
                            <th className="text-left py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {icalConfig.sources.map((source) => (
                            <tr
                              key={source.sourceId}
                              className="border-b border-slate-900/60 last:border-none"
                            >
                              <td className="py-2">
                                {icalProviderLabel[source.provider] || "Otro"}
                              </td>
                              <td className="py-2">
                                <div>
                                  <p>{source.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate max-w-[260px]">
                                    {source.url}
                                  </p>
                                </div>
                              </td>
                              <td className="py-2 text-slate-400">
                                {source.lastSyncedAt
                                  ? new Date(source.lastSyncedAt).toLocaleString(
                                      "es-AR"
                                    )
                                  : "Nunca"}
                              </td>
                              <td className="py-2">
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-900 text-slate-200">
                                  {source.lastSyncStatus === "ok"
                                    ? "OK"
                                    : source.lastSyncStatus === "error"
                                      ? "Error"
                                      : "Pendiente"}
                                </span>
                                {source.lastSyncMessage ? (
                                  <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                                    {source.lastSyncMessage}
                                  </p>
                                ) : null}
                              </td>
                              <td className="py-2">
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSyncIcal(source.sourceId)}
                                    disabled={
                                      savingIcal ||
                                      syncingSourceId === source.sourceId
                                    }
                                    className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {syncingSourceId === source.sourceId
                                      ? "Sync..."
                                      : "Sincronizar"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteIcalSource(source.sourceId)
                                    }
                                    disabled={savingIcal}
                                    className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-[10px] hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      No hay fuentes externas conectadas todavía.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
