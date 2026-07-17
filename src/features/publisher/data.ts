import { publisherContent } from "@/content";
import type { PublisherSummary, PublisherWork } from "./types";

export const publisherSummaries: PublisherSummary[] = publisherContent.data.summaries.map((summary) => ({ ...summary }));

export const publisherWorks: PublisherWork[] = publisherContent.data.works.map((work) => ({ ...work }));

export const selectedPublisherWork = publisherWorks[0];

export const publisherChapters = publisherContent.data.chapters;
export const readerSignals = publisherContent.data.readerSignals;
