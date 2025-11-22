// app/page.js
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      {/* Navbar */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              GF
            </div>
            <span className="font-semibold tracking-tight">
              GestionFast
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Precios
            </a>
            <a href="#ayuda" className="hover:text-white transition-colors">
              Ayuda
            </a>
            <Link
              href="/auth/login"
              className="ml-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-900 bg-slate-950/80 min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="min-h-[calc(100vh-72px)] flex items-center py-16 md:py-24 lg:py-28">
            <div className="grid md:grid-cols-2 gap-12 items-center w-full mt-6 md:mt-16">
              {/* Texto */}
              <div>
                <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full border border-emerald-500/40 text-emerald-300 mb-4">
                  SaaS para hoteles, cabañas y casas
                </span>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                  Toda la gestión de tu hotel{" "}
                  <span className="text-emerald-400">en la palma de tu mano.</span>
                </h1>
                <p className="text-slate-300 text-sm md:text-base mb-6 max-w-xl">
                  Cargá tus propiedades, administrá habitaciones y controlá el
                  check-in / check-out desde un solo lugar. Pensado para hoteleros
                  que necesitan simplicidad y escalabilidad.
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Link
                    href="/auth/register"
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-colors"
                  >
                    Crear cuenta gratis
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-900 transition-colors"
                  >
                    Ver demo
                  </Link>
                </div>

                <p className="text-xs text-slate-400">
                  Sin tarjeta de crédito · Ideal para hoteles pequeños y medianos
                </p>
              </div>

              {/* Tarjeta “mock” del dashboard */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-emerald-500/5">
                <p className="text-xs font-medium text-slate-400 mb-3">
                  Vista rápida del panel
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Ocupación</p>
                    <p className="text-xl font-semibold text-emerald-400">82%</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Check-in hoy</p>
                    <p className="text-xl font-semibold text-slate-100">12</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Check-out hoy</p>
                    <p className="text-xl font-semibold text-slate-100">9</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Hotel Miramar</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                      95% ocupado
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Cabañas del Lago</span>
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300">
                      68% ocupado
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Casa Centro</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">
                      40% ocupado
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <span className="text-[10px] text-slate-500">
                    Datos de ejemplo · Dashboard en construcción
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* FEATURES */}
      <section
        id="features"
        className="border-t border-slate-800 bg-slate-950/60"
      >
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-8">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-[0.16em]">
              Pensado para el día a día
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Todo lo que necesitás para tu operación diaria.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 gap-4">
            {/* Card 1 */}
            <article className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm shadow-black/30">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                🏨
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Gestión de propiedades
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cargá hoteles, cabañas y casas. Organizá habitaciones, cupos y tipos
                de unidad en segundos, sin enredos.
              </p>
            </article>

            {/* Card 2 */}
            <article className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm shadow-black/30">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                📅
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Reservas y ocupación
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Check-in, check-out y estado de cada reserva en un solo panel. Sabés
                siempre cuántas habitaciones tenés libres hoy.
              </p>
            </article>

            {/* Card 3 */}
            <article className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm shadow-black/30">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                🇦🇷
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Enfocado en Argentina
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Moneda local, flujos simples, idioma español y soporte cercano a la
                realidad del país. Ideal para hoteles independientes y pequeñas
                cadenas.
              </p>
            </article>

            {/* Card 4 – nueva */}
            <article className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm shadow-black/30">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                👥
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Multiusuario y equipo
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compartí el acceso con recepción, administración o socios. Cada uno
                ve el mismo panel actualizado, sin pisarse ni depender de un solo
                usuario.
              </p>
            </article>
          </div>
        </div>
      </section>



      {/* PRICING */}
      <section
        id="pricing"
        className="border-t border-slate-800 bg-slate-950/80"
      >
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-8">
          <div className="text-center">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-[0.16em]">
              Planes
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">
              Empezá gratis, crecé cuando lo necesites.
            </h2>
            <p className="text-sm text-slate-400">
              Pensado para alojamientos de Argentina: precios en ARS y sin
              complicaciones.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Plan Gratis */}
            <div className="card bg-slate-900/70 border border-slate-800 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-sm">Plan Gratis</h3>
                <p className="text-xs text-slate-400">
                  Ideal para probar GestionFast con un solo alojamiento.
                </p>

                <div className="mt-4 mb-2">
                  <span className="text-3xl font-semibold">ARS 0</span>
                  <span className="text-xs text-slate-400 ml-1">/mes</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Sin tarjeta de crédito.
                </p>

                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• 1 propiedad</li>
                  <li>• Hasta 10 habitaciones</li>
                  <li>• Gestión básica de reservas</li>
                  <li>• Soporte por mail estándar</li>
                </ul>

                <div className="card-actions mt-5">
                  <button className="btn btn-sm btn-primary w-full">
                    Crear cuenta gratis
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Pro */}
            <div className="card bg-slate-900 border border-emerald-500/70 shadow-xl relative overflow-hidden">
              <span className="badge badge-sm badge-success absolute right-3 top-3">
                Más elegido
              </span>
              <div className="card-body">
                <h3 className="card-title text-sm">Plan Pro</h3>
                <p className="text-xs text-slate-400">
                  Para hoteles y complejos que quieren centralizar todo.
                </p>

                <div className="mt-4 mb-2">
                  <span className="text-3xl font-semibold">ARS 14.900</span>
                  <span className="text-xs text-slate-400 ml-1">/mes</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Precio orientativo, después lo ajustás a tu realidad.
                </p>

                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Hasta 5 propiedades</li>
                  <li>• Habitaciones ilimitadas</li>
                  <li>• Dashboard con métricas y ocupación</li>
                  <li>• Múltiples usuarios (recepción / admin)</li>
                  <li>• Soporte prioritario por mail</li>
                </ul>

                <div className="card-actions mt-5">
                  <button className="btn btn-sm btn-primary w-full">
                    Probar Plan Pro
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Plus */}
            <div className="card bg-slate-900/70 border border-slate-800 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-sm">Plan Plus</h3>
                <p className="text-xs text-slate-400">
                  Para cadenas chicas o quien necesita acompañamiento más de
                  cerca.
                </p>

                <div className="mt-4 mb-2">
                  <span className="text-3xl font-semibold">ARS 29.900</span>
                  <span className="text-xs text-slate-400 ml-1">/mes</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Incluye soporte más personalizado.
                </p>

                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Propiedades ilimitadas</li>
                  <li>• Reportes avanzados y exportables</li>
                  <li>• Entrenamiento inicial para tu equipo</li>
                  <li>• Soporte prioritario + opción llamada</li>
                </ul>

                <div className="card-actions mt-5">
                  <button className="btn btn-sm btn-outline w-full">
                    Hablar sobre este plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button className="btn btn-primary">Probando DaisyUI</button>


      {/* AYUDA / FAQ */}
      <section
        id="ayuda"
        className="border-t border-slate-800 bg-slate-950/60"
      >
        <div className="max-w-6xl mx-auto px-4 py-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Ayuda y soporte.</h2>
            <p className="text-sm text-slate-400 mb-4">
              Estamos armando la documentación y el centro de ayuda para que
              puedas resolver todo en minutos.
            </p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li>• Onboarding guiado para tus primeras propiedades.</li>
              <li>• Tips para cargar habitaciones y armar tu primer dashboard.</li>
              <li>• Mejores prácticas para manejar reservas y sobreventas.</li>
            </ul>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <h3 className="text-sm font-semibold mb-1">Preguntas frecuentes</h3>
            <div>
              <p className="font-medium text-slate-200">
                ¿Tengo que poner tarjeta para probar?
              </p>
              <p className="text-slate-400">
                No. Podés crear tu cuenta gratis, cargar tus propiedades y
                recién después decidir si pasás a un plan pago.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">
                ¿Puedo usarlo en más de un hotel?
              </p>
              <p className="text-slate-400">
                Sí. GestionFast está pensado para manejar varias propiedades con
                una sola cuenta.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-200">
                ¿Ofrecen soporte personalizado?
              </p>
              <p className="text-slate-400">
                En el plan Pro y Plus tenés soporte prioritario por mail y
                podemos coordinar una llamada si lo necesitás.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
