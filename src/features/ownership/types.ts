import type { StoredWorkContentRating } from "@/lib/work-content-classification";

export type OwnershipPassportScope =
  | {
      kind: "admin";
    }
  | {
      kind: "author";
      userId: string;
    }
  | {
      kind: "editor";
      userId: string;
    }
  | {
      kind: "publisher";
      submissionId: string;
      userId: string;
    }
  | {
      kind: "publisher_discovery";
      publisherId: string;
      userId: string;
    };

export type OwnershipPassportData = {
  auditTrail: Array<{
    action: string;
    createdAt: Date;
    id: string;
  }>;
  editors: Array<{
    assignedAt: Date | null;
    completedAt: Date | null;
    editorName: string;
    editorPublicId: string;
    id: string;
    stage: string;
    status: string;
  }>;
  integrity: {
    currentHash: string;
    firstHash: string | null;
    initialHashMatches: boolean | null;
    lastStoredHash: string | null;
  };
  metrics: {
    chapterCount: number;
    commentCount: number;
    favoriteCount: number;
    publisherSubmissionCount: number;
    readerCount: number;
    totalWords: number;
    versionCount: number;
  };
  proof: {
    contentHash: string;
    isLegacy: boolean;
    recordedAt: Date;
    stampCode: string;
    status: string;
    version: number;
  } | null;
  publishers: Array<{
    id: string;
    publisherName: string;
    status: string;
    submittedAt: Date;
    updatedAt: Date;
  }>;
  versions: Array<{
    contentHash: string;
    createdAt: Date;
    id: string;
    scope: "chapter" | "work";
    title: string | null;
    versionNumber: number;
  }>;
  work: {
    authorName: string;
    authorPublicId: string;
    contentRating: StoredWorkContentRating;
    createdAt: Date;
    editorReviewStatus: string;
    genre: string | null;
    id: string;
    language: string;
    publicId: string;
    publishedAt: Date | null;
    status: string;
    title: string;
    updatedAt: Date;
    visibility: string;
  };
};
