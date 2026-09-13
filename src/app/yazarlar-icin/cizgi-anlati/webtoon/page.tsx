import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/graphic-narrative-guide-batch";
import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";
const definition = getEducationGuideDefinition("webtoon");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, robots: { index: false, follow: false } };
export default async function WebtoonPage() { return <BatchedEducationGuidePage definition={definition} />; }
