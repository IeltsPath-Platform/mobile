# Task: Fix Flashcards + Redesign Progress UI

Đọc toàn bộ file được đề cập trước khi sửa. Thực hiện tuần tự từng phần.

---

## Phần 1 – Thẻ từ: Tại sao không mở được thẻ nào

### Nguyên nhân gốc rễ

Tab "Thẻ từ" (`app/(tabs)/flashcards.tsx`) hiển thị danh sách **bộ thẻ (decks)**
được tạo thủ công qua `vocabApi.listDecks()` → `GET /api/learning-support/decks`.

Người dùng mới **chưa có deck nào** nên list rỗng → không có gì để bấm vào.

Luồng học thẻ hiện tại:
```
Tab Thẻ từ → chọn deck → /flashcards/deck/[deckId] → /flashcards/[deckId] (ôn thẻ)
```

Nhưng **không có flow nào tự động tạo deck từ từ vựng hệ thống**.
Backend đã có `notebookApi` với endpoint `/api/learning-support/flashcards/notebook/entries`
chứa các từ người dùng đã lưu, nhưng tab chính lại dùng hệ thống deck thủ công.

### Giải pháp

Thêm vào header của `app/(tabs)/flashcards.tsx` một **banner "Thẻ Sổ Từ" nổi bật**
trỏ thẳng vào `/flashcards/study` (ôn tất cả thẻ notebook đến hạn) và `/flashcards/notebook`
(xem sổ từ), **song song** với hệ thống deck hiện có.

**Sửa `app/(tabs)/flashcards.tsx`:**

Phần `ListHeaderComponent`, sau banner "thẻ đến hạn" hiện tại (warmSoft background),
thêm một card mới **"Sổ từ của bạn"** nếu user đã đăng nhập:

```tsx
// Thêm query này vào top của component (cạnh các query hiện có):
const notebookSummary = useQuery({
  queryKey: ['flashcards', 'notebook', 'summary-brief'],
  queryFn: () => notebookApi.summary(Intl.DateTimeFormat().resolvedOptions().timeZone),
  enabled,
  staleTime: 60_000,
});
```

```tsx
// Import thêm ở đầu file:
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { BookMarked } from 'lucide-react-native';
```

```tsx
// Thêm card này vào ListHeaderComponent, SAU banner warmSoft hiện có (dòng 35-38),
// TRƯỚC phần flex-row gap-3 (nút Sổ từ / Tiến độ):
{enabled && notebookSummary.data && notebookSummary.data.total > 0 ? (
  <Pressable
    accessibilityRole="button"
    onPress={() => router.push('/flashcards/notebook')}
    className="rounded-2xl border border-line bg-surface p-4"
  >
    <View className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.accentSoft }}>
        <BookMarked size={21} color={colors.accentDeep} />
      </View>
      <View className="flex-1">
        <Text weight="bold">Sổ từ của bạn</Text>
        <Text className="mt-0.5 text-sm text-muted">
          {notebookSummary.data.total} từ đã lưu
          {notebookSummary.data.dueNow > 0 ? ` · ${notebookSummary.data.dueNow} từ cần ôn` : ''}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </View>
    {notebookSummary.data.dueNow > 0 ? (
      <Pressable
        accessibilityRole="button"
        onPress={(e) => { e.stopPropagation?.(); router.push('/flashcards/study'); }}
        className="mt-3 h-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.accent }}
      >
        <Text weight="bold" className="text-sm text-white">
          Ôn {notebookSummary.data.dueNow} từ ngay →
        </Text>
      </Pressable>
    ) : null}
  </Pressable>
) : null}
```

**Kết quả:** Người dùng sẽ thấy ngay "Sổ từ của bạn" dẫn vào notebook/study
mà không cần tạo deck thủ công.

---

## Phần 2 – Màn hình Tiến độ: Làm lại UI

### Vấn đề hiện tại

