import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./sozlesmelerim.css";
import "./response-guard.css";

export const metadata: Metadata = {
  title: "Sözleşme Yönetimi | İlkOku",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export const dynamic = "force-dynamic";

export default async function UserContractsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/sozlesmelerim");
  return <>{children}</>;
}
