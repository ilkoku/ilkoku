import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { UserManagement } from "@/components/admin/UserManagement";

type AdminPageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const filters = await searchParams;

  return (
    <>
      <AdminDashboard />
      <UserManagement filters={filters} />
    </>
  );
}
