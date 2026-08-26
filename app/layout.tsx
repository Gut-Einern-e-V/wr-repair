import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/share";

export const metadata: Metadata = {
  // Ohne metadataBase wuerden geteilte Links und Bilder relativ bleiben.
  metadataBase: new URL(getSiteUrl() || "http://localhost:3000"),
  title: "Reparaturrekord NRW | FAB Region",
  description: "Gemeinsam reparieren wir den Weltrekord.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
