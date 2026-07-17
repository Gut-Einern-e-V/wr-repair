import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
