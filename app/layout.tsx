import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SERCOPREV - Contabilidad y Gestión",
  description: "Su Partner Estratégico en el Camino al Éxito",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}