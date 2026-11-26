import { useLocalSearchParams } from 'expo-router';

import { SpeakingResultScreen } from '@/src/features/practice/speaking/result/speaking-result-screen';

export default function SpeakingResultRoute() {
  const { submissionId = '' } = useLocalSearchParams<{ submissionId: string }>();
  return <SpeakingResultScreen key={submissionId} submissionId={submissionId} />;
}
