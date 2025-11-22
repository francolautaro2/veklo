// app/auth/layout.js
import "../globals.css";

export const metadata = {
  title: "HotelFlow - Autenticación",
  description: "Iniciá sesión o creá tu cuenta en HotelFlow.",
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
            <div className="mb-8 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                HF
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
                GestionFast
            </h1>
            <p className="text-xs text-slate-400 text-center">
                Gestión simple para hoteles, cabañas y casas.
            </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl shadow-emerald-500/5 p-6">
            {children}
            </div>

            <p className="mt-4 text-[11px] text-slate-500 text-center">
            © {new Date().getFullYear()} HotelFlow · Hecho para hoteleros
            independientes
            </p>
        </div>
    </div>
  );
}
