import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { colors } from '@/src/theme';
import { QueryState } from './query-state';
import { Panel, ProgressBar } from './progress-ui';

const WEEKDAY = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function WeeklyGoalPanel({ timezone }: { timezone: string }) {
  const client = useQueryClient();
  const goalKey = ['flashcards', 'notebook', 'weekly-goal', timezone] as const;
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');

  const goal = useQuery({ queryKey: goalKey, queryFn: () => notebookApi.weeklyGoal(timezone) });
  const save = useMutation({
    mutationFn: () => notebookApi.updateWeeklyGoal(Number(target), timezone),
    onSuccess: (value) => {
      client.setQueryData(goalKey, value);
      setOpen(false);
    },
  });
  const validTarget = /^\d+$/.test(target) && Number(target) >= 10 && Number(target) <= 1000;
  const pct =
    goal.data && goal.data.target > 0
      ? Math.max(0, Math.min(100, Math.round((goal.data.progress / goal.data.target) * 100)))
      : 0;

  return (
    <Panel>
      <View className="flex-row items-center justify-between">
        <Text weight="bold" className="text-base">
          Mục tiêu tuần
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Đóng chỉnh mục tiêu tuần' : 'Thay đổi mục tiêu tuần'}
          disabled={!goal.data}
          onPress={() => {
            setTarget(String(goal.data?.target ?? 50));
            setOpen((value) => !value);
            save.reset();
          }}
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-sm text-accent-deep">{open ? 'Đóng' : 'Thay đổi'}</Text>
        </Pressable>
      </View>
      <QueryState pending={goal.isPending} error={goal.error} retry={() => void goal.refetch()} />
      {goal.data ? (
        <>
          <View className="flex-row items-end justify-between">
            <View className="flex-row items-baseline gap-1">
              <Text weight="extrabold" className="text-3xl text-accent-deep">
                {goal.data.progress}
              </Text>
              <Text className="text-base text-muted">/{goal.data.target} từ</Text>
            </View>
            <Text className="mb-0.5 text-sm" style={{ color: pct >= 100 ? colors.success : colors.muted }}>
              {goal.data.remaining > 0 ? `Còn ${goal.data.remaining} từ` : '✓ Đạt mục tiêu!'}
            </Text>
          </View>
          <ProgressBar value={goal.data.progress} max={goal.data.target} />
          <View className="flex-row justify-between pt-1">
            {goal.data.days.map((day, index) => (
              <View key={day.date} className="items-center gap-1">
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: day.achieved ? colors.accentSoft : colors.canvas,
                    borderWidth: day.achieved ? 0 : 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text
                    weight="bold"
                    className="text-[11px]"
                    style={{ color: day.achieved ? colors.accentDeep : colors.muted }}
                  >
                    {day.achieved ? '✓' : WEEKDAY[index]}
                  </Text>
                </View>
                <Text className={`text-[9px] ${day.achieved ? 'text-accent-deep' : 'text-muted'}`}>
                  {WEEKDAY[index]}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {open ? (
        <>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Mục tiêu số từ mỗi tuần"
            className="min-h-12 rounded-2xl border border-line px-3 text-ink"
            placeholder="Ví dụ: 50"
            placeholderTextColor={colors.muted}
          />
          <Text className="text-xs text-muted">Từ 10 đến 1.000 từ mỗi tuần.</Text>
          {save.error ? <Text className="text-sm text-danger">{save.error.message}</Text> : null}
          <Button
            label="Lưu mục tiêu"
            disabled={!validTarget}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </>
      ) : null}
    </Panel>
  );
}
