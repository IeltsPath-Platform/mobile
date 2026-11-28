import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { Sheet } from './sheet';

type SubmitSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  total: number;
  unanswered: number;
  flagged: number;
  unsaved: number;
  submitting: boolean;
  error?: string;
  /** Timed tests say the answers can no longer change; practice says the same in softer words. */
  timed: boolean;
  /** The exam time is up: the sheet stays open, offering only to (re)submit. */
  expired?: boolean;
  /** The server already closed the attempt (late submit): the test cannot be graded, so the only way on is to leave. */
  closed?: boolean;
  onExit?: () => void;
  /** Replaces the line under the title (a placement skill is graded with the whole test, not at once). */
  note?: string;
};

/** The finish screen before submitting: what is still empty or flagged, and the irreversible submit. */
export function SubmitSheet({ visible, onClose, onSubmit, total, unanswered, flagged, unsaved, submitting, error, timed, expired = false, closed = false, onExit, note }: SubmitSheetProps) {
  if (closed) {
    return (
      <Sheet
        visible={visible}
        onClose={() => onExit?.()}
        title="Bài đã hết hạn"
        subtitle="Thời gian làm bài đã kết thúc trước khi bài được nộp, nên bài này không được chấm. Bạn có thể chọn đề và làm lại."
        footer={<Button label="Về danh mục" onPress={() => onExit?.()} />}>
        <View />
      </Sheet>
    );
  }
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissable={!submitting && !expired}
      title={expired ? 'Hết giờ làm bài' : 'Nộp bài?'}
      subtitle={note && !expired ? note : expired ? 'Bài đang được nộp tự động. Nếu chưa nộp được, hãy kiểm tra mạng rồi nộp lại.' : timed ? 'Sau khi nộp bạn không sửa được đáp án.' : 'Bài sẽ được chấm ngay và bạn xem được giải thích từng câu.'}
      footer={<>
        <Button label="Nộp bài" loading={submitting} loadingLabel="Đang nộp…" onPress={onSubmit} />
        {expired ? null : <Button label="Làm tiếp" variant="secondary" disabled={submitting} onPress={onClose} />}
      </>}>
      <View className="flex-row gap-2">
        <Stat label="Đã làm" value={`${total - unanswered}/${total}`} color={colors.success} />
        <Stat label="Còn trống" value={String(unanswered)} color={unanswered ? colors.danger : colors.muted} />
        <Stat label="Đánh dấu" value={String(flagged)} color={flagged ? colors.accentWarm : colors.muted} />
      </View>
      {unsaved > 0 ? <View className="mt-3"><FormAlert message={`${unsaved} câu chưa lưu được lên máy chủ. Khi nộp, ứng dụng sẽ thử lưu lại trước.`} /></View> : null}
      {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
    </Sheet>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-canvas py-3">
      <Text weight="black" className="text-2xl" style={{ color }}>{value}</Text>
      <Text className="mt-0.5 text-xs text-muted">{label}</Text>
    </View>
  );
}
