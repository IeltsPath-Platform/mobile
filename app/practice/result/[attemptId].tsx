import { useLocalSearchParams } from 'expo-router';

import { ResultScreen } from '@/src/features/practice/result/result-screen';

export default function PracticeResultRoute() {
  const { attemptId = '', skill } = useLocalSearchParams<{ attemptId: string; skill?: string }>();
  return <ResultScreen key={attemptId} attemptId={attemptId} skill={skill === 'listening' ? 'listening' : 'reading'} />;
}
