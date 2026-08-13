import { CmsDocumentEditor } from "@/components/content/CmsDocumentEditor";

type PageProps = { params: Promise<{ slug: string }> };

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <CmsDocumentEditor slug={slug} />;
}
