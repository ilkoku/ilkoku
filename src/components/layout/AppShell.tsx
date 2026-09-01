import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserArea } from "@/components/layout/UserArea";
import { AdminRoleViewBanner } from "@/components/layout/AdminRoleViewBanner";
import type { AuthProfile } from "@/features/auth/profile";
import { getRoleNavigation } from "@/features/auth/destination";
import { getSidebarBadges } from "@/features/navigation/sidebar-badges";
import {
  getPublisherNavigationPermissions,
} from "@/features/publisher-discovery/access";
import { WriterThemeHydrator } from "@/features/writer-theme/WriterThemeHydrator";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import styles from "@/features/admin-role-view/AdminRoleView.module.css";
import "@/features/writer-theme/writer-theme-customization.css";
import "@/features/writer/writer-dashboard-hero-border.css";
import "@/features/reader/reader-role-gold-frame.css";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile;
};

export async function AppShell({
  children,
  profile,
}: AppShellProps) {
  if (profile.role !== "admin") {
    const adultAccess = await getAdultContentAccess(profile.id);
    if (adultAccess.needsBirthDate) {
      const navigation = await getRoleNavigation(profile);
      redirect(
        `/yas-dogrulama?sonraki=${encodeURIComponent(navigation.workspaceHref)}`,
      );
    }
  }

  const shouldLoadPublisherPermissions =
    profile.role === "publisher" ||
    Boolean(profile.adminPublisherView);

  const [badges, publisherPermissions] =
    await Promise.all([
      profile.adminPublisherView
        ? Promise.resolve({})
        : getSidebarBadges({
            id: profile.id,
            role: profile.role,
          }),
      shouldLoadPublisherPermissions
        ? getPublisherNavigationPermissions(
            profile.id,
          )
        : Promise.resolve([]),
    ]);

  return (
    <div className="app-shell" data-role={profile.role}>
      {profile.role === "writer" ? (
        <WriterThemeHydrator userId={profile.id} />
      ) : null}

      <Sidebar
        adminPublisherView={profile.adminPublisherView}
        badges={badges}
        publisherPermissions={
          publisherPermissions
        }
        role={profile.role}
      />

      <main className="main-area">
        {profile.adminRoleView ? (
          <AdminRoleViewBanner
            publisherView={profile.adminPublisherView}
            role={profile.adminRoleView}
          />
        ) : null}

        <header className="dashboard-header">
          <Breadcrumb />
          <UserArea profile={profile} />
        </header>

        <div
          className={[
            "main-area__content",
            profile.adminPublisherView
              ? styles.previewContent
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-admin-publisher-readonly={
            profile.adminPublisherView
              ? "true"
              : undefined
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
