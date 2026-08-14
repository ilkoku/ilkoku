import { CmsPageEditor } from "@/components/content/CmsPageEditor";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EditCmsPage({ params }: PageProps) {
  const { id } = await params;
  return <CmsPageEditor id={id} />;
}
