import type { Metadata } from "next";
import { publisherContent } from "@/content";
import { PublisherDashboard } from "@/features/publisher/components/PublisherDashboard";

export const metadata: Metadata = { title: publisherContent.dashboard.metadataTitle, description: publisherContent.dashboard.metadataDescription };
export const dynamic = "force-dynamic";

export default function PublisherPage() { return <PublisherDashboard />; }
