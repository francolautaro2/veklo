import "./globals.css";

export const metadata = {
  title: "veklo - Gestión de alojamientos sin caos",
  description:
    "Gestioná reservas, pre check-in digital y operación diaria de tus alojamientos desde un solo panel.",
  icons: {
    icon: "/icon.svg",
  },
};

const themeInitializerScript = `
(() => {
  try {
    const storageKey = "veklo-theme";
    const legacyKey = "gestionfast-theme";
    const stored =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(legacyKey);

    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(storageKey, theme);
    window.localStorage.removeItem(legacyKey);
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Algunas extensiones del navegador agregan atributos al <body> antes de
          que React hidrate (por ejemplo ap-style=""). suppressHydrationWarning
          ignora esas diferencias solo en este elemento, no en sus hijos. */}
      <body
        className="bg-slate-950 text-slate-100 antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
        {children}
      </body>
    </html>
  );
}
