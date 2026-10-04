import type { Metadata } from "next";
import { BatchedFictionGuidePage } from "@/components/content/BatchedFictionGuidePage";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { getFictionGuideDefinition } from "@/lib/fiction-guide-batch";
import "../batched-fiction-guide.css";

export const revalidate = 300;
const definition = getFictionGuideDefinition("macera");
export const metadata: Metadata = createPublicPageMetadata({
  title: `${definition.title} | İlkOku`,
  description: definition.description,
  canonical: "/yazarlar-icin/kurgu/macera",
});
export default async function FictionGenrePage() { return <BatchedFictionGuidePage definition={definition} />; }
