import type { CommentStatus, Database } from "@/types/database";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
export type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"];

export interface CommentSummary {
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  status: CommentStatus;
  userId: string;
}
