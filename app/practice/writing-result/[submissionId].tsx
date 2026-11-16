import { useLocalSearchParams } from 'expo-router';

import { WritingResultScreen } from '@/src/features/practice/writing/result/writing-result-screen';

export default function WritingResultRoute() {
  const { submissionId = '' } = useLocalSearchParams<{ submissionId: string }>();
  return <WritingResultScreen key={submissionId} submissionId={submissionId} />;
}
