import type { Metadata } from "next";
import { BatchedEducationGuidePage } from "@/components/content/BatchedEducationGuidePage";
import { getEducationGuideDefinition } from "@/lib/stage-guide-batch";
import "../../batched-education-guide.css";

export const dynamic = "force-dynamic";
const definition = getEducationGuideDefinition("radyo-tiyatrosu");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, robots: { index: false, follow: false } };
export default async function RadyoTiyatrosuPage() { return <BatchedEducationGuidePage definition={definition} />; }
