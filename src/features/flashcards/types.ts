export type StudyCard = {
  id: string;
  front: string;
  back: string;
  pronunciationAudioReference?: string | null;
  imageUrl?: string | null;
};

export type SrsRating = 'again' | 'good';
