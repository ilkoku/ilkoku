import type { Metadata } from "next";
import { tr } from "@/content";
import "./globals.css";

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
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
