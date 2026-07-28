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

export interface SubmissionItem {
  coverLetter: string;
  id: string;
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
