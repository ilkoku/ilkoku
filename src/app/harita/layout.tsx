import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./harita.css";
import "./control-center.css";
import "./operations.css";
import "./runtime-infrastructure.css";
import "./integrity-control.css";
import "./navigation.css";

export const metadata: Metadata = {
  title: "Sistem Haritası | İlkOku",
  description: "İlkOku canlı uygulama mimarisi ve bağlantı çalışma masası",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SystemMapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/harita");
  }

  if (user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_map");
  }

  return <>{children}</>;
}