**A. `app/progress.tsx`** — quá đơn giản: chỉ có `<ProgressSummary />` + 1 nút.
Không có thông tin gì hữu ích, thiếu visual.

**B. `src/features/progress/progress-summary.tsx`** — layout thô:
- 3 con số (XP, Level, Streak) đặt flat trên 1 row, không có hierarchy
- Progress bar ngày hôm nay quá nhỏ, khó nhìn
- Không có hướng dẫn hành động tiếp theo
- `compact` variant dùng trong account screen cũng thiếu visual

**C. `app/flashcards/progress.tsx`** — toàn bộ content là text thuần, không có
visual progress bars, số liệu khó đọc, collapse panel dùng ký tự ▴▾ ASCII xấu.

### Việc cần làm

#### 2A. Làm lại `src/features/progress/progress-summary.tsx`

**Non-compact variant** (dùng trong `/progress`):

```tsx
// Thay thế toàn bộ return của non-compact bằng layout mới:

return (
  <View className="mt-5 gap-4">
    {/* Row 3 chỉ số lớn */}
    <View className="flex-row gap-3">
      <View className="flex-1 items-center rounded-3xl border border-line bg-surface py-5">
        <Sparkles size={20} color={colors.accentDeep} />
        <Text weight="black" className="mt-2 text-3xl text-accent-deep">
          {progress.data?.totalXp ?? '—'}
        </Text>
        <Text className="mt-1 text-xs text-muted">Tổng XP</Text>
      </View>
      <View className="flex-1 items-center rounded-3xl border border-line bg-surface py-5">
        <Trophy size={20} color={colors.accentDeep} />
        <Text weight="black" className="mt-2 text-3xl text-accent-deep">
          {progress.data?.level ?? '—'}
        </Text>
        <Text className="mt-1 text-xs text-muted">Cấp độ</Text>
      </View>
      <View className="flex-1 items-center rounded-3xl py-5" style={{ backgroundColor: colors.warmSoft }}>
        <Flame size={20} color={colors.accentWarm} />
        <Text weight="black" className="mt-2 text-3xl" style={{ color: colors.accentWarm }}>
          {streak.currentDays ?? '—'}
        </Text>
        <Text className="mt-1 text-xs text-muted">Ngày streak</Text>
      </View>
    </View>

    {/* Daily XP progress */}
    {progress.data ? (
      <View className="rounded-3xl border border-line bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text weight="bold">Hôm nay</Text>
          <Text weight="extrabold" className="text-accent-deep">
            {progress.data.xpToday} / {progress.data.dailyCap} XP
          </Text>
        </View>
        <View className="mt-3 h-3 overflow-hidden rounded-full bg-canvas">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, Math.round((progress.data.xpToday / Math.max(progress.data.dailyCap, 1)) * 100)))}%`,
              backgroundColor: colors.accent,
            }}
          />
        </View>
        <Text className="mt-2 text-xs text-muted">
          Còn {Math.max(0, progress.data.dailyCap - progress.data.xpToday)} XP để đạt mục tiêu hôm nay
        </Text>
        <View className="mt-3 h-px bg-line" />
        <Text className="mt-3 text-sm text-muted">
          Còn <Text weight="bold" className="text-ink">{progress.data.xpToNextLevel} XP</Text> đến cấp tiếp theo
        </Text>
        {streak.longestDays ? (
          <Text className="mt-1 text-sm text-muted">
            Kỷ lục: <Text weight="bold" className="text-ink">{streak.longestDays} ngày</Text> liên tiếp
          </Text>
        ) : null}
      </View>
    ) : null}

    {/* Error / loading states */}
    {progress.isError || streak.error ? (
      <View className="gap-2">
        <Text className="text-sm text-danger">Chưa tải được một phần tiến độ.</Text>
        <Button variant="secondary" label="Thử lại" onPress={() => { void progress.refetch(); void streak.refetch(); }} />
      </View>
    ) : null}
    {!progress.data && !progress.isError ? (
      <Text className="text-center text-sm text-muted">
        {progress.isFetching ? 'Đang tải tiến độ…' : 'Đăng nhập để xem tiến độ đã đồng bộ.'}
      </Text>
    ) : null}
  </View>
);
```

**Compact variant** (dùng trong account screen) — giữ gần như cũ nhưng:
- Nút "Chi tiết →" đổi thành Pressable rõ ràng hơn với icon `ChevronRight`
- Progress bar ngày hôm nay dày hơn (`h-2` thay `h-1.5`)
- Thêm label "Hôm nay" trước progress bar

#### 2B. Làm lại `app/progress.tsx`

```tsx
// Thay thế toàn bộ nội dung:
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ProgressSummary } from '@/src/features/progress/progress-summary';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { colors } from '@/src/theme';

