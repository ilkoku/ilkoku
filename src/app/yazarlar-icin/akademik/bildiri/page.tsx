import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { getEducationGuideDefinition } from "@/lib/academic-guide-batch";
import "../../batched-education-guide.css";

export const revalidate = 300;
const definition = getEducationGuideDefinition("bildiri");
export const metadata: Metadata = createPublicPageMetadata({
  title: `${definition.title} | İlkOku`,
  description: definition.description,
  canonical: "/yazarlar-icin/akademik/bildiri",
});
export default async function EducationGenrePage() { return <BatchedEducationGuidePage definition={definition} />; }
