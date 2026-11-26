import { useLocalSearchParams } from 'expo-router';

import { HistoryScreen, type HistoryTab } from '@/src/features/practice/history/history-screen';

const TABS: HistoryTab[] = ['practice', 'course', 'knowledge', 'teacher'];
const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;

export default function PracticeHistoryRoute() {
  const { tab, skill } = useLocalSearchParams<{ tab?: string; skill?: string }>();
  return (
    <HistoryScreen
      initialTab={TABS.find((item) => item === tab) ?? 'practice'}
      initialSkill={SKILLS.find((item) => item === skill) ?? 'listening'}
    />
  );
}
