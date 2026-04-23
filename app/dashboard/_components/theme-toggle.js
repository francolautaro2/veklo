"use client";

import { useState } from "react";

const THEME_STORAGE_KEY = "veklo-theme";
const LEGACY_THEME_STORAGE_KEY = "gestionfast-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function resolveInitialTheme() {
  if (typeof window === "undefined") return "dark";

  const fromDom = document.documentElement.getAttribute("data-theme");
  if (fromDom === "light" || fromDom === "dark") return fromDom;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  const legacyStored = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (legacyStored === "light" || legacyStored === "dark") return legacyStored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(resolveInitialTheme);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      <span aria-hidden suppressHydrationWarning>
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span className="hidden sm:inline" suppressHydrationWarning>
        {theme === "dark" ? "Tema claro" : "Tema oscuro"}
      </span>
    </button>
  );
}
