import type { SessionQuestion, SessionSource } from './types';

const excerpt =
  'Green roofs soak up rain and release it slowly. Critics say they are expensive, and some older buildings are not strong enough.';

export const MOCK_SESSION_QUESTIONS: SessionQuestion[] = [
  {
    id: 'sq-choice-1',
    stem: 'Which sentence states the main idea of the rainwater paragraph?',
    passageExcerpt: excerpt,
    options: [
      { optionKey: 'A', content: 'Green roofs are always cheap to install.', sortOrder: 1 },
      { optionKey: 'B', content: 'Green roofs soak up rain and release it slowly.', sortOrder: 2 },
      { optionKey: 'C', content: 'Older buildings never need extra support.', sortOrder: 3 },
    ],
  },
  {
    id: 'sq-choice-2',
    stem: 'The word "critics" refers to people who…',
    passageExcerpt: excerpt,
    options: [
      { optionKey: 'A', content: 'build green roofs for a living.', sortOrder: 1 },
      { optionKey: 'B', content: 'doubt that green roofs are a good idea.', sortOrder: 2 },
      { optionKey: 'C', content: 'measure rainfall every day.', sortOrder: 3 },
    ],
  },
  {
    id: 'sq-tfng-1',
    stem: 'Green roofs release rainwater slowly.',
    passageExcerpt: excerpt,
    options: [
      { optionKey: 'TRUE', content: 'TRUE', sortOrder: 1 },
      { optionKey: 'FALSE', content: 'FALSE', sortOrder: 2 },
      { optionKey: 'NOT GIVEN', content: 'NOT GIVEN', sortOrder: 3 },
    ],
  },
  {
    id: 'sq-tfng-2',
    stem: 'Every city now requires green roofs on new flats.',
    passageExcerpt: excerpt,
    options: [
      { optionKey: 'TRUE', content: 'TRUE', sortOrder: 1 },
      { optionKey: 'FALSE', content: 'FALSE', sortOrder: 2 },
      { optionKey: 'NOT GIVEN', content: 'NOT GIVEN', sortOrder: 3 },
    ],
  },
  {
    id: 'sq-fill-1',
    stem: 'People who doubt green roofs are called ______.',
    passageExcerpt: excerpt,
    options: null,
    wordBank: ['critics', 'soil', 'roofs', 'cities'],
  },
  {
    id: 'sq-fill-2',
    stem: 'The soil soaks up much of a heavy ______.',
    options: null,
    wordBank: ['shower', 'ticket', 'essay', 'map'],
  },
  {
    id: 'sq-choice-3',
    stem: 'A topic sentence usually…',
    options: [
      { optionKey: 'A', content: 'gives one tiny example only.', sortOrder: 1 },
      { optionKey: 'B', content: 'states the main point of the paragraph.', sortOrder: 2 },
      { optionKey: 'C', content: 'repeats the title word for word.', sortOrder: 3 },
    ],
  },
  {
    id: 'sq-tfng-3',
    stem: 'The passage says green roofs are expensive.',
    passageExcerpt: excerpt,
    options: [
      { optionKey: 'TRUE', content: 'TRUE', sortOrder: 1 },
      { optionKey: 'FALSE', content: 'FALSE', sortOrder: 2 },
      { optionKey: 'NOT GIVEN', content: 'NOT GIVEN', sortOrder: 3 },
    ],
  },
];

export const MOCK_SESSION_KEY: Record<string, { correct: string; explanation: string }> = {
  'sq-choice-1': {
    correct: 'B',
    explanation: 'Câu B nêu đúng việc mái xanh giữ và nhả nước mưa.',
  },
  'sq-choice-2': {
    correct: 'B',
    explanation: 'Critics là người phản đối hoặc nghi ngờ.',
  },
  'sq-tfng-1': {
    correct: 'TRUE',
    explanation: 'Đoạn nói mái xanh nhả nước từ từ.',
  },
  'sq-tfng-2': {
    correct: 'NOT GIVEN',
    explanation: 'Đoạn không nói mọi thành phố đều bắt buộc.',
  },
  'sq-fill-1': {
    correct: 'critics',
    explanation: 'Critics là nhóm người nghi ngờ mái xanh.',
  },
  'sq-fill-2': {
    correct: 'shower',
    explanation: '“a heavy shower” = một trận mưa lớn.',
  },
  'sq-choice-3': {
    correct: 'B',
    explanation: 'Topic sentence nêu ý chính của đoạn.',
  },
  'sq-tfng-3': {
    correct: 'TRUE',
    explanation: 'Critics nói mái xanh đắt (expensive).',
  },
};

export function localSessionSource(lessonId: string): SessionSource {
  return {
    mode: 'local',
    title: 'Luyện nhanh',
    lessonId,
    blocks: [{ blockId: null, questions: MOCK_SESSION_QUESTIONS }],
    key: MOCK_SESSION_KEY,
  };
}
