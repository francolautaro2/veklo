// app/dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState("");
  const [today, setToday] = useState({
    checkIns: [],
    checkOuts: []
  });

  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState("");
  const [trendData, setTrendData] = useState([]);

  const [properties, setProperties] = useState([]);
  const [propertiesError, setPropertiesError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  // Cargar propiedades para el filtro
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

        // asumo que tu endpoint devuelve { properties: [...] }
        setProperties(data.properties || []);
      } catch (err) {
        console.error(err);
        setPropertiesError("Error inesperado al cargar propiedades.");
      }
    }

    fetchProperties();
  }, [router]);

  // Cargar resumen (dependiendo de la propiedad seleccionada)
  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        setSummaryError("");

        const query =
          selectedPropertyId === "all"
            ? ""
            : `?propertyId=${selectedPropertyId}`;

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

  // Cargar tendencias (también filtradas por propiedad)
  useEffect(() => {
    async function fetchTrends() {
      try {
        setTrendLoading(true);
        setTrendError("");

        const query =
          selectedPropertyId === "all"
            ? ""
            : `?propertyId=${selectedPropertyId}`;

        const res = await fetch(`/api/dashboard/trends${query}`);
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
  }, [router, selectedPropertyId]);

  // cargar agenda de hoy (check-ins y check-outs)
  useEffect(() => {
    async function fetchToday() {
      try {
        setTodayLoading(true);
        setTodayError("");

        const query =
          selectedPropertyId === "all"
            ? ""
            : `?propertyId=${selectedPropertyId}`;

        const res = await fetch(`/api/dashboard/today${query}`);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setTodayError(data.error || "Error al cargar la agenda de hoy.");
          setTodayLoading(false);
          return;
        }

        setToday({
          checkIns: data.checkIns || [],
          checkOuts: data.checkOuts || [],
        });
        setTodayLoading(false);
      } catch (err) {
        console.error(err);
        setTodayError("Error inesperado al cargar la agenda de hoy.");
        setTodayLoading(false);
      }
    }

    fetchToday();
  }, [router, selectedPropertyId]);

  const {
    propertiesCount,
    roomsCount,
    bookingsCount,
    todayCheckins,
    todayCheckouts,
    todayOccupiedRooms,
    totalRooms,
    bookingsByStatus = {},
  } = summary;

  const {
    reserved = 0,
    checked_in = 0,
    checked_out = 0,
    cancelled = 0,
  } = bookingsByStatus;

  const occupancyPercent =
    totalRooms > 0
      ? Math.round((todayOccupiedRooms / totalRooms) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {summaryError && (
        <div className="text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {summaryError}
        </div>
      )}

      {propertiesError && (
        <div className="text-[11px] text-yellow-300 bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2">
          {propertiesError}
        </div>
      )}

      {/* Header + filtro */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Resumen</h2>
          <p className="text-[11px] text-slate-400">
            Estado actual del negocio.
          </p>
        </div>

        {properties.length > 0 && (
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">
              Ver métricas de
            </label>
            <select
              className="w-60 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="all">
                Todas las propiedades ({propertiesCount || properties.length})
              </option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 mb-1">Ocupación actual</p>
          <p className="text-2xl font-semibold text-emerald-400">
            {loading ? "…" : `${occupancyPercent}%`}
          </p>
          <p className="text-[11px] text-slate-500">
            {loading
              ? "Calculando ocupación..."
              : `${todayOccupiedRooms} de ${totalRooms} habitaciones ocupadas`}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 mb-1">Check-in hoy</p>
          <p className="text-2xl font-semibold">
            {loading ? "…" : todayCheckins}
          </p>
          <p className="text-[11px] text-slate-500">
            Llegadas previstas para el día
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 mb-1">Check-out hoy</p>
          <p className="text-2xl font-semibold">
            {loading ? "…" : todayCheckouts}
          </p>
          <p className="text-[11px] text-slate-500">
            Salidas programadas para hoy
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400 mb-1">Propiedades</p>
          <p className="text-2xl font-semibold">
            {loading ? "…" : propertiesCount}
          </p>
          <p className="text-[11px] text-slate-500">
            Hoteles, cabañas y casas cargadas
          </p>
        </div>
      </div>

      {/* Agenda de hoy */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold">Agenda de hoy</h2>
            <p className="text-[11px] text-slate-400">
              Check-in y check-out programados para el día.
            </p>
          </div>
        </div>

        {todayError && (
          <div className="mb-3 text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {todayError}
          </div>
        )}

        {todayLoading ? (
          <p className="text-[11px] text-slate-400">
            Cargando agenda del día...
          </p>
        ) : today.checkIns.length === 0 && today.checkOuts.length === 0 ? (
          <p className="text-[11px] text-slate-400">
              No hay movimientos para hoy.
            {selectedPropertyId !== "all" ? " en esta propiedad." : "."}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 text-[11px]">
            {/* Columna Check-in */}
            <div>
              <p className="text-slate-400 mb-2">Check-in</p>
              <div className="space-y-2">
                {today.checkIns.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-slate-100 font-medium">
                        {b.guestName}
                      </p>
                      <p className="text-slate-400">
                        {b.propertyName} · {b.roomName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">
                        Check-in:{" "}
                        {new Date(b.checkIn).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Check-out */}
            <div>
              <p className="text-slate-400 mb-2">Check-out</p>
              <div className="space-y-2">
                {today.checkOuts.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-slate-100 font-medium">
                        {b.guestName}
                      </p>
                      <p className="text-slate-400">
                        {b.propertyName} · {b.roomName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">
                        Check-out:{" "}
                        {new Date(b.checkOut).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen general */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold mb-3">Resumen general</h2>

        <div className="grid gap-4 md:grid-cols-2 text-[11px]">
          {/* KPIs globales */}
          <div className="space-y-3">
            <div>
              <p className="text-slate-400 mb-1">Habitaciones totales</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : roomsCount}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Reservas totales</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : bookingsCount}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Ocupación hoy</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : `${occupancyPercent}%`}
              </p>
            </div>
          </div>

          {/* Reservas por estado */}
          <div className="space-y-3">
            <div>
              <p className="text-slate-400 mb-1">Reservadas</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : reserved}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Check-in</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : checked_in}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Check-out</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : checked_out}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Canceladas</p>
              <p className="text-slate-100 text-lg font-semibold">
                {loading ? "…" : cancelled}
              </p>
            </div>
          </div>
        </div>
      </div>

      

      {/* Gráfico de tendencias */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold">
              Ocupación últimos 7 días
            </h2>
            <p className="text-[11px] text-slate-400">
              Seguí cómo evoluciona la ocupación día a día.
            </p>
          </div>
        </div>

        {trendError && (
          <div className="mb-3 text-[11px] text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            {trendError}
          </div>
        )}

        {trendLoading ? (
          <p className="text-[11px] text-slate-400">
            Cargando datos de los últimos días...
          </p>
        ) : trendData.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Todavía no hay reservas en los últimos días para mostrar el
            gráfico.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <LineChart
              width={640}
              height={260}
              data={trendData}
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
                  if (name === "occupancyPercent") {
                    return [`${value}%`, "Ocupación"];
                  }
                  if (name === "checkIns") {
                    return [value, "Check-in"];
                  }
                  if (name === "checkOuts") {
                    return [value, "Check-out"];
                  }
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="occupancyPercent"
                stroke="#22c55e"
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
          </div>
        )}
      </div>
    </div>
  );
}
