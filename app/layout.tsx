import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SERCOPREV - Contabilidad y Gestión",
  description: "Su Partner Estratégico en el Camino al Éxito. Más de 30 años impulsando Pymes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.className} bg-[#fafafa] text-[#0f172a] antialiased`}>
        {children}
      </body>
    </html>
  );
}