import { WriterRouteEnhancers } from "@/features/writer/components/WriterRouteEnhancers";
import "@/features/writer/writer-paper-experience.css";
import "@/features/writer/writer-brand-purple.css";
import "@/styles/light-purple-route-fallback.css";
import "@/features/writer/writer-editor-density.css";
import "@/features/writer/writer-editing-tools.css";
import "@/features/writer/writer-text-editing-commands.css";
import "@/features/writer/writer-rich-text-formatting.css";
import "@/features/writer/writer-toolbar-wrap.css";
import "@/features/writer/writer-paged-manuscript.css";
import "@/features/writer/writer-publish-experience.css";
import "@/features/writer/writer-publish-review-contrast.css";
import "@/features/writer/writer-book-structure.css";
import "@/features/writer/writer-sidebar-regressions.css";
import "@/features/writer/writer-book-trash.css";
import "@/features/writer/writer-classification-stats.css";

export default function WriterDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <WriterRouteEnhancers />
    </>
  );
}
