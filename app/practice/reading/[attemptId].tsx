import { useLocalSearchParams } from 'expo-router';

import { AttemptGate } from '@/src/features/practice/components/attempt-gate';
import { ReadingScreen } from '@/src/features/practice/reading/reading-screen';

export default function ReadingAttemptRoute() {
  const { attemptId = '' } = useLocalSearchParams<{ attemptId: string }>();
  return (
    <AttemptGate attemptId={attemptId} skill="reading">
      {(data) => <ReadingScreen key={attemptId} attemptId={attemptId} {...data} />}
    </AttemptGate>
  );
}
