import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const legacyGuideTargets: Record<string, string> = {
  "ilk-eseri-yayinlama-rehberi": "/nasil-calisir#eser-ilkoku-da-nasil-ilerler",
  "eser-tanitim-metni-nasil-yazilir": "/nasil-calisir#yazarin-rolu",
  "okur-geri-bildirimi-rehberi": "/nasil-calisir#okurun-rolu",
  "editor-incelemesi-nasil-calisir": "/nasil-calisir#editorun-rolu",
  "yayinevi-eser-kesfi-rehberi": "/nasil-calisir#yayinevinin-rolu",
  "eser-pasaportu-nedir": "/nasil-calisir#8-eser-pasaportu-gelisim-surecini-gorunur-kilar",
  "ilkoku-nasil-calisir": "/nasil-calisir",
};

export default async function RetiredGuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(legacyGuideTargets[slug] ?? "/nasil-calisir");
}
