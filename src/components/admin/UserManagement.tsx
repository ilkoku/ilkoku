import { prisma } from "@/lib/prisma";
import { updateUserRoleAction, updateUserStatusAction } from "@/features/admin/actions";

const roleLabels = {
  reader: "Okur",
  writer: "Yazar",
  editor: "Editör",
  publisher: "Yayınevi",
  admin: "Admin",
} as const;

const statusLabels = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Devre dışı",
} as const;

export async function UserManagement() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
    take: 100,
  });

  return (
    <section className="admin-panel admin-users-panel">
      <div className="admin-panel__heading">
        <div>
          <span>Kullanıcı yönetimi</span>
          <h2>Üyeler ve roller</h2>
        </div>
        <b>{users.length} kullanıcı</b>
      </div>

      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Kayıt tarihi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </td>
                <td>
                  <form action={updateUserRoleAction} className="admin-user-control">
                    <input name="userId" type="hidden" value={user.id} />
                    <select aria-label={`${user.email} rolü`} defaultValue={user.role} name="role">
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button type="submit">Kaydet</button>
                  </form>
                </td>
                <td>
                  <form action={updateUserStatusAction} className="admin-user-control">
                    <input name="userId" type="hidden" value={user.id} />
                    <select aria-label={`${user.email} durumu`} defaultValue={user.status} name="status">
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button type="submit">Kaydet</button>
                  </form>
                </td>
                <td><time>{new Intl.DateTimeFormat("tr-TR").format(user.createdAt)}</time></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
