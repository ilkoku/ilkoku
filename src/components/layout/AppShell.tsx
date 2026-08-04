import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserArea } from "@/components/layout/UserArea";
import type { AuthProfile } from "@/features/auth/profile";
import { getSidebarBadges } from "@/features/navigation/sidebar-badges";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile;
};

export async function AppShell({ children, profile }: AppShellProps) {
  const badges =
    await getSidebarBadges({
      id: profile.id,
      role: profile.role,
    });

  return (
    <div className="app-shell">
      <Sidebar
        badges={badges}
        role={profile.role}
      />
      <main className="main-area">
        <header className="dashboard-header">
          <Breadcrumb />
          <UserArea profile={profile} />
        </header>
        <div className="main-area__content">{children}</div>
      </main>
    </div>
  );
}
