import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { tr } from "@/content";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: tr.brand.name,
  description: tr.brand.tagline,
  icons: {
    icon: [
      { url: "/icons/ilkoku-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/ilkoku-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ilkoku-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/ilkoku-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
