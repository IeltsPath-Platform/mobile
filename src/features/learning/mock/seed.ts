import type { LessonDetailDto, QuestionDto, TopicSummaryDto } from '../types';

export const TOPIC_DEMO = '10000000-0000-4000-8000-000000000001';
export const TOPIC_TFNG = '20000000-0000-4000-8000-000000000002';
export const L1 = '20000000-0000-4000-8000-000000000101';
export const L2 = '20000000-0000-4000-8000-000000000102';
export const L1_EX = '20000000-0000-4000-8000-000000000205';
export const Q1 = '20000000-0000-4000-8000-000000000001';
export const Q2 = '20000000-0000-4000-8000-000000000011';
export const Q3 = '20000000-0000-4000-8000-000000000012';
export const REVIEW_1 = '20000000-0000-4000-8000-000000000901';
export const REVIEW_SET_1 = '20000000-0000-4000-8000-000000000902';
export const RQ1 = '20000000-0000-4000-8000-000000000051';

export const MOCK_TOPIC_SEED: TopicSummaryDto[] = [
  {
    topicId: TOPIC_DEMO,
    code: 'DEMO_READING',
    name: 'Demo IELTS Reading',
    sequenceOrder: 1,
    status: 'IN_PROGRESS',
    completedLessonCount: 0,
  },
  {
    topicId: TOPIC_TFNG,
    code: 'TFNG_SKILLS',
    name: 'True / False / Not Given',
    sequenceOrder: 2,
    status: 'LOCKED',
    completedLessonCount: 0,
  },
];

const l1Questions: QuestionDto[] = [
  {
    questionVersionId: Q1,
    sortOrder: 1,
    stem: 'Which sentence is the topic sentence of paragraph C?',
    options: [
      { optionKey: 'A', content: 'Green roofs also manage rainwater.', sortOrder: 1 },
      { optionKey: 'B', content: 'The soil soaks up much of a heavy shower…', sortOrder: 2 },
      { optionKey: 'C', content: 'In Copenhagen, new flat roofs must now be planted…', sortOrder: 3 },
    ],
  },
  {
    questionVersionId: Q2,
    sortOrder: 2,
    stem: 'Which sentence tells you what paragraph D is about?',
    options: [
      { optionKey: 'A', content: 'Not everyone is convinced.', sortOrder: 1 },
      { optionKey: 'B', content: 'Critics point out that green roofs are expensive…', sortOrder: 2 },
      { optionKey: 'C', content: '…many older buildings are not strong enough…', sortOrder: 3 },
    ],
  },
  {
    questionVersionId: Q3,
    sortOrder: 3,
    stem: 'Complete with ONE WORD from paragraph D: people who doubt green roofs are called ______.',
    options: null,
  },
];

export const MOCK_LESSON_L1: LessonDetailDto = {
  lessonId: L1,
  topicId: TOPIC_DEMO,
  code: 'L1',
  title: 'Câu chủ đề nằm ở đâu',
  sortOrder: 1,
  status: 'AVAILABLE',
  blocks: [
    {
      blockId: 'b-text-1',
      blockType: 'TEXT',
      sortOrder: 1,
      text: 'Câu chủ đề (topic sentence) thường nêu ý chính của đoạn. Hãy tìm câu khái quát, không phải ví dụ chi tiết.',
    },
    {
      blockId: 'b-pass-1',
      blockType: 'ASSET',
      sortOrder: 2,
      passageTitle: 'Green roofs',
      passage:
        'C. Green roofs also manage rainwater. The soil soaks up much of a heavy shower and releases it slowly…\n\nD. Not everyone is convinced. Critics point out that green roofs are expensive to install…',
    },
    {
      blockId: L1_EX,
      blockType: 'EXERCISE',
      sortOrder: 3,
      passed: false,
      questions: l1Questions,
    },
  ],
};

export const MOCK_LESSON_L2: LessonDetailDto = {
  lessonId: L2,
  topicId: TOPIC_DEMO,
  code: 'L2',
  title: 'Ý chính của cả bài',
  sortOrder: 2,
  status: 'LOCKED',
  blocks: [
    {
      blockId: 'b2-text',
      blockType: 'TEXT',
      sortOrder: 1,
      text: 'Ý chính toàn bài là điểm chung của mọi đoạn. (Mock — làm L1 trước.)',
    },
  ],
};

export const ANSWER_KEY: Record<string, { correct: string; explanation: string }> = {
  [Q1]: {
    correct: 'A',
    explanation: '"Green roofs also manage rainwater" nêu chủ đề đoạn C.',
  },
  [Q2]: {
    correct: 'A',
    explanation: '"Not everyone is convinced" báo trước ý phản đối.',
  },
  [Q3]: {
    correct: 'critics',
    explanation: 'Đoạn D: "Critics point out that…".',
  },
  [RQ1]: {
    correct: 'B',
    explanation: 'Đáp án khái quát cả lợi ích lẫn rủi ro.',
  },
};
