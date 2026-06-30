import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preconnect } from "react-dom";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Resolve absolute URLs for OG/Twitter from the platform; falls back to localhost in dev.
const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const title = "Teleport";
const description = "A time machine for the web.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
    url: "/",
    images: [{ url: "/og.png", width: 3562, height: 1968, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Warm the TLS connections to the archive so the first snapshot lookup and the first iframe
  // don't pay DNS + handshake cost.
  preconnect("https://web.archive.org");
  preconnect("https://archive.org");

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
