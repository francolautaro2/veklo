import BrandLogo from "@/app/_components/brand-logo";
import "../globals.css";

export const metadata = {
  title: "veklo - Acceso",
  description: "Iniciá sesión o creá tu cuenta en veklo.",
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center gap-2">
          <BrandLogo
            size="md"
            className="text-slate-100"
            textClassName="text-slate-100"
          />
          <p className="text-xs text-slate-400 text-center">
            Gestión simple para hoteles, cabañas y alquileres temporarios.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl shadow-emerald-500/5 p-6">
          {children}
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          © {new Date().getFullYear()} veklo · Hecho para alojamientos
          independientes
        </p>
      </div>
    </div>
  );
}
