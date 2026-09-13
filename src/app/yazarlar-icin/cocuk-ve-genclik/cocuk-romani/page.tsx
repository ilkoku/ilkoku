import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/youth-guide-batch";
import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";
const definition = getEducationGuideDefinition("cocuk-romani");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, alternates: { canonical: "https://ilkoku.com/yazarlar-icin/cocuk-ve-genclik/cocuk-romani" }, robots: { index: true, follow: true } };
export default async function EducationGenrePage() { return <BatchedEducationGuidePage definition={definition} />; }
