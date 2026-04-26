// app/dashboard/layout.js
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Link from "next/link";
import SidebarNav from "@/app/dashboard/_components/sidebar-nav";
import MobileNav from "@/app/dashboard/_components/mobile-nav";
import BrandLogo from "@/app/_components/brand-logo";

export const metadata = {
  title: "veklo - Panel",
  description: "Dashboard para gestionar tus propiedades.",
};

const navItems = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Reservas", href: "/dashboard/bookings" },
  { label: "Calendario", href: "/dashboard/calendar" },
  { label: "Propiedades", href: "/dashboard/properties" },
  { label: "Habitaciones", href: "/dashboard/rooms" },
  { label: "Perfil", href: "/dashboard/profile" },
];

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "US";
}

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hotel_saas_token")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  let userEmail = "usuario@veklo.app";
  let userName = "";
  let initials = "US";

  if (token && jwtSecret) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      userEmail = payload.email || userEmail;
      userName = payload.name || "";
      initials = getInitials(userName, userEmail);
    } catch {
      // Si el token no es valido, mantenemos datos anonimos.
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased md:pl-64">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/85 md:flex">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <div>
            <BrandLogo
              size="md"
              className="text-slate-100"
              textClassName="vk-display text-slate-100"
            />
            <p className="text-[11px] text-slate-500">
              Panel de administración
            </p>
          </div>
        </div>

        <SidebarNav items={navItems} />

        <div className="px-3 py-3 border-t border-slate-800">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-full h-8 w-8 bg-slate-800 flex items-center justify-center text-[11px] font-semibold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-200 truncate">
                  {userName || "Cuenta principal"}
                </p>
                <p className="text-[10px] text-slate-500 truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            </div>

            <form method="POST" action="/api/auth/logout">
              <button
                type="submit"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs text-slate-200 border border-slate-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col">
        {/* Topbar */}
        <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              Dashboard
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/dashboard/profile#datos-personales"
                className="md:hidden px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 text-xs text-emerald-300 hover:bg-slate-800 transition-colors"
              >
                Perfil
              </Link>

              <form method="POST" action="/api/auth/logout" className="md:hidden">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Salir
                </button>
              </form>

              <div className="flex flex-col items-end">
                {userName && (
                  <span className="text-xs text-slate-200 truncate max-w-[180px]">
                    {userName}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                  {userEmail}
                </span>
              </div>
              <div className="rounded-full h-7 w-7 bg-slate-800 flex items-center justify-center text-[11px] font-semibold">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <MobileNav items={navItems} />

        {/* Content */}
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
