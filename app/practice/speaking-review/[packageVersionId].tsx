import { Redirect, useLocalSearchParams } from 'expo-router';

import { SpeakingReview } from '@/src/features/practice/speaking/speaking-review';

const ID = /^[0-9a-f-]{36}$/i;

export default function SpeakingReviewRoute() {
  const { packageVersionId = '', parts = '' } = useLocalSearchParams<{ packageVersionId: string; parts?: string }>();
  const ids = parts.split(',').filter((id) => ID.test(id));
  if (!packageVersionId || ids.length === 0) return <Redirect href={'/practice/catalog/speaking' as never} />;
  return <SpeakingReview packageVersionId={packageVersionId} parts={ids} />;
}
