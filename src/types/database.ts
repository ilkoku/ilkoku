export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "reader" | "writer" | "editor" | "publisher";

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          avatar_url: string | null; full_name: string; id: string; requested_role: UserRole | null;
          role: UserRole; role_approved_at: string | null; role_approved_by: string | null; updated_at: string;
        },
        {
          avatar_url?: string | null; full_name?: string; id: string; requested_role?: UserRole | null;
          role?: UserRole; role_approved_at?: string | null; role_approved_by?: string | null; updated_at?: string;
        },
        {
          avatar_url?: string | null; full_name?: string; id?: string; requested_role?: UserRole | null;
          role?: UserRole; role_approved_at?: string | null; role_approved_by?: string | null; updated_at?: string;
        }
      >;
      works: TableDefinition<
        {
          author_id: string;
          completed_at: string | null;
          cover_url: string | null;
          created_at: string;
          genre: string;
          id: string;
          is_public: boolean;
          is_publisher_visible: boolean;
          language: string;
          published_at: string | null;
          slug: string;
          status: WorkStatus;
          summary: string | null;
          title: string;
          updated_at: string;
          work_type: WorkType;
        },
        {
          author_id: string;
          completed_at?: string | null;
          cover_url?: string | null;
          created_at?: string;
          genre: string;
          id?: string;
          is_public?: boolean;
          is_publisher_visible?: boolean;
          language?: string;
          published_at?: string | null;
          slug: string;
          status?: WorkStatus;
          summary?: string | null;
          title: string;
          updated_at?: string;
          work_type: WorkType;
        },
        {
          author_id?: string; completed_at?: string | null; cover_url?: string | null; created_at?: string;
          genre?: string; id?: string; is_public?: boolean; is_publisher_visible?: boolean; language?: string;
          published_at?: string | null; slug?: string; status?: WorkStatus; summary?: string | null;
          title?: string; updated_at?: string; work_type?: WorkType;
        }
      >;
      chapters: TableDefinition<
        {
          author_id: string;
          content: string;
          created_at: string;
          id: string;
          position: number;
          published_at: string | null;
          slug: string;
          status: ChapterStatus;
          title: string;
          updated_at: string;
          word_count: number;
          work_id: string;
        },
        {
          author_id: string;
          content?: string;
          created_at?: string;
          id?: string;
          position: number;
          published_at?: string | null;
          slug: string;
          status?: ChapterStatus;
          title: string;
          updated_at?: string;
          word_count?: number;
          work_id: string;
        },
        {
          author_id?: string; content?: string; created_at?: string; id?: string; position?: number;
          published_at?: string | null; slug?: string; status?: ChapterStatus; title?: string;
          updated_at?: string; word_count?: number; work_id?: string;
        }
      >;
      comments: TableDefinition<
        {
          chapter_id: string;
          content: string;
          created_at: string;
          id: string;
          is_spoiler: boolean;
          status: CommentStatus;
          updated_at: string;
          user_id: string;
        },
        {
          chapter_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_spoiler?: boolean;
          status?: CommentStatus;
          updated_at?: string;
          user_id: string;
        },
        {
          chapter_id?: string; content?: string; created_at?: string; id?: string; is_spoiler?: boolean;
          status?: CommentStatus; updated_at?: string; user_id?: string;
        }
      >;
      editor_requests: TableDefinition<
        {
          author_id: string;
          created_at: string;
          editor_id: string;
          expectation_note: string | null;
          id: string;
          preferred_delivery: PreferredDelivery;
          request_type: EditorRequestType;
          status: EditorRequestStatus;
          updated_at: string;
          work_id: string;
        },
        {
          author_id: string;
          created_at?: string;
          editor_id: string;
          expectation_note?: string | null;
          id?: string;
          preferred_delivery: PreferredDelivery;
          request_type: EditorRequestType;
          status?: EditorRequestStatus;
          updated_at?: string;
          work_id: string;
        },
        {
          author_id?: string; created_at?: string; editor_id?: string; expectation_note?: string | null;
          id?: string; preferred_delivery?: PreferredDelivery; request_type?: EditorRequestType;
          status?: EditorRequestStatus; updated_at?: string; work_id?: string;
        }
      >;
      editor_reviews: TableDefinition<
        {
          created_at: string;
          delivered_at: string | null;
          development_points: string;
          editor_id: string;
          id: string;
          request_id: string;
          status: EditorReviewStatus;
          strengths: string;
          summary: string;
          updated_at: string;
          work_id: string;
        },
        {
          created_at?: string;
          delivered_at?: string | null;
          development_points: string;
          editor_id: string;
          id?: string;
          request_id: string;
          status?: EditorReviewStatus;
          strengths: string;
          summary: string;
          updated_at?: string;
          work_id: string;
        },
        {
          created_at?: string; delivered_at?: string | null; development_points?: string; editor_id?: string;
          id?: string; request_id?: string; status?: EditorReviewStatus; strengths?: string; summary?: string;
          updated_at?: string; work_id?: string;
        }
      >;
      editor_review_publisher_access: TableDefinition<
        { author_id: string; granted_at: string; review_id: string },
        { author_id: string; granted_at?: string; review_id: string },
        { author_id?: string; granted_at?: string; review_id?: string }
      >;
      publishers: TableDefinition<
        {
          accepts_submissions: boolean; active: boolean; archived_at: string | null; company_name: string;
          contact_email: string | null; created_at: string; description: string | null; id: string;
          logo_url: string | null; profile_id: string; slug: string; updated_at: string;
          verified: boolean; website_url: string | null;
        },
        {
          accepts_submissions?: boolean; active?: boolean; archived_at?: string | null; company_name: string;
          contact_email?: string | null; created_at?: string; description?: string | null; id?: string;
          logo_url?: string | null; profile_id: string; slug: string; updated_at?: string;
          verified?: boolean; website_url?: string | null;
        },
        {
          accepts_submissions?: boolean; active?: boolean; archived_at?: string | null; company_name?: string;
          contact_email?: string | null; created_at?: string; description?: string | null; id?: string;
          logo_url?: string | null; profile_id?: string; slug?: string; updated_at?: string;
          verified?: boolean; website_url?: string | null;
        }
      >;
      publisher_submissions: TableDefinition<
        {
          archived_at: string | null; author_id: string; cover_letter: string; id: string;
          publisher_id: string; publisher_note: string | null; reviewed_at: string | null;
          status: PublisherSubmissionStatus; submitted_at: string; updated_at: string;
          withdrawn_at: string | null; work_id: string;
        },
        {
          archived_at?: string | null; author_id: string; cover_letter: string; id?: string;
          publisher_id: string; publisher_note?: string | null; reviewed_at?: string | null;
          status?: PublisherSubmissionStatus; submitted_at?: string; updated_at?: string;
          withdrawn_at?: string | null; work_id: string;
        },
        {
          archived_at?: string | null; author_id?: string; cover_letter?: string; id?: string;
          publisher_id?: string; publisher_note?: string | null; reviewed_at?: string | null;
          status?: PublisherSubmissionStatus; submitted_at?: string; updated_at?: string;
          withdrawn_at?: string | null; work_id?: string;
        }
      >;
      publisher_requests: TableDefinition<
        {
          author_id: string;
          created_at: string;
          id: string;
          meeting_preference: MeetingPreference;
          message: string;
          publisher_user_id: string;
          request_type: PublisherRequestType;
          requested_material: string | null;
          status: PublisherRequestStatus;
          updated_at: string;
          work_id: string;
        },
        {
          author_id: string;
          created_at?: string;
          id?: string;
          meeting_preference: MeetingPreference;
          message: string;
          publisher_user_id: string;
          request_type: PublisherRequestType;
          requested_material?: string | null;
          status?: PublisherRequestStatus;
          updated_at?: string;
          work_id: string;
        },
        {
          author_id?: string; created_at?: string; id?: string; meeting_preference?: MeetingPreference;
          message?: string; publisher_user_id?: string; request_type?: PublisherRequestType;
          requested_material?: string | null; status?: PublisherRequestStatus; updated_at?: string; work_id?: string;
        }
      >;
      editor_feedback: TableDefinition<
        {
          archived_at: string | null;
          author_id: string;
          category: FeedbackCategory;
          chapter_id: string | null;
          content: string;
          created_at: string;
          editor_id: string;
          id: string;
          priority: FeedbackPriority;
          read_at: string | null;
          status: FeedbackStatus;
          title: string;
          updated_at: string;
          work_id: string;
        },
        {
          archived_at?: string | null; author_id: string; category: FeedbackCategory;
          chapter_id?: string | null; content: string; created_at?: string; editor_id: string;
          id?: string; priority?: FeedbackPriority; read_at?: string | null; status?: FeedbackStatus;
          title: string; updated_at?: string; work_id: string;
        },
        {
          archived_at?: string | null; author_id?: string; category?: FeedbackCategory;
          chapter_id?: string | null; content?: string; created_at?: string; editor_id?: string;
          id?: string; priority?: FeedbackPriority; read_at?: string | null; status?: FeedbackStatus;
          title?: string; updated_at?: string; work_id?: string;
        }
      >;
      notifications: TableDefinition<
        {
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          related_entity_id: string | null;
          related_entity_type: RelatedEntityType | null;
          title: string;
          type: NotificationType;
          user_id: string;
        },
        {
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: RelatedEntityType | null;
          title: string;
          type: NotificationType;
          user_id: string;
        },
        {
          created_at?: string; id?: string; message?: string; read_at?: string | null;
          related_entity_id?: string | null; related_entity_type?: RelatedEntityType | null;
          title?: string; type?: NotificationType; user_id?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      approve_profile_role: { Args: { approved_role: UserRole; target_user: string }; Returns: undefined };
      current_profile_role: { Args: Record<PropertyKey, never>; Returns: UserRole };
      request_privileged_role: { Args: { requested: UserRole }; Returns: undefined };
      set_standard_role: { Args: { selected_role: UserRole }; Returns: undefined };
      create_publisher_submission: {
        Args: { submission_cover_letter: string; target_publisher: string; target_work: string };
        Returns: string;
      };
      withdraw_publisher_submission: { Args: { target_submission: string }; Returns: undefined };
      update_publisher_submission_status: {
        Args: { next_status: string; note?: string | null; target_submission: string };
        Returns: undefined;
      };
      create_editor_feedback: {
        Args: {
          feedback_category: string;
          feedback_content: string;
          feedback_priority: string;
          feedback_title: string;
          target_chapter: string | null;
          target_work: string;
        };
        Returns: string;
      };
      get_feedback_editor_names: { Args: { editor_ids: string[] }; Returns: { full_name: string; id: string }[] };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
}

