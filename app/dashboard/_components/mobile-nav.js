"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isItemActive(pathname, href) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNav({ items }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden border-b border-slate-800 bg-slate-950/70">
      <div className="px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {items.map((item) => {
            const active = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs border transition-colors ${
                  active
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-700 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
