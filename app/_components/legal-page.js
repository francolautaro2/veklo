import Link from "next/link";
import BrandLogo from "@/app/_components/brand-logo";

// Datos del titular del servicio. Completar antes de publicar: se muestran en
// /terminos y /privacidad.
export const LEGAL_ENTITY = {
  name: "[COMPLETAR: razón social o nombre del titular]",
  cuit: "[COMPLETAR: CUIT]",
  address: "[COMPLETAR: domicilio legal]",
  email: "hola@veklo.app",
};

export function LegalSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({ title, updatedAt, children }) {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" aria-label="Ir al inicio de veklo" className="inline-block">
          <BrandLogo
            size="md"
            className="text-slate-100"
            textClassName="text-slate-100"
          />
        </Link>

        <article className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
            <p className="text-xs text-slate-500">Última actualización: {updatedAt}</p>
          </header>

          {children}
        </article>

        <nav className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/terminos" className="hover:text-slate-300">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-slate-300">
            Política de privacidad
          </Link>
          <Link href="/arrepentimiento" className="hover:text-slate-300">
            Botón de arrepentimiento
          </Link>
          <a href="mailto:hola@veklo.app" className="hover:text-slate-300">
            hola@veklo.app
          </a>
        </nav>
      </div>
    </main>
  );
}
