import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/academic-guide-batch";
import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";
const definition = getEducationGuideDefinition("bildiri");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, alternates: { canonical: "https://ilkoku.com/yazarlar-icin/akademik/bildiri" }, robots: { index: true, follow: true } };
export default async function EducationGenrePage() { return <BatchedEducationGuidePage definition={definition} />; }
