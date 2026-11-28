import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { Sheet } from '@/src/features/practice/components/sheet';
import { useAttemptAnswers } from '@/src/features/practice/hooks/use-attempt-answers';
import type { SavedResponse, TestSection } from '@/src/features/practice/model/sections';
import { safeErrorMessage } from '@/src/lib/error-message';
import { colors, fonts } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { placementApi } from './api';
import { countWords, essayAnswer, minimumWords, questionItems, readEssay } from './model';

/** Writing of a placement test: one essay per task, saved as the learner types, handed to the grader at the end. */
export function PlacementWritingRunner({ attemptId, sections, saved, exitHref, onFinish }: {
  attemptId: string;
  sections: TestSection[];
  saved: SavedResponse[];
  exitHref: string;
  onFinish: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useTheme();
  const answers = useAttemptAnswers(attemptId, saved);
  const tasks = sections.flatMap((section) => questionItems(section).map((item) => ({ section, item })))
    .map((entry, position) => ({ ...entry, label: `Task ${position + 1}` }));
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  // The grader keeps the first essay it receives for each item (the submission key repeats on a retry), so once one is
  // sent the text is frozen: an edit made after a failed hand-in would otherwise be silently ignored.
  const [sent, setSent] = useState(false);
  const essays = tasks.map(({ item }) => readEssay(answers.answers[item.id]));
  const task = tasks[index];

  const finish = async () => {
    setFinishing(true);
    setError('');
    if (!(await answers.flushAll())) {
      setError('Chưa lưu được bài viết. Kiểm tra kết nối rồi nộp lại.');
      setFinishing(false);
      return;
    }
    try {
      for (const [position, { item }] of tasks.entries()) {
        if (!essays[position].trim()) continue;
        await placementApi.submitAnswer({
          attemptItemId: item.id,
          promptSnapshot: JSON.stringify({ stem: item.question?.prompt ?? '' }),
          skill: 'WRITING',
          textPayload: essays[position],
          submissionKey: `placement-writing-${attemptId}-${item.id}`,
        });
        setSent(true);
      }
      await onFinish();
    } catch (cause) {
      setError(`${safeErrorMessage(cause, 'Chưa nộp được bài viết.').replace(/[.!?]?$/, '.')} Hãy nộp lại.`);
      setFinishing(false);
      setConfirming(false);
    }
  };

  if (!task) return null;
  const passage = task.section.snapshot?.passage;
  const words = countWords(essays[index]);
  const minimum = minimumWords(task.item.question?.prompt);
  const empty = essays.filter((essay) => !essay.trim()).length;

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
        <BackButton fallbackHref={exitHref} />
        <View className="flex-1">
          <Text weight="black" className="text-lg">Writing</Text>
          <Text className="text-xs text-muted">Kiểm tra trình độ</Text>
        </View>
        {answers.saving ? <ActivityIndicator size="small" color={colors.muted} /> : null}
      </View>

      {tasks.length > 1 ? (
        <View className="mx-4 mb-2 flex-row rounded-2xl p-1" style={{ backgroundColor: colors.surfaceTint }}>
          {tasks.map((entry, position) => {
            const selected = position === index;
            return (
              <Pressable
                key={entry.item.id}
                onPress={() => { void answers.saveAnswer(task.item.id); setIndex(position); }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                className="min-h-11 flex-1 items-center justify-center rounded-xl"
                style={{ backgroundColor: selected ? colors.surface : 'transparent' }}>
                <Text weight="bold" className="text-sm" style={{ color: selected ? colors.ink : colors.muted }}>
                  {entry.label}{essays[position].trim() ? ' ✓' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerClassName="px-4 pb-6">
        <Text className="text-[15px] leading-6">{task.item.question?.prompt}</Text>
        {passage && passage.paragraphs.length > 0 ? (
          <View className="mt-3 gap-1 rounded-2xl p-3" style={{ backgroundColor: colors.surfaceTint }}>
            {passage.paragraphs.map((paragraph, position) => (
              <Text key={position} className="text-sm leading-5">{paragraph.label ? `${paragraph.label}: ` : ''}{paragraph.text}</Text>
            ))}
          </View>
        ) : null}
        <TextInput
          value={essays[index]}
          onChangeText={(text) => answers.setAnswer(task.item.id, essayAnswer(text), 'debounce')}
          onBlur={() => void answers.saveAnswer(task.item.id)}
          multiline
          editable={!sent}
          textAlignVertical="top"
          placeholder="Viết bài của bạn ở đây…"
          placeholderTextColor={colors.muted}
          selectionColor={colors.accentDeep}
          accessibilityLabel={`Bài viết ${task.label}`}
          className="mt-4 rounded-2xl bg-surface p-4 text-ink"
          style={{ minHeight: 260, borderWidth: 1.5, borderColor: colors.line, fontFamily: fonts.regular, fontSize: Math.round(16 * fontScale), lineHeight: Math.round(24 * fontScale) }}
        />
        <Text className="mt-2 text-right text-xs" style={{ color: minimum != null && words >= minimum ? colors.success : colors.muted }}>
          {words} từ{minimum != null ? ` · cần ít nhất ${minimum}` : ''}
        </Text>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {error ? <View className="mb-2"><FormAlert message={error} /></View> : null}
        {sent ? <Text className="mb-2 text-center text-xs text-muted">Bài viết đã gửi để chấm nên không sửa được nữa.</Text> : null}
        <Button label={sent ? 'Nộp lại' : 'Hoàn thành Writing'} onPress={() => (sent ? void finish() : setConfirming(true))} loading={finishing} loadingLabel="Đang nộp" />
      </View>

      <Sheet
        visible={confirming}
        title="Nộp phần Writing?"
        subtitle={empty ? `Còn ${empty} bài chưa viết. Bài trống sẽ không được chấm.` : 'Sau khi nộp, bạn không sửa được bài viết nữa.'}
        onClose={() => setConfirming(false)}
        dismissable={!finishing}
        footer={<>
          <Button label="Nộp bài" onPress={() => void finish()} loading={finishing} loadingLabel="Đang nộp" />
          <Button variant="ghost" label="Viết tiếp" disabled={finishing} onPress={() => setConfirming(false)} />
        </>}>
        <View />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
