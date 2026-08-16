export type PublisherSubmissionStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface PublisherItem {
  acceptsSubmissions: boolean;
  companyName: string;
  description: string | null;
  id: string;
  logoUrl: string | null;
  slug: string;
  verified: boolean;
  websiteUrl: string | null;
}

export interface SubmissionContractSummary {
  advanceAmount: string | null;
  notes: string | null;
  rightsPeriodMonths: number;
  royaltyPercentage: string;
  sentAt: string | null;
  status: "sent" | "accepted" | "rejected";
  territory: string;
  version: number;
}

export interface SubmissionPublicationPlanSummary {
  coverStatus: "not_started" | "in_progress" | "completed";
  isbn: string | null;
  layoutStatus: "not_started" | "in_progress" | "completed";
  notes: string | null;
  printRun: number | null;
  status: "planning" | "preproduction" | "production" | "distribution" | "published";
  targetPublicationDate: string | null;
}

export interface SubmissionItem {
  contract: SubmissionContractSummary | null;
  coverLetter: string;
  id: string;
  publicationPlan: SubmissionPublicationPlanSummary | null;
  publisher: Pick<PublisherItem, "companyName" | "id" | "logoUrl">;
  publisherNote: string | null;
  status: PublisherSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  work: { id: string; title: string };
}

export interface SubmissionWork { id: string; status: string; title: string }
export interface PublisherDashboardData { accepted: number; items: SubmissionItem[]; pending: number; reviewing: number }
export interface PublisherActionState { message: string; status: "idle" | "error" | "success" }
export type PublisherFilter = "all" | "available" | "applied";
