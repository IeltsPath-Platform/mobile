// Ported from frontend/src/features/learning-path/placement/{placementReport.ts,PlacementSurvey.tsx}. Keep in step with the web.
import type { LearningGoal } from './api';

/* ---------- The goal survey ---------- */

export const MINUTE_CHOICES = [
  { label: 'Dưới 1 tiếng', value: 45 },
  { label: 'Khoảng 1 – 2 tiếng', value: 90 },
  { label: 'Khoảng 2 – 3 tiếng', value: 150 },
  { label: 'Trên 3 tiếng', value: 210 },
] as const;

export const TARGET_CHOICES = [
  { label: 'Dưới 5.5', value: 5.5 },
  { label: '6.0', value: 6 },
  { label: '6.5', value: 6.5 },
  { label: '7.0', value: 7 },
  { label: '7.5', value: 7.5 },
  { label: '8.0 trở lên', value: 8 },
] as const;

/** The six months after the current one, as `yyyy-mm`. */
export function upcomingMonths(from = new Date()) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth() + index + 1, 1);
    const month = date.getMonth() + 1;
    return { label: `Tháng ${month}/${date.getFullYear()}`, value: `${date.getFullYear()}-${String(month).padStart(2, '0')}` };
  });
}

/** Last day of a `yyyy-mm` month: a planned exam month counts as a future date for the whole month. */
export function monthToExamDate(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

export const formatExamMonth = (examDate: string | null) => {
  if (!examDate) return 'Chưa xác định';
  const [year, month] = examDate.split('-');
  return `Tháng ${Number(month)}/${year}`;
};

/* ---------- The report ---------- */

/** The band columns of the feasibility chart; the ends stand for "or below" and "or above". */
export const BAND_STEPS = [5.5, 6, 6.5, 7, 7.5, 8] as const;

/** The chart column a band falls in. */
export function bandStep(band: number): number {
  const rounded = Math.round(band * 2) / 2;
  return Math.min(BAND_STEPS[BAND_STEPS.length - 1], Math.max(BAND_STEPS[0], rounded));
}

export const stepLabel = (step: number) =>
  step === BAND_STEPS[0] ? `≤${step.toFixed(1)}` : step === BAND_STEPS[BAND_STEPS.length - 1] ? `≥${step.toFixed(1)}` : step.toFixed(1);

export const CRITERION_NAMES: Record<string, string> = {
  TA: 'Task Achievement',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammatical Range & Accuracy',
};

/** Whole days from today to the exam date, or null when none was picked or it has passed. */
export function daysUntil(examDate: string | null, now = new Date()): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  return Number.isFinite(days) && days >= 0 ? days : null;
}

export const hoursPerWeek = (minutesPerDay: number) => Math.round((minutesPerDay * 7) / 60 * 2) / 2;

export type Feasibility = { tone: 'none' | 'done' | 'ok' | 'tight'; text: string; tip: string };

/**
 * A rough reading of how reachable the target is: about 2.5 months of study per half band at 7 hours a week, scaled
 * by the hours the learner set aside. It is a rule of thumb to frame the advice, not a prediction.
 */
export function feasibility(overall: number, goal: LearningGoal | null, now = new Date()): Feasibility {
  if (!goal) {
    return {
      tone: 'none',
      text: 'Bạn chưa đặt band mục tiêu nên chưa đánh giá được khả năng đạt mục tiêu.',
      tip: 'Đặt mục tiêu và thời gian học để báo cáo có lộ trình phù hợp hơn.',
    };
  }
  const gap = goal.targetBand - overall;
  if (gap <= 0) {
    return {
      tone: 'done',
      text: `Band hiện tại đã đạt mục tiêu ${goal.targetBand.toFixed(1)}. Bạn có thể đặt mục tiêu cao hơn hoặc luyện đề để giữ phong độ.`,
      tip: 'Luyện đề full test theo thời gian thật để quen áp lực phòng thi.',
    };
  }
  const hours = Math.max(1, hoursPerWeek(goal.availableMinutesPerDay));
  const monthsNeeded = (gap / 0.5) * 2.5 * Math.min(2, Math.max(0.5, 7 / hours));
  const days = daysUntil(goal.examDate, now);
  const monthsLeft = days === null ? null : days / 30;
  const base = overall < 5.5
    ? 'Band hiện tại của bạn đang ở mức nền tảng. Hãy chắc ngữ pháp, từ vựng và phát âm cơ bản trước; khi nền tảng vững, luyện IELTS sẽ nhanh hơn nhiều.'
    : `Bạn cần tăng thêm khoảng ${gap.toFixed(1)} band để đạt mục tiêu ${goal.targetBand.toFixed(1)}.`;
  if (monthsLeft === null) {
    return {
      tone: 'ok',
      text: `${base} Với ${hours} giờ/tuần, bạn cần khoảng ${Math.ceil(monthsNeeded)} tháng học đều đặn.`,
      tip: 'Chọn ngày thi dự kiến để đánh giá mục tiêu sát hơn.',
    };
  }
  const tight = monthsNeeded > monthsLeft;
  return {
    tone: tight ? 'tight' : 'ok',
    text: tight
      ? `${base} Với ${hours} giờ/tuần, bạn cần khoảng ${Math.ceil(monthsNeeded)} tháng trong khi chỉ còn khoảng ${Math.max(1, Math.round(monthsLeft))} tháng, nên mục tiêu khá gấp.`
      : `${base} Với ${hours} giờ/tuần, khoảng ${Math.ceil(monthsNeeded)} tháng là đủ, nằm trong thời gian bạn còn lại.`,
    tip: tight
      ? 'Tăng thời gian học mỗi ngày hoặc lùi ngày thi, và ưu tiên kỹ năng có band thấp nhất trước.'
      : 'Giữ lịch học đều mỗi ngày và làm lại bài kiểm tra sau mỗi chặng để đo tiến bộ.',
  };
}

/** Speaking is not graded from recordings with comments yet; the report shows this general guidance in its place. */
export const SPEAKING_REVIEW = [
  { criterion: 'Fluency & Coherence', comment: 'Trả lời đủ ý thay vì một câu ngắn rồi dừng. Phát triển theo công thức Nêu ý → Giải thích → Ví dụ, dùng từ nối để dẫn dắt mạch lạc.' },
  { criterion: 'Lexical Resource', comment: 'Tránh lặp các từ quá cơ bản như "good", "interesting", "like". Dùng từ đồng nghĩa và cụm từ tự nhiên theo chủ đề.' },
  { criterion: 'Grammatical Range & Accuracy', comment: 'Kết hợp câu đơn với câu phức (mệnh đề quan hệ, mệnh đề trạng ngữ). Chú ý thì của động từ và dạng từ.' },
  { criterion: 'Pronunciation', comment: 'Bật rõ âm cuối (/s/, /z/, /t/, /d/) và nhấn vào từ mang nội dung chính để giọng nói có ngữ điệu.' },
] as const;

/** One plain sentence beside the overall band, in the words a learner would use. */
export function placementVerdict(band: number | null): string {
  if (band == null) return 'Chưa đủ phần đã chấm để tính band tổng.';
  if (band < 4) return 'Bạn đang ở mức làm quen với tiếng Anh.';
  if (band < 5.5) return 'Bạn hiểu được ý chính trong tình huống quen thuộc.';
  if (band < 7) return 'Bạn dùng tiếng Anh khá ổn, còn lỗi ở chỗ phức tạp.';
  return 'Bạn dùng tiếng Anh tốt và linh hoạt.';
}
