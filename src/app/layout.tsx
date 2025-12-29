import type { Metadata } from "next";
import { Nunito, DM_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buffetr | Your Friendly Market Dashboard 📈",
  description:
    "Track the Warren Buffett Indicator, precious metals prices, housing market data, and key financial metrics - made simple and beautiful.",
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
    title: "Buffetr | Your Friendly Market Dashboard 📈",
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
    <html lang="en">
      <body
        className={`${nunito.variable} ${dmSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
