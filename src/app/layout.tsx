import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { parseSlug } from "@/lib/verdict";
import "./globals.css";

// Bundled files. next/font/google asks Google at build time, and an
// extensionless kit URL fails the Vercel production build.
const ibmPlexSans = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const SITE = "https://buffetr.vercel.app";
const DESCRIPTION = "Buffett. Cheap, Fine, Hot, Cooked.";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const slug = parseSlug(h.get("x-buffetr-m"));
  const image = `/og?m=${slug}`;

  return {
    metadataBase: new URL(SITE),
    title: "Buffetr",
    description: DESCRIPTION,
    keywords: [
      "Buffetr",
      "Buffett",
      "BTC",
      "Houses",
      "Debt",
      "Gold",
      "Fear",
      "Yield",
      "Rates",
      "Cheap",
      "Fine",
      "Hot",
      "Cooked",
    ],
    authors: [{ name: "Buffetr" }],
    openGraph: {
      title: "Buffetr",
      description: DESCRIPTION,
      type: "website",
      url: slug === "buffett" ? SITE : `${SITE}/?m=${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: "Buffetr" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Buffetr",
      description: DESCRIPTION,
      images: [image],
    },
  };
}

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
