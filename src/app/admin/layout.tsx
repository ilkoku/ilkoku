import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "İlkOku Yönetim Merkezi",
  description: "İlkOku platform yönetim paneli",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
