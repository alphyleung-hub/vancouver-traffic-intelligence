import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css"; // Required for MapLibre canvas rendering

export const metadata: Metadata = {
  title: "Vancouver Traffic Intelligence",
  description: "Real-time traffic and transit intelligence dashboard for Metro Vancouver",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}
