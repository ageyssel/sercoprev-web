// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SERCOPREV - Contabilidad y Gestión",
  description: "Su partner estratégico en contabilidad y gestión empresarial.",
  icons: {
    icon: "/logo.png", // Esto apunta directamente a public/logo.png
    shortcut: "/logo.png",
    apple: "/logo.png",
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
        {/* Esto asegura que el icono cargue en todos los navegadores */}
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}