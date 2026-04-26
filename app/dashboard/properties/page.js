"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const propertyTypes = [
  { value: "hotel", label: "Hotel" },
  { value: "cabana", label: "Cabaña" },
  { value: "casa", label: "Casa" },
];

const templateFieldTypes = [
  { value: "boolean", label: "Sí / No" },
  { value: "text", label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
];

function createTemplateField() {
  const suffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    fieldId: `field-${suffix}`,
    label: "Nuevo campo",
    type: "boolean",
    required: false,
    hasCost: false,
    cost: 0,
  };
}

function getTemplateFields(property) {
  return property?.preCheckInTemplate?.customFields || [];
}

function getPropertyId(property) {
  return String(property?._id || property?.id || "");
}

function PreCheckInTemplateCard({ property, saving, onSave }) {
  const propertyId = getPropertyId(property);
  const [fields, setFields] = useState(() => getTemplateFields(property));

  useEffect(() => {
    setFields(getTemplateFields(property));
  }, [property]);

  function addField() {
    setFields((current) => [...current, createTemplateField()]);
  }

  function updateField(fieldId, patch) {
    setFields((current) =>
      current.map((field) =>
        field.fieldId === fieldId
          ? {
              ...field,
              ...patch,
              cost:
                Object.prototype.hasOwnProperty.call(patch, "hasCost") &&
                !patch.hasCost
                  ? 0
                  : Object.prototype.hasOwnProperty.call(patch, "cost")
                    ? patch.cost
                    : field.cost,
            }
          : field
      )
    );
  }

  function removeField(fieldId) {
    setFields((current) => current.filter((field) => field.fieldId !== fieldId));
  }

  async function handleSave() {
    const savedFields = await onSave(property, fields);
    if (savedFields) {
      setFields(savedFields);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-100">{property.name}</p>
          <p className="text-[10px] text-slate-500">
            {fields.length} campo(s) personalizado(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addField}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
          >
            Agregar campo
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Guardando..." : "Guardar plantilla"}
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-[11px] text-slate-500">
          Todavía no agregaste campos. Ejemplo: “¿Querés toallas extra?” con
          costo opcional.
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.fieldId}
              className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1.6fr_130px_90px_90px_110px_auto]"
            >
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">
                  Pregunta / extra
                </span>
                <input
                  type="text"
                  value={field.label}
                  onChange={(event) =>
                    updateField(field.fieldId, { label: event.target.value })
                  }
                  placeholder="Ej: Toallas extra"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">Tipo</span>
                <select
                  value={field.type}
                  onChange={(event) =>
                    updateField(field.fieldId, { type: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {templateFieldTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    updateField(field.fieldId, { required: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                />
                Obligatorio
              </label>

              <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(field.hasCost)}
                  onChange={(event) =>
                    updateField(field.fieldId, { hasCost: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                />
                Tiene costo
              </label>

              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">Costo</span>
                <input
                  type="number"
                  min="0"
                  value={field.cost || 0}
                  disabled={!field.hasCost}
                  onChange={(event) =>
                    updateField(field.fieldId, { cost: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeField(field.fieldId)}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-[11px] text-red-200 hover:bg-red-500/10"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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
  const [templateSavingId, setTemplateSavingId] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");

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

      const nextProperties = data.properties || [];
      setProperties(nextProperties);
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

  async function saveTemplate(property, customFields) {
    const propertyId = getPropertyId(property);

    setTemplateError("");
    setTemplateNotice("");
    setTemplateSavingId(propertyId);

    try {
      const res = await fetch(`/api/properties/${propertyId}/precheckin-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customFields }),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setTemplateError(data.error || "No se pudo guardar la plantilla.");
        setTemplateSavingId("");
        return;
      }

      setProperties((current) =>
        current.map((item) =>
          getPropertyId(item) === propertyId ? data.property : item
        )
      );
      setTemplateNotice(`Plantilla de ${property.name} guardada.`);
      setTemplateSavingId("");
      return data.customFields || getTemplateFields(data.property);
    } catch {
      setTemplateError("Error inesperado al guardar la plantilla.");
      setTemplateSavingId("");
    }

    return null;
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

      {/* Plantillas de pre check-in */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold">
              Plantillas de pre check-in
            </h3>
            <p className="text-[11px] text-slate-500">
              Agregá preguntas o extras para que el huésped los complete desde
              su link. Si tienen costo, se muestran en el formulario.
            </p>
          </div>
        </div>

        {templateError && (
          <div className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-[11px] text-red-300">
            {templateError}
          </div>
        )}

        {templateNotice && (
          <div className="mb-3 rounded-lg border border-emerald-800 bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-200">
            {templateNotice}
          </div>
        )}

        {loadingList ? (
          <div className="text-[11px] text-slate-400">
            Cargando plantillas...
          </div>
        ) : properties.length === 0 ? (
          <div className="text-[11px] text-slate-400">
            Creá una propiedad para configurar su plantilla.
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => {
              const propertyId = getPropertyId(property);

              return (
                <PreCheckInTemplateCard
                  key={propertyId}
                  property={property}
                  saving={templateSavingId === propertyId}
                  onSave={saveTemplate}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
