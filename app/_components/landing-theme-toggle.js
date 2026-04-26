"use client";

import { useState } from "react";
import styles from "@/app/landing.module.css";

const THEME_STORAGE_KEY = "veklo-theme";
const LEGACY_THEME_STORAGE_KEY = "gestionfast-theme";

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

export default function LandingThemeToggle() {
  const [theme, setTheme] = useState(resolveInitialTheme);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={handleToggle}
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
      suppressHydrationWarning
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
