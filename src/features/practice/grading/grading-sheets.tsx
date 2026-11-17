import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Check, CircleAlert, Crown, KeyRound, Sparkles, TicketCheck, UserCheck, Wallet } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

import { accessApi, activationErrorMessage, type ActivationResult } from '../api/access';
import { getFullExaminers, listExaminers, type Examiner } from '../api/examiners';
import { Sheet } from '../components/sheet';
import { certificateText } from '../model/examiner-labels';
import { NO_CREDITS, NO_PREMIUM, type GradeOptions } from '../model/grade-options';
import { PREMIUM_PRODUCTS, keyActivationAllowed, type ActivationProduct } from './products';

/** Wording that differs between Writing and Speaking; the defaults are the Writing ones. */
export type GradeCopy = {
  methodDescription?: string;
  teacher?: string;
  ai?: string;
  confirmDescription?: string;
  backLabel?: string;
  note?: string;
  busyLabel?: string;
  kept?: string;
};

export type GradeFigures = { cost: number; balance: number | null; context: string; benefits: string[]; checks: Array<{ text: string; ok: boolean }> };

/** "Chọn cách chấm bài": a teacher (Premium credit) or the AI (points). A closed way says why. */
export function GradeMethodSheet({ visible, options, context, copy, onTeacher, onAi, onPremium, onClose }: {
  visible: boolean; options: GradeOptions | null; context: string; copy?: GradeCopy; onTeacher: () => void; onAi: () => void;
  /** Opens the Premium plans when the teacher way is closed for lack of Premium or credits. */
  onPremium?: () => void;
  onClose: () => void;
}) {
  const teacher = options?.teacher;
  const ai = options?.ai;
  return (
    <Sheet visible={visible && options !== null} onClose={onClose} title="Chọn cách chấm bài" subtitle={context}>
      <Text className="mb-3 text-sm leading-5 text-muted">{copy?.methodDescription ?? 'Bài viết của bạn có thể được giáo viên hoặc AI chấm. Bạn chọn cách nào cũng được.'}</Text>
      {teacher && ai ? (
        <View className="gap-3">
          <MethodCard
            icon={<UserCheck size={22} color={colors.accentDeep} />}
            title="Giáo viên chấm"
            text={copy?.teacher ?? 'Giáo viên IELTS chấm 4 tiêu chí, ghi lỗi ngay trên bài và nhận xét chi tiết. Giáo viên có tối đa 48 giờ để chấm.'}
            status={teacher.enabled ? (teacher.credits === null ? 'Dùng 1 lượt giáo viên chấm của gói Premium.' : `Còn ${teacher.credits} lượt giáo viên chấm (gói Premium).`) : teacher.reason ?? ''}
            ok={teacher.enabled}
            statusIcon={teacher.enabled ? <TicketCheck size={15} color={colors.success} /> : <CircleAlert size={15} color={colors.accentWarm} />}
            action={<>
              <Button label="Chọn giáo viên" disabled={!teacher.enabled} onPress={onTeacher} />
              {!teacher.enabled && onPremium && (teacher.reason === NO_PREMIUM || teacher.reason === NO_CREDITS) ? <Button label="Xem gói Premium" variant="ghost" onPress={onPremium} /> : null}
            </>}
          />
          <MethodCard
            icon={<Sparkles size={22} color={colors.accentDeep} />}
            title="AI chấm"
            text={copy?.ai ?? 'AI chấm ngay trong vài giây, trả band, lỗi cần sửa và gợi ý cải thiện.'}
            status={ai.reason ?? `Chi phí ${ai.cost} point${ai.balance === null ? '' : ` · số dư ${ai.balance} point`}${ai.enabled ? '' : ` · còn thiếu ${ai.shortBy} point`}`}
            ok={ai.enabled && !ai.reason}
            statusIcon={ai.enabled && !ai.reason ? <Wallet size={15} color={colors.success} /> : <CircleAlert size={15} color={colors.accentWarm} />}
            action={<Button label={ai.reason ? 'Chưa khả dụng' : ai.enabled ? `Chấm bằng AI · ${ai.cost} point` : 'Nạp point để AI chấm'} disabled={Boolean(ai.reason)} onPress={onAi} />}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

function MethodCard({ icon, title, text, status, ok, statusIcon, action }: { icon: React.ReactNode; title: string; text: string; status: string; ok: boolean; statusIcon: React.ReactNode; action: React.ReactNode }) {
  return (
    <View className="gap-2 rounded-3xl p-4" style={{ borderWidth: 2, borderColor: colors.line, backgroundColor: ok ? colors.surface : colors.canvas, opacity: ok ? 1 : 0.85 }}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.accentSoft }}>{icon}</View>
        <Text weight="black" className="text-base text-ink">{title}</Text>
      </View>
      <Text className="text-sm leading-5 text-muted">{text}</Text>
      <View className="flex-row items-start gap-1.5">{statusIcon}<Text className="flex-1 text-sm" style={{ color: ok ? colors.success : colors.accentWarm }}>{status}</Text></View>
      {action}
    </View>
  );
}

/** The grading terms did not load: nothing can be priced, so say so and offer to try again. */
export function TermsSheet({ visible, loading, onRetry, onClose }: { visible: boolean; loading: boolean; onRetry: () => void; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Chọn cách chấm bài" subtitle="Bài viết của bạn vẫn được giữ nguyên." footer={<Button label="Thử lại" loading={loading} onPress={onRetry} />}>
      <Text className="text-sm text-ink">{loading ? 'Đang tải điều khoản chấm…' : 'Chưa tải được điều khoản chấm. Thử lại để chọn cách chấm bài.'}</Text>
    </Sheet>
  );
}

/** The AI grade: cost, balance before and after, what the learner gets, the checks, consent and the grade button. */
export function GradeConfirmSheet({ visible, figures, busy, error, canGrade, onGrade, onClose, copy, consent, progress }: {
  visible: boolean;
  figures: GradeFigures | null;
  busy: boolean;
  error: string;
  canGrade: boolean;
  onGrade: () => void;
  onClose: () => void;
  copy?: GradeCopy;
  consent?: { label: string; checked: boolean; onChange: (value: boolean) => void };
  progress?: string;
}) {
  if (!figures) return null;
  const { cost, balance } = figures;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissable={!busy}
      title="Chấm bài bằng AI"
      subtitle={figures.context}
      footer={<>
        <Button label={busy ? (copy?.busyLabel ?? 'Đang chấm bài…') : `Chấm bài · ${cost} point`} loading={busy} disabled={!canGrade || (consent !== undefined && !consent.checked)} icon={<Sparkles size={18} color={colors.onAccent} />} onPress={onGrade} />
        <Button label={copy?.backLabel ?? 'Quay lại chỉnh sửa'} variant="secondary" disabled={busy} onPress={onClose} />
        <Text className="text-center text-xs text-muted">{copy?.note ?? 'Bài sẽ được khóa sau khi chấm. Nếu AI gặp lỗi, point sẽ được hoàn lại.'}</Text>
      </>}>
      <Text className="text-sm leading-5 text-muted">{copy?.confirmDescription ?? 'AI chấm theo 4 tiêu chí IELTS Writing và trả về Band, lỗi cần sửa và gợi ý cải thiện.'}</Text>
      <View className="mt-3 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: colors.line }}>
        <Figure label="Chi phí chấm" value={`−${cost} point`} strong />
        <Figure label="Số dư hiện tại" value={balance === null ? '—' : `${balance} point`} />
        <Figure label="Số dư sau khi chấm" value={balance === null ? '—' : `${balance - cost} point`} strong last />
      </View>
      <Text weight="bold" className="mt-4 text-sm text-ink">Bạn sẽ nhận được</Text>
      {figures.benefits.map((benefit) => <View key={benefit} className="mt-1.5 flex-row gap-2"><Check size={16} color={colors.success} /><Text className="flex-1 text-sm text-ink">{benefit}</Text></View>)}
      <View className="mt-3 gap-1">
        {figures.checks.map((check) => <Text key={check.text} className="text-sm" style={{ color: check.ok ? colors.success : colors.accentWarm }}>{check.ok ? '✓' : '!'} {check.text}</Text>)}
      </View>
      {consent ? (
        <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-canvas p-3">
          <Text className="flex-1 text-sm leading-5 text-ink">{consent.label}</Text>
          <Switch value={consent.checked} disabled={busy} onValueChange={consent.onChange} accessibilityLabel={consent.label} />
        </View>
      ) : null}
      {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
      {busy ? (
        <View className="mt-4 flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: colors.accentSoft }}>
          <ActivityIndicator color={colors.accent} />
          <Text className="flex-1 text-sm text-ink">{progress ?? 'AI đang đọc bài và chấm theo 4 tiêu chí IELTS. Đừng đóng ứng dụng.'}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function Figure({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3" style={{ borderBottomWidth: last ? 0 : 1, borderColor: colors.line }}>
      <Text className="text-sm text-muted">{label}</Text>
      <Text weight={strong ? 'extrabold' : 'bold'} className="text-sm text-ink">{value}</Text>
    </View>
  );
}

/** The balance is under the cost: by how much, and a way to add points with an activation key. */
export function NotEnoughPointsSheet({ visible, cost, balance, onActivate, onClose, copy }: { visible: boolean; cost: number; balance: number | null; onActivate: () => void; onClose: () => void; copy?: GradeCopy }) {
  const have = balance ?? 0;
  const allowed = keyActivationAllowed();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Bạn chưa đủ point để chấm bài"
      subtitle={`Chấm bằng AI cần ${cost} point. ${copy?.kept ?? 'Bài viết của bạn vẫn được giữ nguyên.'}`}
      footer={<>
        {allowed ? <Button label="Nạp Key" icon={<KeyRound size={18} color={colors.onAccent} />} onPress={onActivate} /> : null}
        <Button label={copy?.backLabel ?? 'Quay lại chỉnh sửa'} variant="secondary" onPress={onClose} />
      </>}>
      <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: colors.line }}>
        <Figure label="Chi phí chấm" value={`${cost} point`} />
        <Figure label="Số dư hiện tại" value={`${have} point`} />
        <Figure label="Còn thiếu" value={`${Math.max(0, cost - have)} point`} strong last />
      </View>
      <Text className="mt-3 text-sm leading-5 text-muted">{allowed ? 'Nhập mã Activation Key được cấp để cộng point vào tài khoản.' : 'Kích hoạt mã Activation Key trên website IELTSPath, số dư sẽ cập nhật ngay trong ứng dụng.'}</Text>
    </Sheet>
  );
}

/** Enter an activation key: points or Premium days are added to the account at once. */
export function ActivateKeySheet({ visible, product, onActivated, onClose }: { visible: boolean; product: ActivationProduct | null; onActivated: (result: ActivationResult) => void; onClose: () => void }) {
  const [key, setKey] = useState('');
  // One idempotency key per typed key: a retry after a lost answer replays the same activation, while a corrected key is
  // a new request (the server refuses an idempotency key that already redeemed a different key).
  const request = useRef<{ key: string; id: string } | null>(null);
  const activate = useMutation({
    mutationFn: () => {
      if (request.current?.key !== key) request.current = { key, id: createRequestId() };
      return accessApi.activateKey(key, request.current.id);
    },
    onSuccess: (result) => { request.current = null; setKey(''); onActivated(result); },
  });
  const result = activate.data;
  return (
    <Sheet
      visible={visible}
      onClose={() => { activate.reset(); onClose(); }}
      dismissable={!activate.isPending}
      title="Kích hoạt mã Key"
      subtitle={product ? `${product.name}${product.type === 'POINTS' ? ` · ${product.points} point` : ` · ${product.premiumDays} ngày Premium`}` : undefined}
      footer={result ? <Button label="Xong" onPress={() => { activate.reset(); onClose(); }} /> : <Button label="Kích hoạt" loading={activate.isPending} disabled={!key.trim()} onPress={() => activate.mutate()} />}>
      {result ? (
        <View className="items-center gap-2 py-2">
          <Check size={36} color={colors.success} />
          <Text weight="extrabold" className="text-center text-base text-ink">Kích hoạt thành công</Text>
          <Text className="text-center text-sm text-muted">
            {result.productType === 'POINTS' ? `Đã cộng ${result.pointsGranted} point${result.newBalance !== null ? ` · số dư ${result.newBalance} point` : ''}.` : `Đã thêm ${result.premiumDaysGranted} ngày Premium và ${result.humanGradingCreditsGranted} lượt giáo viên chấm.`}
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            value={key}
            onChangeText={setKey}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Nhập mã Activation Key"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Mã Activation Key"
            className="min-h-14 rounded-2xl px-4 text-base text-ink"
            style={{ borderWidth: 2, borderColor: colors.line, letterSpacing: 1 }}
            onSubmitEditing={() => key.trim() && activate.mutate()}
          />
          {activate.isError ? <View className="mt-3"><FormAlert message={activationErrorMessage(activate.error)} /></View> : null}
        </>
      )}
    </Sheet>
  );
}

/**
 * The examiners who take new work and which of them cannot take more now (full today, or held back by late jobs).
 * Read again whenever `refreshKey` changes, so after a refusal an examiner who just filled up shows as unavailable.
 */
function useExaminerChoices(enabled: boolean, refreshKey: string) {
  return useQuery({
    queryKey: ['practice', 'examiners', refreshKey],
    enabled,
    queryFn: async ({ signal }) => {
      const list = await listExaminers(signal);
      const availability = await getFullExaminers(list.map((item) => item.id), signal).catch(() => ({ full: new Set<string>(), backlog: new Set<string>() }));
      return { list, ...availability };
    },
  });
}

/** Examiners as radio cards: name, photo, band, certificates; a full examiner is shown but cannot be picked. */
function ExaminerChoiceList({ examiners, full, backlog, chosen, busy, onChoose }: { examiners: Examiner[]; full: ReadonlySet<string>; backlog: ReadonlySet<string>; chosen: string | null; busy: boolean; onChoose: (id: string) => void }) {
  return (
    <View className="gap-2">
      {examiners.map((examiner) => {
        const isFull = full.has(examiner.id);
        const active = chosen === examiner.id && !isFull;
        return (
          <Pressable
            key={examiner.id}
            disabled={isFull || busy}
            onPress={() => onChoose(examiner.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled: isFull }}
            className="flex-row gap-3 rounded-2xl p-3"
            style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentSoft : colors.surface, opacity: isFull ? 0.6 : 1 }}>
            <ExaminerAvatar examiner={examiner} />
            <View className="flex-1 gap-0.5">
              <Text weight="extrabold" className="text-base text-ink">{examiner.displayName}</Text>
              {examiner.ieltsBand != null ? <Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>IELTS {examiner.ieltsBand.toFixed(1)}</Text> : null}
              {examiner.certificates.length ? <Text className="text-xs text-muted">{examiner.certificates.map(certificateText).join(' · ')}</Text> : null}
              {examiner.bio ? <Text numberOfLines={3} className="text-xs text-muted">{examiner.bio}</Text> : null}
              <Text weight="bold" className="mt-0.5 text-xs" style={{ color: isFull ? colors.accentWarm : colors.success }}>{isFull ? (backlog.has(examiner.id) ? 'Tạm chưa nhận bài mới' : 'Đã đủ bài hôm nay') : 'Còn nhận bài'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pick the examiner who grades a new essay. */
export function ExaminerPickSheet({ visible, words, minWords, busy, error, onSend, onBack, onClose }: {
  visible: boolean; words: number; minWords: number; busy: boolean; error: string; onSend: (examinerId: string) => void; onBack: () => void; onClose: () => void;
}) {
  const examiners = useExaminerChoices(visible, error);
  const [chosen, setChosen] = useState<string | null>(null);
  const ready = examiners.data;
  const picked = ready?.list.find((item) => item.id === chosen && !ready.full.has(item.id)) ?? null;
  const longEnough = words >= minWords;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissable={!busy}
      title="Chọn giáo viên chấm bài"
      subtitle="Chỉ giáo viên bạn chọn nhận được bài. Giáo viên không thấy tên bạn khi chấm."
      footer={<>
        <Button label={busy ? 'Đang gửi…' : picked ? `Gửi cho ${picked.displayName} · 1 lượt` : 'Chọn một giáo viên'} loading={busy} disabled={!picked || !longEnough} onPress={() => picked && onSend(picked.id)} />
        <Button label="Quay lại" variant="secondary" disabled={busy} onPress={onBack} />
        <Text className="text-center text-xs text-muted">Gửi giáo viên chấm dùng 1 lượt của gói Premium, không trừ point. Bài sẽ được khóa sau khi gửi.</Text>
      </>}>
      {examiners.isPending ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
      {examiners.isError ? <FormAlert message="Chưa tải được danh sách giáo viên. Hãy quay lại và thử lại." /> : null}
      {ready && ready.list.length === 0 ? <Text className="text-sm text-muted">Hiện chưa có giáo viên nào nhận bài. Hãy thử lại sau hoặc chọn AI chấm.</Text> : null}
      {ready ? <ExaminerChoiceList examiners={ready.list} full={ready.full} backlog={ready.backlog} chosen={chosen} busy={busy} onChoose={setChosen} /> : null}
      {!longEnough ? <View className="mt-3"><FormAlert message={`Cần ít nhất ${minWords} từ để gửi giáo viên chấm (hiện có ${words}).`} /></View> : null}
      {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
    </Sheet>
  );
}

/** Replace a late examiner: the essay moves to the new one, who gets 48 hours. No extra credit is spent. */
export function ChangeExaminerSheet({ visible, currentExaminerId, changesLeft, busy, error, onChange, onClose }: {
  visible: boolean; currentExaminerId: string | null; changesLeft: number; busy: boolean; error: string; onChange: (examinerId: string) => void; onClose: () => void;
}) {
  const examiners = useExaminerChoices(visible, error);
  const [chosen, setChosen] = useState<string | null>(null);
  const ready = examiners.data;
  const others = ready?.list.filter((item) => item.id !== currentExaminerId) ?? [];
  const picked = others.find((item) => item.id === chosen && !ready?.full.has(item.id)) ?? null;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissable={!busy}
      title="Đổi giáo viên chấm bài"
      subtitle={`Bài của bạn sẽ chuyển sang giáo viên mới, và giáo viên đó có 48 giờ để chấm. Không mất thêm lượt chấm. Bạn còn ${changesLeft} lần đổi cho bài này.`}
      footer={<Button label={busy ? 'Đang gửi…' : picked ? 'Gửi bài' : 'Chọn một giáo viên'} loading={busy} disabled={!picked} onPress={() => picked && onChange(picked.id)} />}>
      {examiners.isPending ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
      {examiners.isError ? <FormAlert message="Chưa tải được danh sách giáo viên. Hãy thử lại." /> : null}
      {ready && others.length === 0 ? <Text className="text-sm text-muted">Hiện chưa có giáo viên khác nhận bài. Hãy thử lại sau.</Text> : null}
      {ready ? <ExaminerChoiceList examiners={others} full={ready.full} backlog={ready.backlog} chosen={chosen} busy={busy} onChoose={setChosen} /> : null}
      {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
    </Sheet>
  );
}

export function ExaminerAvatar({ examiner, size = 48 }: { examiner: Pick<Examiner, 'displayName' | 'avatarUrl'>; size?: number }) {
  const initials = examiner.displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return examiner.avatarUrl
    ? <Image source={examiner.avatarUrl} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" accessibilityIgnoresInvertColors />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text weight="extrabold" style={{ color: colors.accentDeep }}>{initials}</Text></View>;
}

/** Premium: teacher grading credits and advanced content, activated with a key. */
export function PremiumPlansSheet({ visible, onChoose, onClose }: { visible: boolean; onChoose: (product: ActivationProduct) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<(typeof PREMIUM_PRODUCTS)[number]['code']>('PREMIUM_90D');
  const chosen = PREMIUM_PRODUCTS.find((product) => product.code === selected) ?? PREMIUM_PRODUCTS[1];
  const allowed = keyActivationAllowed();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Gói Premium"
      subtitle="Mở khóa nội dung nâng cao và nhận lượt chấm Writing/Speaking trực tiếp từ giáo viên."
      footer={allowed ? <Button label="Kích hoạt bằng Mã Key" icon={<KeyRound size={18} color={colors.onAccent} />} onPress={() => onChoose(chosen)} /> : <Text className="text-center text-sm text-muted">Kích hoạt gói Premium trên website IELTSPath.</Text>}>
      <View className="flex-row items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: colors.warmSoft }}>
        <Crown size={18} color={colors.accentWarm} />
        <Text className="flex-1 text-sm leading-5 text-ink">Giáo viên chấm cho nhận xét chi tiết và chính xác hơn điểm AI, kèm góp ý riêng cho bài của bạn.</Text>
      </View>
      <View className="mt-3 gap-1.5">
        {['Lượt chấm Writing/Speaking trực tiếp từ giáo viên', 'Toàn bộ bài học, đề thi và tài liệu nâng cao', 'Báo cáo phân tích tiến độ học tập nâng cao'].map((line) => (
          <View key={line} className="flex-row gap-2"><Check size={16} color={colors.success} /><Text className="flex-1 text-sm text-ink">{line}</Text></View>
        ))}
        <Text className="text-sm text-muted">— Không kèm AI Points; AI chấm vẫn trừ điểm trong Ví Point</Text>
      </View>
      <View className="mt-4 flex-row gap-2">
        {PREMIUM_PRODUCTS.map((product) => {
          const active = product.code === selected;
          return (
            <Pressable key={product.code} onPress={() => setSelected(product.code)} accessibilityRole="radio" accessibilityState={{ selected: active }} className="flex-1 gap-1 rounded-2xl p-3" style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentSoft : colors.surface }}>
              {product.featured ? <Text weight="black" className="text-[10px] uppercase" style={{ color: colors.accentWarm }}>Phổ biến nhất</Text> : <View style={{ height: 14 }} />}
              <Text weight="extrabold" className="text-sm text-ink">{product.name}</Text>
              <Text className="text-xs text-muted">{product.premiumDays} ngày Premium</Text>
              <Text className="text-xs text-ink"><Text weight="extrabold">{product.humanGradingCredits}</Text> lượt giáo viên chấm</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-3 text-xs leading-4 text-muted">Lượt chấm giáo viên thuộc chu kỳ Premium đang hoạt động; khi gói hết hạn, lượt chưa dùng sẽ bị hủy.</Text>
    </Sheet>
  );
}
