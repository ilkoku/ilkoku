import type { Metadata } from "next";
import { BatchedFictionGuidePage } from "@/components/content/BatchedFictionGuidePage";
import { getFictionGuideDefinition } from "@/lib/fiction-guide-batch";
import "../batched-fiction-guide.css";
export const revalidate = 300;
const definition = getFictionGuideDefinition("mitoloji");
export const metadata: Metadata = { title: `${definition.title} | İlkOku`, description: definition.description, alternates: { canonical: "https://ilkoku.com/yazarlar-icin/kurgu/mitoloji" }, robots: { index: true, follow: true } };
export default async function FictionGenrePage() { return <BatchedFictionGuidePage definition={definition} />; }
