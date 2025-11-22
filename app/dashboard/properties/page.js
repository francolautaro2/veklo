"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const propertyTypes = [
  { value: "hotel", label: "Hotel" },
  { value: "cabana", label: "Cabaña" },
  { value: "casa", label: "Casa" },
];

export default function PropertiesPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [name, setName] = useState("");
  const [type, setType] = useState("hotel");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function fetchProperties() {
    setLoadingList(true);
    setError("");

    try {
      const res = await fetch("/api/properties");

      if (res.status === 401) {
        // No autenticado → al login
        router.push("/auth/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cargar propiedades.");
        setLoadingList(false);
        return;
      }

      setProperties(data.properties || []);
      setLoadingList(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar propiedades.");
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateProperty(e) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, type, address, description }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Error al crear propiedad.");
        setCreating(false);
        return;
      }

      // Limpiar form
      setName("");
      setType("hotel");
      setAddress("");
      setDescription("");

      // Actualizar lista
      setProperties((prev) => [data.property, ...prev]);
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear propiedad.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Propiedades</h2>
          <p className="text-[11px] text-slate-400">
            Hoteles, cabañas y casas que estás gestionando.
          </p>
        </div>
      </div>

      {/* Formulario crear propiedad */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold mb-3">
          Agregar nueva propiedad
        </h3>

        {error && (
          <div className="mb-3 text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleCreateProperty}
        >
          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">Nombre</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Hotel Miramar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">Tipo</label>
            <select
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {propertyTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">Dirección</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Av. Costanera 123, Mar del Plata"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-slate-300">
              Descripción (opcional)
            </label>
            <textarea
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              rows={2}
              placeholder="Hotel frente al mar con 40 habitaciones..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-2 flex justify-start">
            <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {creating ? "Guardando..." : "Guardar propiedad"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de propiedades */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold">Listado</h3>
          {loadingList ? (
            <span className="text-[11px] text-slate-500">
              Cargando...
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">
              {properties.length} propiedad(es)
            </span>
          )}
        </div>

        {loadingList ? (
          <div className="text-[11px] text-slate-400">
            Cargando propiedades...
          </div>
        ) : properties.length === 0 ? (
          <div className="text-[11px] text-slate-400">
            Todavía no cargaste ninguna propiedad.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-left py-2">Dirección</th>
                  <th className="text-left py-2">Creado</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-slate-900/60 last:border-none"
                  >
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 capitalize">{p.type}</td>
                    <td className="py-2">
                      {p.address || (
                        <span className="text-slate-500">
                          Sin dirección
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-400">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("es-AR")
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
