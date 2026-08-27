import type { Metadata } from "next";
import { Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/share";
import { ConsentAnalytics } from "@/components/consent-analytics";
import { ConsentBanner } from "@/components/consent-banner";
import { ScrollReveal } from "@/components/scroll-reveal";

/* `next/font` laedt die Schriften beim Build herunter und liefert sie von der
   eigenen Domain aus. Damit gibt es keine Anfrage an Google und nichts, wofuer
   eine Einwilligung noetig waere. Vorher stand in globals.css ein
   `@import url("https://fonts.googleapis.com/...")` - den hat der Bundler still
   verworfen, sodass Nunito ueberhaupt nicht ausgeliefert wurde. */
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-display",
});

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
    <html lang="de" className={`${nunito.variable} ${playfairDisplay.variable}`}>
      <body>
        {children}
        <ScrollReveal />
        <ConsentBanner />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
