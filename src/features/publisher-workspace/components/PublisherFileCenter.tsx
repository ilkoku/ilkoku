import "../publisher-workspace.css";
import { Card } from "@/components/ui/Card";
import type { PublisherFileData } from "../types";

const categoryLabels = {
  author_attachment: "Yazar eki",
  contract: "Sözleşme",
  editor_report: "Editör raporu",
  publication_plan: "Yayın planı belgesi",
  work_file: "Eser dosyası",
} as const;

const formatSize = (value: string) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));

export function PublisherFileCenter({ companyName, files }: { companyName: string; files: PublisherFileData[] }) {
  return <div className="publisher-workspace">
    <header className="publisher-workspace__hero"><div><p>{companyName}</p><h1>Dosya merkezi</h1><span>Yayınevinize ait başvurulardaki erişilebilir dosyalar.</span></div></header>
    {files.length ? <div className="publisher-file-list">{files.map((file) => <Card key={file.id}>
      <div><span>{categoryLabels[file.category]}</span><h2>{file.fileName}</h2><p>{file.workTitle}</p></div>
      <dl><div><dt>Tür</dt><dd>{file.mimeType}</dd></div><div><dt>Boyut</dt><dd>{formatSize(file.sizeBytes)}</dd></div><div><dt>Yükleyen</dt><dd>{file.uploaderName || "Sistem"}</dd></div><div><dt>Tarih</dt><dd>{formatDate(file.createdAt)}</dd></div></dl>
      <a href={`/yayinevi/dosyalar/${file.id}/indir`}>Güvenli indir</a>
    </Card>)}</div> : <Card className="publisher-workspace__empty"><h2>Henüz dosya yok</h2><p>Başvurulara eklenen eser, rapor, sözleşme ve yayın planı belgeleri burada listelenecek.</p></Card>}
  </div>;
}
