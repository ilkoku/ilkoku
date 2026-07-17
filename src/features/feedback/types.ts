import type { FeedbackCategory, FeedbackPriority, FeedbackStatus } from "@/types/database";

export type FeedbackTab = "unread" | "all" | "archived";
export type FeedbackOrder = "newest" | "oldest";

export interface FeedbackItem {
  archivedAt: string | null;
  category: FeedbackCategory;
  chapter: { id: string; slug: string; title: string } | null;
  content: string;
  createdAt: string;
  editorId: string;
  editorName: string;
  id: string;
  priority: FeedbackPriority;
  readAt: string | null;
  status: FeedbackStatus;
  title: string;
  work: { id: string; slug: string; title: string };
}

export interface FeedbackStatsData {
  archived: number;
  important: number;
  total: number;
  unread: number;
}

export interface FeedbackActionState {
  message: string;
  status: "idle" | "success" | "error";
}

export const initialFeedbackActionState: FeedbackActionState = { message: "", status: "idle" };
