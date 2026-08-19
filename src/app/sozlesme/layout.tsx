import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./sozlesme.css";

export const metadata: Metadata = {
  title: "Sözleşme Yönetimi | İlkOku",
  description: "İlkOku merkezi sözleşme yönetim çalışma masası",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ContractManagementLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/sozlesme");
  }

  if (user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=contract_management");
  }

  return <>{children}</>;
}
