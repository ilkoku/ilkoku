import { CmsGuideEditor } from "@/components/content/CmsGuideEditor";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EditGuidePage({ params }: PageProps) {
  const { id } = await params;
  return <CmsGuideEditor id={id} />;
}
