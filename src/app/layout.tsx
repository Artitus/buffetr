import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { headers } from "next/headers";
import { parseSlug } from "@/lib/verdict";
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
