"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isItemActive(pathname, href) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNav({ items }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Navegación
      </p>

      <div className="space-y-1.5">
        {items.map((item) => {
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative block rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                  : "text-slate-300 border border-transparent hover:border-slate-800 hover:bg-slate-900/70 hover:text-slate-100"
              }`}
            >
              <span className="font-medium">{item.label}</span>
              {active && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
