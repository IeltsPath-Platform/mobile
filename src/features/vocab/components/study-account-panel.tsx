import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Flame, Heart, Settings2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import { purchaseStudyBenefit, type StudyPurchase } from '../study-purchase';
import { colors } from '@/src/theme';

type PurchaseKind = 'refill' | 'freeze';

/** Shares the same server summary in Today and in a lesson's out-of-hearts panel. */
export function StudyAccountPanel({ heartOnly = false }: { heartOnly?: boolean }) {
  const client = useQueryClient();
  const summary = useQuery({ queryKey: studyKeys.summary, queryFn: ({ signal }) => vocabularyStudyApi.summary(signal), staleTime: 20_000 });
  const [open, setOpen] = useState(false);
  const [selection, setConfirmation] = useState<{ kind: PurchaseKind; cost: number } | null>(null);
  const pending = useQuery<StudyPurchase | null>({ queryKey: studyKeys.purchase, queryFn: async () => null, initialData: null, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const confirmation = pending.data ?? selection;
  const [localBusy, setBusy] = useState(false);
  const busy = localBusy || Boolean(pending.data?.inFlight);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const data = summary.data;
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const purchase = async () => {
    if (!confirmation || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await purchaseStudyBenefit(client, confirmation);
      if (result) {
        setNotice(`Đã hoàn tất. Còn ${result.balance} Points.`);
        setConfirmation(null);
      }
    } catch (cause) {
      if (!client.getQueryData(studyKeys.purchase)) setConfirmation(null);
      setError(cause instanceof Error ? cause.message : 'Chưa thực hiện được. Hãy thử lại.');
    } finally { inFlight.current = false; setBusy(false); }
  };
  const updateTimezone = async () => {
    if (!localTimezone || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      await vocabularyStudyApi.settings(localTimezone);
      await summary.refetch();
      setNotice('Đã cập nhật múi giờ học.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được múi giờ.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const show = () => { setOpen(true); void summary.refetch(); };

  return <>
    {heartOnly ? <Button variant="secondary" label="Xem tim và hồi tim" onPress={show} /> : <Pressable accessibilityRole="button" accessibilityLabel="Xem XP, chuỗi học và tim" onPress={show} className="min-h-12 flex-row flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
      {summary.isPending ? <ActivityIndicator color={colors.accent} /> : summary.isError ? <Text className="text-sm text-danger">Chưa tải được chỉ số · Thử lại</Text> : data ? <>
        <View className="flex-row items-center gap-1"><Flame size={16} color={colors.flame} /><Text weight="bold" className="text-sm">{data.streak.currentDays} ngày</Text></View>
        <View className="flex-row items-center gap-1"><Coins size={16} color={colors.coin} /><Text weight="bold" className="text-sm">{data.xp.totalXp} XP</Text></View>
        <View className="flex-row items-center gap-1"><Heart size={16} color={colors.danger} fill={colors.danger} /><Text weight="bold" className="text-sm">{data.hearts.hearts}/{data.hearts.maxHearts}</Text></View>
        <Settings2 size={16} color={colors.muted} />
      </> : null}
    </Pressable>}
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <SafeAreaView className="flex-1 bg-canvas">
        <View className="flex-row items-center justify-between px-5 py-3"><Text weight="black" className="text-xl">Tiến độ học từ</Text><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setOpen(false)} className="h-11 w-11 items-center justify-center"><X color={colors.ink} size={24} /></Pressable></View>
        <ScrollView contentContainerClassName="gap-4 px-5 pb-10">
          {summary.isPending ? <ActivityIndicator color={colors.accent} /> : null}
          {summary.isError ? <><Text className="text-danger">{summary.error.message}</Text><Button label="Tải lại" onPress={() => void summary.refetch()} /></> : null}
          {data ? <>
            <View className="gap-2 rounded-3xl bg-surface p-4"><Text weight="black" className="text-lg">Cấp {data.xp.level} · {data.xp.totalXp} XP</Text><Text className="text-sm text-muted">Còn {data.xp.xpToNextLevel} XP đến cấp tiếp theo.</Text></View>
            <View className="gap-3 rounded-3xl bg-surface p-4">
              <Text weight="bold">{data.hearts.hearts}/{data.hearts.maxHearts} tim</Text>
              {data.hearts.nextHeartAt ? <Text className="text-sm text-muted">Tim tiếp theo: {new Date(data.hearts.nextHeartAt).toLocaleString()}</Text> : <Text className="text-sm text-muted">Tim đã đầy, sẵn sàng học tiếp.</Text>}
              {data.hearts.hearts < data.hearts.maxHearts ? <Button label={`Hồi đầy · ${data.hearts.refillCost} Points`} disabled={busy || Boolean(confirmation)} onPress={() => { setError(''); setNotice(''); setConfirmation({ kind: 'refill', cost: data.hearts.refillCost }); }} /> : null}
            </View>
            <View className="gap-3 rounded-3xl bg-surface p-4">
              <Text weight="bold">Chuỗi học {data.streak.currentDays} ngày</Text>
              <Text className="text-sm text-muted">{data.streak.qualifiedToday ? 'Hôm nay bạn đã giữ chuỗi học.' : 'Hoàn thành một bài hoặc ôn thẻ từ để giữ chuỗi hôm nay.'}</Text>
              <Text className="text-sm text-muted">Kỷ lục: {data.streak.longestDays} ngày{data.streak.freezeAvailable ? ' · Đã có bảo vệ chuỗi' : ''}</Text>
              {data.streak.freezeCost !== null && !data.streak.freezeBlockedReason ? <Button variant="secondary" label={`Bảo vệ một ngày · ${data.streak.freezeCost} Points`} disabled={busy || Boolean(confirmation)} onPress={() => { setError(''); setNotice(''); setConfirmation({ kind: 'freeze', cost: data.streak.freezeCost! }); }} /> : null}
              {data.streak.freezeBlockedReason === 'LIMIT' ? <Text className="text-sm text-muted">Đã đạt giới hạn bảo vệ liên tiếp. Học hôm nay để tiếp tục chuỗi.</Text> : null}
            </View>
            <View className="gap-2 rounded-3xl bg-surface p-4"><Text weight="bold">Múi giờ: {data.streak.timezone}</Text>{localTimezone && localTimezone !== data.streak.timezone ? <Button variant="secondary" loading={busy && !confirmation} disabled={busy || Boolean(confirmation)} label={`Dùng múi giờ thiết bị: ${localTimezone}`} onPress={() => void updateTimezone()} /> : <Text className="text-sm text-muted">Đang dùng múi giờ của thiết bị.</Text>}</View>
          </> : null}
          {confirmation ? <View className="gap-3 rounded-2xl border border-line bg-surface p-4"><Text weight="bold">{confirmation.kind === 'refill' ? 'Hồi đầy tim' : 'Mua bảo vệ chuỗi'} với {confirmation.cost} Points?</Text><Text className="text-sm text-muted">Points được trừ từ ví điểm của tài khoản.</Text><Button loading={busy} label={pending.data ? 'Thử lại giao dịch' : 'Xác nhận'} onPress={() => void purchase()} /><Button variant="ghost" label="Để sau" disabled={busy || Boolean(pending.data)} onPress={() => setConfirmation(null)} /></View> : null}
          {error ? <Text accessibilityRole="alert" className="text-sm text-danger">{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" className="text-sm text-success">{notice}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
