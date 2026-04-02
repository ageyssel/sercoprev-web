// app/layout.tsx
import type { Metadata } from "next";

// app/layout.tsx
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
        {/* Esto asegura que el icono cargue en todos los navegadores */}
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
// app/layout.tsx
export const metadata: Metadata = {
  title: "SERCOPREV - Contabilidad y Gestión", [cite: 4]
  description: "Su Partner Estratégico en el Camino al Éxito", [cite: 6]
  icons: {
    icon: "/logo.png", // Asegúrate de que el logo esté en la carpeta public/
  },
};