import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./admin.css";
import "./dashboard.css";
import "./directory.css";
import "./email.css";
import "./email-operations.css";
import "./management.css";
import "./roles.css";
import "./users.css";
import "./yazarlar/writers.css";

export const metadata: Metadata = {
  title: "İlkOku Yönetim Merkezi",
  description: "İlkOku platform yönetim paneli",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/admin");
  }

  if (user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=admin");
  }

  return (
    <AdminShell
      user={{
        email: user.email,
        fullName: user.displayName || user.fullName,
      }}
    >
      {children}
    </AdminShell>
  );
}
