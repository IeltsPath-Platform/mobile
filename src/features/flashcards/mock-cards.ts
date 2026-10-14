import type { StudyCard } from './types';

export const MOCK_CARDS: Record<string, StudyCard[]> = {
  'mock-deck-academic': [
    { id: 'c-achieve', front: 'achieve', back: 'đạt được, hoàn thành' },
    { id: 'c-coherent', front: 'coherent', back: 'mạch lạc, nhất quán' },
    { id: 'c-significant', front: 'significant', back: 'đáng kể' },
    { id: 'c-decline', front: 'decline', back: 'suy giảm' },
    { id: 'c-benefit', front: 'benefit', back: 'lợi ích' },
    { id: 'c-approach', front: 'approach', back: 'cách tiếp cận' },
    { id: 'c-evidence', front: 'evidence', back: 'bằng chứng' },
    { id: 'c-assume', front: 'assume', back: 'cho rằng, giả định' },
  ],
  'mock-deck-tfng': [
    { id: 'c-ng', front: 'NOT GIVEN', back: 'Bài không nói thông tin này — đừng suy từ kiến thức ngoài.' },
    { id: 'c-false', front: 'FALSE', back: 'Bài nói ngược lại với câu hỏi.' },
    { id: 'c-true', front: 'TRUE', back: 'Bài đồng ý với câu hỏi, có thể diễn đạt khác từ.' },
    { id: 'c-qualify', front: 'some / many / often', back: 'Từ hạn định — đừng biến thành “tất cả”.' },
    { id: 'c-paraphrase', front: 'paraphrase', back: 'Cùng ý, khác chữ. TRUE vẫn có thể đúng.' },
    { id: 'c-contrast', front: 'however / although', back: 'Từ nối đối lập — ý sau có thể phủ định ý trước.' },
  ],
};

export function mockCardsFor(deckId: string): StudyCard[] {
  return MOCK_CARDS[deckId] ?? MOCK_CARDS['mock-deck-academic'];
}
