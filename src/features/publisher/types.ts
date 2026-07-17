export interface PublisherWork {
  slug: string;
  title: string;
  author: string;
  genre: string;
  subgenre: string;
  completion: number;
  chapters: number;
  reads: string;
  comments: number;
  updatedAt: string;
  momentum: string;
  potential: string;
  coverVariant: "hero" | "one" | "two" | "three";
  editorReview?: {
    editor: string;
    summary: string;
  };
}

export interface PublisherSummary {
  label: string;
  value: string;
  note: string;
}
