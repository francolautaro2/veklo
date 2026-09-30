"use client";

import { useState } from "react";
import Icon from "@/app/_components/icon";
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
      {/* Los dos íconos se renderizan siempre; el CSS muestra el del tema activo. */}
      <Icon name="sun" size={17} className={styles.iconSun} />
      <Icon name="moon" size={17} className={styles.iconMoon} />
    </button>
  );
}
