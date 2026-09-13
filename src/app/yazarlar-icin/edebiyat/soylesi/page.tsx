import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/education-guide-batch";
import "../../batched-education-guide.css";
export const dynamic = "force-dynamic";
const definition = getEducationGuideDefinition("soylesi");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, robots: { index: false, follow: false } };
export default async function SoylesiPage() { return <BatchedEducationGuidePage definition={definition} />; }
