import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserArea } from "@/components/layout/UserArea";
import { AdminRoleViewBanner } from "@/components/layout/AdminRoleViewBanner";
import type { AuthProfile } from "@/features/auth/profile";
import { getSidebarBadges } from "@/features/navigation/sidebar-badges";
import {
  getPublisherNavigationPermissions,
} from "@/features/publisher-discovery/access";
import { WriterThemeHydrator } from "@/features/writer-theme/WriterThemeHydrator";
import styles from "@/features/admin-role-view/AdminRoleView.module.css";
import "@/features/writer/writer-role-theme.css";
import "@/features/writer/writer-purple-continuity.css";
import "@/features/writer/writer-landing-lavender-background.css";
import "@/styles/light-surface-unification.css";
import "@/features/writer-theme/writer-theme-customization.css";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile;
};

export async function AppShell({
  children,
  profile,
}: AppShellProps) {
  const badges = profile.adminPublisherView
    ? {}
    : await getSidebarBadges({
        id: profile.id,
        role: profile.role,
      });
  const publisherPermissions =
    await getPublisherNavigationPermissions(
      profile.id,
    );

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
