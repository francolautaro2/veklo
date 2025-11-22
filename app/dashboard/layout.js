// app/dashboard/layout.js
import Link from "next/link";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";

export const metadata = {
  title: "GestionFast - Panel",
  description: "Dashboard para gestionar tus propiedades.",
};

const navItems = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Reservas", href: "/dashboard/bookings" },
  { label: "Propiedades", href: "/dashboard/properties" },
  { label: "Habitaciones", href: "/dashboard/rooms" },
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
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") || "";

  let userEmail = "usuario@fast.com";
  let userName = "";
  let initials = "US";

  if (cookieHeader) {
    const parts = cookieHeader.split(";").map((c) => c.trim());
    const tokenPart = parts.find((p) =>
      p.startsWith("hotel_saas_token=")
    );

    if (tokenPart) {
      const token = decodeURIComponent(tokenPart.split("=")[1] || "");
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userEmail = payload.email || userEmail;
        userName = payload.name || "";
        initials = getInitials(userName, userEmail);
      } catch (err) {
        console.error("Error verificando JWT en layout:", err.message);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-slate-800 bg-slate-950/80">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            GF
          </div>
          <div>
            <p className="text-sm font-semibold">GestionFast</p>
            <p className="text-[11px] text-slate-500">
              Panel de administración
            </p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors text-xs"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between gap-2">
          <span className="truncate">Sesión: {userEmail}</span>

          <form method="POST" action="/api/auth/logout">
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-200 border border-slate-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold tracking-tight">
              Dashboard
            </h1>
            <div className="flex items-center gap-3">
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

        {/* Content */}
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