export default function ProgressScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center gap-2 px-5 pt-4 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/account')}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-canvas"
          >
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text weight="black" className="text-2xl">Tiến độ học tập</Text>
        </View>

        <View className="px-5">
          <Text className="text-sm text-muted">Từng ngày một, bạn đang tiến xa hơn.</Text>
          <ProgressSummary />
          <View className="mt-6">
            <Button label="Tiếp tục học ngay" onPress={() => router.push('/(tabs)')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

#### 2C. Làm lại `app/flashcards/progress.tsx`

Cải thiện visual của các panel:

**1. Thay `const panel = 'mb-4 gap-3 rounded-2xl border border-line bg-surface p-4'`**
bằng:
```tsx
const panel = 'mb-4 gap-3 rounded-3xl border border-line bg-surface p-4';
```

**2. Panel "Sổ từ của bạn"** — thêm visual progress cho từng level:

Sau `{summary.data ? <>...` thêm visual 4 level (UNKNOWN/FAMILIAR/LEARNING/MASTERED)
thay vì 2 dòng text thuần:

```tsx
{summary.data ? (
  <>
    {/* Row chỉ số chính */}
    <View className="flex-row gap-3">
      <View className="flex-1 items-center rounded-2xl bg-canvas py-3">
        <Text weight="black" className="text-2xl text-accent-deep">{summary.data.total}</Text>
        <Text className="mt-0.5 text-xs text-muted">Tổng từ</Text>
      </View>
      <View className="flex-1 items-center rounded-2xl py-3" style={{ backgroundColor: colors.successSoft }}>
        <Text weight="black" className="text-2xl" style={{ color: colors.success }}>{summary.data.masteredCount}</Text>
        <Text className="mt-0.5 text-xs text-muted">Đã thuộc</Text>
      </View>
      <View className="flex-1 items-center rounded-2xl bg-canvas py-3">
        <Text weight="black" className="text-2xl text-accent-deep">{summary.data.dueNow}</Text>
        <Text className="mt-0.5 text-xs text-muted">Cần ôn</Text>
      </View>
    </View>
    {/* Mini stats */}
    <Text className="text-sm text-muted">
      Hôm nay: {summary.data.reviewedToday} lượt ôn · 7 ngày qua: +{summary.data.addedLast7Days} từ
    </Text>
  </>
) : null}
```

**3. Panel "Mục tiêu tuần"** — thanh progress thay vì chỉ text:

Sau `{goal.data ? <>` thêm thanh progress bar:

```tsx
{goal.data ? (
  <>
    <View className="flex-row items-end justify-between">
      <Text weight="extrabold" className="text-2xl text-accent-deep">
        {goal.data.progress}
        <Text className="text-base text-muted">/{goal.data.target} từ</Text>
      </Text>
      <Text className="mb-1 text-sm text-muted">
        {goal.data.remaining > 0 ? `Còn ${goal.data.remaining} từ` : '✓ Đạt mục tiêu!'}
      </Text>
    </View>
    <View className="h-2.5 overflow-hidden rounded-full bg-canvas">
      <View
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, Math.round((goal.data.progress / Math.max(goal.data.target, 1)) * 100)))}%`,
          backgroundColor: colors.accent,
        }}
      />
    </View>
    {/* 7 ngày trong tuần */}
    <View className="flex-row justify-between pt-1">
      {goal.data.days.map((day, index) => (
        <View key={day.date} className="items-center gap-1">
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: day.achieved ? colors.accentSoft : colors.canvas }}
          >
            <Text
              weight="bold"
              className="text-[11px]"
              style={{ color: day.achieved ? colors.accentDeep : colors.muted }}
            >
              {day.achieved ? '✓' : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
            </Text>
          </View>
          {!day.achieved ? (
            <Text className="text-[9px] text-muted">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  </>
) : null}
```

**4. Panel "Bản đồ trình độ từ vựng"** — thêm progress bar mỗi band:

Trong `{map.data?.bands.map((band) => ...}`, thêm progress bar sau text:
```tsx
<View key={band.cefr} className="gap-1 border-t border-line pt-3">
  <View className="flex-row items-center justify-between">
    <Text weight="bold">{band.cefr} · {band.band}</Text>
    <Text className="text-xs text-muted">{band.learned}/{band.total}</Text>
  </View>
  <View className="h-1.5 overflow-hidden rounded-full bg-canvas">
    <View
      className="h-full rounded-full"
      style={{
        width: `${Math.max(0, Math.min(100, Math.round((band.learned / Math.max(band.total, 1)) * 100)))}%`,
        backgroundColor: colors.accent,
      }}
    />
  </View>
  <Text className="text-xs text-muted">Cần ôn {band.needsReview}</Text>
</View>
```

**5. Collapsible panels** — thay ký tự ASCII `▴▾` bằng icon Lucide:

```tsx
// Import thêm: import { ChevronDown } from 'lucide-react-native';
// Thay '▴' và '▾' bằng:
<ChevronDown
  size={16}
  color={colors.muted}
  style={{ transform: [{ rotate: mapOpen ? '180deg' : '0deg' }] }}
/>
```

Áp dụng tương tự cho `achievementsOpen` và `setsOpen`.

**6. Tiến độ theo chủ đề** — progress bar cho từng topic đã có ở renderItem,
thêm màu xanh rõ hơn và padding đều:

```tsx
// renderItem hiện có, chỉ tăng padding và làm progress bar dày hơn:
renderItem={({ item }) => (
  <Pressable
    accessibilityRole="button"
    onPress={() => router.push({ pathname: '/flashcards/notebook', params: { topicId: item.topicId, ...(selectedSet ? { setId: selectedSet.id } : {}), title: item.name } })}
    className="mb-3 gap-2 rounded-3xl border border-line bg-surface p-4"
  >
    <View className="flex-row items-center justify-between">
      <Text weight="bold" className="flex-1 mr-2" numberOfLines={1}>{item.name}</Text>
      <Text weight="bold" className="text-sm text-accent-deep">{item.percent}%</Text>
    </View>
    <Text className="text-sm text-muted">{item.learned}/{item.total} từ đã học</Text>
    <View className="h-2 overflow-hidden rounded-full bg-canvas">
      <View
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, item.percent))}%`,
          backgroundColor: item.percent >= 100 ? colors.success : colors.accent,
        }}
      />
    </View>
  </Pressable>
)}
```

---

## Checklist sau khi hoàn thành

- [ ] Tab "Thẻ từ" hiển thị card "Sổ từ của bạn" khi user đã có từ trong notebook
- [ ] Nút "Ôn N từ ngay →" trong card dẫn thẳng vào study session
- [ ] `app/progress.tsx` có header đẹp với back button
- [ ] `ProgressSummary` non-compact có 3 card chỉ số + daily progress bar rõ ràng
- [ ] `flashcards/progress.tsx` có progress bars cho weekly goal + bands
- [ ] 7 ngày trong tuần hiển thị bằng vòng tròn thay ký tự ▴▾
- [ ] Collapsible dùng ChevronDown icon thay ký tự ASCII
- [ ] Không có TypeScript error mới sau khi sửa
