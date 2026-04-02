import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Agregamos una fuente elegante (serif) para los títulos
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "SERCOPREV - Contabilidad y Gestión",
  description: "Su Partner Estratégico en el Camino al Éxito. Más de 30 años impulsando Pymes.",
  icons: {
    icon: '/logo.png', // Esto fuerza el uso de tu imagen public/logo.png
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-[#fafafa] text-[#0f172a] antialiased`}>
        {children}
      </body>
    </html>
  );
}