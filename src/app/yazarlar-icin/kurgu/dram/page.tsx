import type { Metadata } from "next";
import { BatchedFictionGuidePage } from "@/components/content/BatchedFictionGuidePage";
import { getFictionGuideDefinition } from "@/lib/fiction-guide-batch";
import "../batched-fiction-guide.css";
export const dynamic = "force-dynamic";
const definition = getFictionGuideDefinition("dram");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, robots: { index: false, follow: false } };
export default async function DramPage() { return <BatchedFictionGuidePage definition={definition} />; }
