export type Availability = "Yeni talep alıyor" | "Sınırlı uygunluk" | "Yakında uygun";

export interface EditorReview {
  id: string;
  author: string;
  work: string;
  comment: string;
}

export interface HumanEditor {
  id: string;
  slug: string;
  name: string;
  initials: string;
  title: string;
  experienceYears: number;
  specialties: readonly string[];
  genres: readonly string[];
  completedReviews: number;
  satisfaction: number;
  availability: Availability;
  biography: string;
  approach: string;
  sampleTopics: readonly string[];
  authorReviews: readonly EditorReview[];
}
