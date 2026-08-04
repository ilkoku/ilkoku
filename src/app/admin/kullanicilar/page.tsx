import {
  UserManagement,
  type UserFilters,
} from "@/components/admin/UserManagement";

type PageProps = {
  searchParams: Promise<UserFilters>;
};

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams;

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Kullanıcı merkezi
          </span>
          <h1>Bütün Kullanıcılar</h1>
          <p>
            İlkOku kimliği, rolü, hesap durumu ve son
            hareketiyle bütün üyeleri tek listede yönetin.
          </p>
        </div>
      </header>

      <UserManagement
        basePath="/admin/kullanicilar"
        filters={filters}
      />
    </div>
  );
}
