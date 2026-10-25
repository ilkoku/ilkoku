import type { Metadata } from "next";
import { ContentShell } from "@/components/content/ContentShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireCmsManager } from "@/lib/cms-access";
import "../admin/admin.css";
import "./content.css";
import "./dashboard.css";
import "./revision.css";
import "./preview.css";
import "./shell-polish.css";
import "./editor-workbench.css";
import "./surface-finalization.css";
import "./resume-work.css";
import "./shell-search.css";
import "./cms-ia.css";
import "./media-professional.css";

export const metadata: Metadata = {
  title: "İlkOku İçerik Yönetimi",
  description: "İlkOku site içerik yönetim merkezi",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function ContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await requireCmsManager("/icerik");
  const user = access.user!;

  if (access.isAdmin) {
    return (
      <AdminShell embeddedWorkspace user={{ email: user.email, fullName: user.displayName || user.fullName }}>
        <ContentShell embedded isAdmin user={{ email: user.email, fullName: user.displayName || user.fullName }}>
          {children}
        </ContentShell>
      </AdminShell>
    );
  }

  return (
    <ContentShell
      isAdmin={access.isAdmin}
      user={{
        email: user.email,
        fullName: user.displayName || user.fullName,
      }}
    >
      {children}
    </ContentShell>
  );
}
