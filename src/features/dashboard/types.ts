export type BookStatus = "Devam ediyor" | "Taslak" | "Düzenlemede";

export type Book = {
  id: string;
  title: string;
  genre: string;
  status: BookStatus;
  progress: number;
  coverVariant: "one" | "two" | "three";
};

export type Feedback = {
  id: string;
  editor: string;
  initials: string;
  comment: string;
  date: string;
};

export type Metric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};
