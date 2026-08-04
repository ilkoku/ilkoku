import Link from "next/link";
import {
  adminRoleViewLabels,
  adminRoleViewRoles,
  type AdminRoleViewRole,
} from "@/features/admin-role-view/config";
import { setAdminRoleViewAction } from "@/features/admin-role-view/actions";
import styles from "@/features/admin-role-view/AdminRoleView.module.css";

export function AdminRoleViewControl({
  currentRole,
}: {
  currentRole: AdminRoleViewRole | null;
}) {
  return (
    <section className={`profile-card ${styles.control}`}>
      <div className="profile-card__heading">
        <div>
          <p>Yönetici aracı</p>
          <h2>Admin rol görünümü</h2>
        </div>
      </div>
      <p className={styles.notice}>
        <strong>Gerçek admin rolünüz değişmez.</strong>{" "}
        Seçtiğiniz panel kendi hesabınızla ve salt okunur
        görünür; rol işlemleri ile içerik yazma action’ları
        admin kimliğiniz nedeniyle çalışmaz. Görünüm dört
        saat sonra kendiliğinden sona erer.
      </p>
      <div className={styles.grid}>
        <form action={setAdminRoleViewAction}>
          <input name="role" type="hidden" value="admin" />
          <button
            className={styles.choice}
            data-current={!currentRole || undefined}
            type="submit"
          >
            Admin
          </button>
        </form>
        {adminRoleViewRoles
          .filter((role) => role !== "publisher")
          .map((role) => (
          <form action={setAdminRoleViewAction} key={role}>
            <input name="role" type="hidden" value={role} />
            <button
              className={styles.choice}
              data-current={currentRole === role || undefined}
              type="submit"
            >
              {adminRoleViewLabels[role]}
            </button>
          </form>
        ))}

        <Link
          className={styles.choice}
          href="/admin/yayinevleri"
        >
          Yayınevi
        </Link>
      </div>
    </section>
  );
}
