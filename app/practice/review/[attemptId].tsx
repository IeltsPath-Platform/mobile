import { useLocalSearchParams } from 'expo-router';

import { ReviewScreen } from '@/src/features/practice/result/review-screen';

export default function PracticeReviewRoute() {
  const { attemptId = '', skill } = useLocalSearchParams<{ attemptId: string; skill?: string }>();
  return <ReviewScreen key={attemptId} attemptId={attemptId} skill={skill === 'listening' ? 'listening' : 'reading'} />;
}
