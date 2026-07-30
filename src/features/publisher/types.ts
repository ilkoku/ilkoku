export interface PublisherSummary {
  label: string;
  note: string;
  value: string;
}

export interface PublisherEditorReview {
  editor: string;
  summary: string;
}

export interface PublisherWork {
  author: string;
  chapters: number;
  comments: number;
  completion: number;
  coverVariant: "hero" | "one" | "two" | "three";
  editorReview?: PublisherEditorReview;
  genre: string;
  momentum: string;
  potential: string;
  reads: string;
  slug: string;
  subgenre: string;
  title: string;
  updatedAt: string;
}
