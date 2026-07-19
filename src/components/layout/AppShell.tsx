import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserArea } from "@/components/layout/UserArea";
import type { AuthProfile } from "@/features/auth/profile";

type AppShellProps = {
  children: ReactNode;
  profile: AuthProfile;
};

export function AppShell({ children, profile }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
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
