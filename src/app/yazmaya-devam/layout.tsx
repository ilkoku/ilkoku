import { WriterEditingTools } from "@/features/writer/components/WriterEditingTools";
import "@/features/writer/writer-paper-experience.css";
import "@/features/writer/writer-brand-purple.css";
import "@/styles/light-purple-route-fallback.css";
import "@/features/writer/writer-editor-density.css";
import "@/features/writer/writer-editing-tools.css";

export default function ContinueWritingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <WriterEditingTools />
    </>
  );
}
