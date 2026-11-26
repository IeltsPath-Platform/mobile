import { View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { colors } from '@/src/theme';

import { usePremiumUpgrade } from '../grading/use-premium-upgrade';
import { isPremiumRequired } from '../api/premium-error';

/** A task that did not open: a Premium test offers the plans, anything else offers to try again. */
export function TaskLoadError({ title, heading, error, fallbackHref, onRetry }: {
  title: string; heading: string; error: Error; fallbackHref: string; onRetry: () => void;
}) {
  const upgrade = usePremiumUpgrade(onRetry);
  const locked = isPremiumRequired(error);
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <BackHeader title={title} fallbackHref={fallbackHref} />
      <EmptyState
        title={locked ? 'Đề dành cho Premium' : heading}
        message={error.message}
        mood="oops"
        action={locked
          ? <Button label="Xem gói Premium" onPress={upgrade.open} />
          : <Button label="Thử lại" variant="secondary" onPress={onRetry} />}
      />
      {upgrade.sheets}
    </View>
  );
}
