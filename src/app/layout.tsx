import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buffetr | Warren Buffett Indicator & Market Analytics",
  description:
    "Track the Warren Buffett Indicator, precious metals prices, housing market data, and key financial metrics in real-time.",
  keywords: [
    "Warren Buffett Indicator",
    "market cap to GDP",
    "stock market valuation",
    "gold price",
    "silver price",
    "housing market",
    "mortgage rates",
    "financial dashboard",
  ],
  authors: [{ name: "Buffetr" }],
  openGraph: {
    title: "Buffetr | Warren Buffett Indicator & Market Analytics",
    description:
      "Track market valuations, precious metals, and housing data in one beautiful dashboard.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
