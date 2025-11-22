// app/layout.js

import "./globals.css"
import {Inter} from "next/font/google";

const inter = Inter({subsets:["latin"]});

export const medata = {
  title: "GestionFast - SaaS de Gestión Hotelera",
  description: "Toda la gestión de tu hotel en la palma de tu mano en un solo click.",
}

export default function RootLayout({children}){
  return (
    <html lang="es">
      <body
        className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}