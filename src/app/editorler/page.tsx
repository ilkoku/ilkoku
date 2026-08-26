import type { Metadata } from "next";
import { EditorDirectory } from "@/features/editors/components/EditorDirectory";

const title = "Editörleri Keşfet | İlkOku";
const description = "İlkOku'da doğrulanmış editör profillerini, uzmanlıklarını ve editoryal yaklaşımı keşfedin; editör modelini ve değerlendirme standartlarını inceleyin.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/editorler",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/editorler",
    title,
    description,
  },
};
export const dynamic = "force-dynamic";

export default function EditorsPage() {
  return <EditorDirectory />;
}
