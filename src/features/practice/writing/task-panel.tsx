import { Image } from 'expo-image';
import { Expand, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { WritingTask } from '../api/writing';
import { useReaderPrefs } from '../components/reader-prefs';
import { boldRuns, parseGuide } from '../model/writing-text';

/** The chart of a Task 1 prompt; a tap opens it full screen (pinch to zoom on iOS). */
export function TaskChart({ task }: { task: WritingTask }) {
  const [zoom, setZoom] = useState(false);
  const insets = useSafeAreaInsets();
  const image = task.images[0];
  if (!image) return null;
  const alt = image.altText ?? 'Biểu đồ của đề bài';
  return (
    <>
      <Pressable onPress={() => setZoom(true)} accessibilityRole="imagebutton" accessibilityLabel={`${alt}. Chạm để phóng to`} className="mt-3 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: colors.line, backgroundColor: '#ffffff' }}>
        <Image source={image.url} contentFit="contain" style={{ width: '100%', aspectRatio: 4 / 3 }} accessibilityIgnoresInvertColors />
        <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Expand size={13} color="#ffffff" />
          <Text weight="bold" className="text-[11px]" style={{ color: '#ffffff' }}>Phóng to</Text>
        </View>
      </Pressable>
      <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)} statusBarTranslucent>
        <View className="flex-1" style={{ backgroundColor: '#000000' }}>
          <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Image source={image.url} contentFit="contain" style={{ width: '100%', aspectRatio: 3 / 4 }} accessibilityLabel={alt} />
          </ScrollView>
          <Pressable onPress={() => setZoom(false)} accessibilityRole="button" accessibilityLabel="Đóng" className="absolute right-4 h-11 w-11 items-center justify-center rounded-full" style={{ top: insets.top + 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

/** The prompt, the chart and (in practice) the writing guide stored with the task. */
export function TaskPanel({ task, showGuide, exam }: { task: WritingTask; showGuide: boolean; exam: boolean }) {
  const { text, paper } = useReaderPrefs();
  const blocks = useMemo(() => parseGuide(task.guide), [task.guide]);
  const minutes = task.timeLimitSeconds ? Math.round(task.timeLimitSeconds / 60) : task.task === 'TASK_2' ? 40 : 20;
  const minWords = task.minWords ?? (task.task === 'TASK_2' ? 250 : 150);
  return (
    <View>
      {exam ? <Text weight="bold" className="mb-2 text-sm" style={{ color: colors.accentDeep }}>You should spend about {minutes} minutes on this task. Write at least {minWords} words.</Text> : null}
      <Text style={{ ...text, color: paper.text }}>{task.prompt}</Text>
      <TaskChart task={task} />
      {task.instructions ? <Text className="mt-3" style={{ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: paper.text, opacity: 0.8 }}>{task.instructions}</Text> : null}
      {showGuide && blocks.length ? (
        <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: colors.canvas }}>
          <Text weight="black" className="text-sm tracking-wider" style={{ color: colors.accentDeep }}>HƯỚNG DẪN VIẾT BÀI</Text>
          <Text className="mb-2 text-xs text-muted">IELTS Writing {task.task === 'TASK_2' ? 'Task 2' : 'Task 1'} · {task.title}</Text>
          {blocks.map((block, index) => {
            if (block.kind === 'heading') return <Text key={index} weight="extrabold" className="mt-3 text-base text-ink">{block.text}</Text>;
            const runs = boldRuns(block.text).map((run, part) => <Text key={part} weight={run.bold ? 'bold' : 'regular'}>{run.text}</Text>);
            return <Text key={index} className="mt-1.5 text-sm leading-5 text-ink">{block.kind === 'bullet' ? '•  ' : ''}{runs}</Text>;
          })}
        </View>
      ) : null}
    </View>
  );
}
