import { Nunito, Playfair_Display } from "next/font/google";

/* `next/font` laedt die Schriften beim Build herunter und liefert sie von der
   eigenen Domain aus. Damit gibt es keine Anfrage an Google und nichts, wofuer
   eine Einwilligung noetig waere. Vorher stand in globals.css ein
   `@import url("https://fonts.googleapis.com/...")` - den hat der Bundler still
   verworfen, sodass Nunito ueberhaupt nicht ausgeliefert wurde.

   Eigene Datei, weil zwei Stellen ein eigenes `<html>` rendern: das Root-Layout
   und app/global-error.tsx, das das Layout ersetzt, wenn es selbst abstuerzt. */
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

export const fontClassName = `${nunito.variable} ${playfairDisplay.variable}`;
