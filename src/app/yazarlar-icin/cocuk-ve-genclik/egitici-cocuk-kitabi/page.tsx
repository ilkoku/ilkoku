import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { getEducationGuideDefinition } from "@/lib/youth-guide-batch";
import "../../batched-education-guide.css";

export const revalidate = 300;
const definition = getEducationGuideDefinition("egitici-cocuk-kitabi");
export const metadata: Metadata = createPublicPageMetadata({
  title: `${definition.title} | İlkOku`,
  description: definition.description,
  canonical: "/yazarlar-icin/cocuk-ve-genclik/egitici-cocuk-kitabi",
});
export default async function EducationGenrePage() { return <BatchedEducationGuidePage definition={definition} />; }
