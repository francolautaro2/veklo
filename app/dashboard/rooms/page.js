"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const propertyTypesLabel = {
  hotel: "Hotel",
  cabana: "Cabaña",
  casa: "Casa",
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
  const [error, setError] = useState("");

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

      setRooms(data.rooms || []);
      setLoadingRooms(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar habitaciones.");
      setLoadingRooms(false);
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

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError("");
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
      setRooms((prev) => [data.room, ...prev]);
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear habitación.");
      setCreating(false);
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
                      {r.basePrice
                        ? `$ ${r.basePrice.toLocaleString("es-AR")}`
                        : "-"}
                    </td>
                    <td className="py-2 text-slate-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}