export type StudyCard = {
  id: string;
  front: string;
  back: string;
};

export type SrsRating = 'again' | 'good';

export type SrsState = {
  ease: number;
  intervalDays: number;
  dueAt: number;
  reps: number;
};
