import type { Metadata } from "next";
import { publisherContent } from "@/content";

export const dynamic = "force-dynamic";
import { PublisherWorkDetail } from "@/features/publisher/components/PublisherWorkDetail";

export const metadata: Metadata = { title: publisherContent.detail.metadataTitle, description: publisherContent.detail.metadataDescription };

export default function PublisherWorkPage() { return <PublisherWorkDetail />; }
