import { useLocalSearchParams } from 'expo-router';

import { AttemptGate } from '@/src/features/practice/components/attempt-gate';
import { ListeningScreen } from '@/src/features/practice/listening/listening-screen';

export default function ListeningAttemptRoute() {
  const { attemptId = '' } = useLocalSearchParams<{ attemptId: string }>();
  return (
    <AttemptGate attemptId={attemptId} skill="listening">
      {(data) => <ListeningScreen key={attemptId} attemptId={attemptId} {...data} />}
    </AttemptGate>
  );
}
