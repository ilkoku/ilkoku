import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContractManagementNavigation } from "@/features/contracts/ContractManagementNavigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./sozlesme.css";
import "./navigation.css";

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

  return (
    <div className="contract-management-shell">
      <ContractManagementNavigation />
      <div className="contract-management-content">{children}</div>
    </div>
  );
}
