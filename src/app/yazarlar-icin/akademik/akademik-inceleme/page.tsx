import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { getEducationGuideDefinition } from "@/lib/academic-guide-batch";
import "../../batched-education-guide.css";

export const revalidate = 300;
const definition = getEducationGuideDefinition("akademik-inceleme");
export const metadata: Metadata = createPublicPageMetadata({
  title: `${definition.title} | İlkOku`,
  description: "Akademik incelemede araştırma sorusu, arama stratejisi, kaynak değerlendirme, sentez, yanlılık ve şeffaf raporlama adımlarını öğrenin.",
  canonical: "/yazarlar-icin/akademik/akademik-inceleme",
});
export default async function EducationGenrePage() { return <BatchedEducationGuidePage definition={definition} />; }