export type WorkType = "novel" | "story" | "poetry" | "essay" | "memoir" | "other";
export type WorkStatus = "draft" | "in_progress" | "completed" | "published" | "archived";
export type ChapterStatus = "draft" | "published" | "archived";
export type CommentStatus = "visible" | "reported" | "hidden";
export type EditorRequestType = "general" | "developmental" | "line" | "sensitivity";
export type PreferredDelivery = "one_week" | "two_weeks" | "one_month" | "flexible";
export type EditorRequestStatus = "pending" | "accepted" | "in_review" | "completed" | "declined" | "cancelled";
export type EditorReviewStatus = "draft" | "delivered" | "withdrawn";
export type PublisherRequestType = "contact" | "manuscript" | "meeting" | "rights";
export type MeetingPreference = "email" | "video" | "phone" | "in_person" | "flexible";
export type PublisherRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";
export type NotificationType = "system" | "comment" | "editor_request" | "editor_review" | "publisher_request" | "work";
export type RelatedEntityType = "work" | "chapter" | "comment" | "editor_request" | "editor_review" | "publisher_request";
export type FeedbackCategory = "genel" | "kurgu" | "karakter" | "anlatım" | "dil" | "yapı" | "yayın_hazırlığı";
export type FeedbackStatus = "unread" | "read" | "archived";
export type FeedbackPriority = "normal" | "important";

export type PublisherSubmissionStatus = "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
