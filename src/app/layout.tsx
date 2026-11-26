import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buffetr | Bloomberg War Room",
  description:
    "Public free bubble/FUD terminal: Buffett Indicator hero with real M2/CPI, federal debt, housing, BTC/gold, margin/CAPE, Fear & Greed, and yield/credit satellites.",
  keywords: [
    "Buffetr",
    "Buffett Indicator",
    "market cap to GDP",
    "war room",
    "Fear and Greed",
    "yield curve",
    "federal debt",
    "bitcoin",
    "Case-Shiller",
    "financial dashboard",
  ],
  authors: [{ name: "Buffetr" }],
  openGraph: {
    title: "Buffetr | Bloomberg War Room",
    description:
      "Dense multi-panel market war room — Buffett Indicator hero plus correlated macro satellites. Alerts stubbed.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buffetr | Bloomberg War Room",
    description:
      "Public free Buffett Indicator war room with correlated bubble/FUD metrics.",
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
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
