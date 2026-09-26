import { Check, Lock, X, Zap } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { PathNode } from '../path';

type LessonSheetProps = {
  node: PathNode | null;
  visible: boolean;
  onClose: () => void;
  onStart: (nodeId: string) => void;
};

export function LessonSheet({ node, visible, onClose, onStart }: LessonSheetProps) {
  if (!node) return null;

  const locked = node.status === 'locked';
  const done = node.status === 'done';
  const Icon = node.Icon;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose} accessibilityLabel="Đóng">
        <Pressable
          className="rounded-t-3xl border border-line bg-surface px-5 pb-10 pt-4"
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal>
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-line" />
          </View>

          <View className="flex-row items-start justify-between gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${node.color}22` }}>
              {done ? <Check size={28} color={node.color} strokeWidth={3} /> : locked ? <Lock size={26} color={colors.muted} /> : <Icon size={28} color={node.color} />}
            </View>
            <View className="flex-1">
              <Text weight="black" className="text-xl leading-7">
                {node.title}
              </Text>
              <Text className="mt-1 text-base leading-6 text-muted">{node.subtitle}</Text>
              <View className="mt-2 flex-row items-center gap-1.5">
                <Zap size={16} color={colors.xpDeep} fill={colors.xp} />
                <Text weight="extrabold" className="text-sm text-accent-deep">
                  +{node.xp} XP
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-canvas"
              hitSlop={8}>
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-canvas px-4 py-3">
            <Text weight="bold" className="text-sm text-muted">
              {locked
                ? 'Bài này còn khóa. Xong bài đang sáng trên path rồi quay lại.'
                : done
                  ? 'Bạn đã làm bài này. Có thể luyện lại để giữ nhịp.'
                  : 'Bài tiếp theo của bạn. Bấm Bắt đầu — khoảng 5–8 phút.'}
            </Text>
          </View>

          <View className="mt-5 gap-3">
            {locked ? (
              <Button variant="secondary" label="Đã hiểu" onPress={onClose} />
            ) : (
              <Button
                label={done ? 'Luyện lại' : 'Bắt đầu ngay'}
                onPress={() => {
                  onClose();
                  onStart(node.id);
                }}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
