export function EditorPageHeader({
  description,
  eyebrow = "İlkOku Editör Sistemi",
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="editor-page-header">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </header>
  );
}
