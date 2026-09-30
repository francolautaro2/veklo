import Link from "next/link";
import BrandLogo from "@/app/_components/brand-logo";

export const metadata = {
  title: "veklo - Página no encontrada",
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <BrandLogo size="md" className="text-slate-100" textClassName="text-slate-100" />
        </div>
        <h1 className="text-xl font-semibold text-slate-100">Página no encontrada</h1>
        <p className="text-sm text-slate-400">
          El link que abriste no existe o ya no está disponible.
        </p>
        <div className="flex justify-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-800"
          >
            Ir al inicio
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Ir al panel
          </Link>
        </div>
      </div>
    </main>
  );
}
