import Link from "next/link";
import { setAdminRoleViewAction } from "@/features/admin-role-view/actions";
import {
  adminPublisherViewRoleLabels,
  adminRoleViewLabels,
  type AdminRoleViewRole,
} from "@/features/admin-role-view/config";
import type {
  AdminPublisherViewContext,
} from "@/features/auth/profile";
import styles from "@/features/admin-role-view/AdminRoleView.module.css";

export function AdminRoleViewBanner({
  publisherView,
  role,
}: {
  publisherView: AdminPublisherViewContext | null;
  role: AdminRoleViewRole;
}) {
  const returnHref = publisherView
    ? `/admin/yayinevleri/${publisherView.publisherId}`
    : "/hesabim";

  return (
    <aside className={styles.banner} role="status">
      <div>
        <strong>
          {publisherView
            ? "Admin salt okunur yayınevi görünümü"
            : `Admin görünümü: ${adminRoleViewLabels[role]}`}
        </strong>
        <span>
          {publisherView
            ? `Ekip rolü: ${
                adminPublisherViewRoleLabels[
                  publisherView.role
                ]
              } · gerçek rolünüz admin`
            : "Salt okunur arayüz önizlemesi · gerçek rolünüz admin"}
        </span>
      </div>

      <div className={styles.bannerActions}>
        <Link href={returnHref}>
          {publisherView
            ? "Yayınevi admin detayına dön"
            : "Görünümü değiştir"}
        </Link>

        <form action={setAdminRoleViewAction}>
          <input name="role" type="hidden" value="admin" />
          <button type="submit">Admin panele dön</button>
        </form>
      </div>
    </aside>
  );
}
