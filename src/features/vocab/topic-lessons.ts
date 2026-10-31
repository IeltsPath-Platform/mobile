import type { VocabularyTopic } from './api';

const DEFAULT_LESSON_TITLES = [
  'Bắt đầu nào',
  'Làm quen từ mới',
  'Từ vựng thường dùng',
  'Ghi nhớ từ vựng',
  'Dùng từ trong câu',
  'Luyện tập',
  'Mở rộng vốn từ',
  'Thử thách nhỏ',
  'Ôn tập chủ đề',
];

const LESSON_TITLES: Record<string, string[]> = {
  education: ['Bắt đầu nào', 'Môn học', 'Trong lớp học', 'Bài tập và hạn nộp', 'Kỳ thi', 'Đại học', 'Học bổng', 'Nghiên cứu', 'Ôn tập Giáo dục'],
  environment: ['Bắt đầu nào', 'Thiên nhiên', 'Ô nhiễm', 'Biến đổi khí hậu', 'Năng lượng tái tạo', 'Bảo vệ môi trường', 'Tài nguyên', 'Phát triển bền vững', 'Ôn tập Môi trường'],
  technology: ['Bắt đầu nào', 'Thiết bị', 'Internet và ứng dụng', 'Phần mềm', 'Trí tuệ nhân tạo', 'Dữ liệu', 'Công nghệ trong đời sống', 'Đổi mới sáng tạo', 'Ôn tập Công nghệ'],
  health: ['Bắt đầu nào', 'Cơ thể và sức khỏe', 'Triệu chứng', 'Dinh dưỡng', 'Vận động', 'Sức khỏe tinh thần', 'Đi khám bệnh', 'Thói quen lành mạnh', 'Ôn tập Sức khỏe'],
  'work-business': ['Bắt đầu nào', 'Nghề nghiệp', 'Nơi làm việc', 'Tìm việc', 'Lương và phúc lợi', 'Kinh doanh', 'Cuộc họp', 'Thành công trong công việc', 'Ôn tập Công việc'],
  society: ['Bắt đầu nào', 'Cộng đồng', 'Gia đình và xã hội', 'Đời sống thường ngày', 'Vấn đề xã hội', 'Dịch vụ công', 'Con người và văn hóa', 'Thay đổi xã hội', 'Ôn tập Xã hội'],
  restaurant: ['Bắt đầu nào', 'Bắt đầu cuộc trò chuyện', 'Các món ăn phổ biến', 'Đồ uống', 'Gọi món', 'Nói chuyện với nhân viên phục vụ', 'Đặt bàn', 'Thanh toán hóa đơn', 'Luyện tập tại nhà hàng'],
  greetings: ['Bắt đầu nào', 'Cách xưng hô lịch sự', 'Luyện tập giao tiếp', 'Về gia đình', 'Từ vựng thường dùng', 'Nơi ở của bạn', 'Luyện từ vựng', 'Thêm từ vựng', 'Luyện tập tổng hợp'],
  data: ['Bắt đầu nào', 'Tăng và giảm', 'So sánh số liệu', 'Tỷ lệ và phần trăm', 'Mô tả xu hướng', 'Đỉnh và đáy', 'Dữ liệu theo thời gian', 'Viết câu mô tả', 'Ôn tập biểu đồ'],
  argument: ['Bắt đầu nào', 'Nêu quan điểm', 'Đồng ý và phản đối', 'Nguyên nhân và kết quả', 'So sánh ý tưởng', 'Đưa ví dụ', 'Từ nối học thuật', 'Xây dựng lập luận', 'Ôn tập lập luận'],
  science: ['Bắt đầu nào', 'Nhà khoa học', 'Thí nghiệm', 'Nghiên cứu', 'Dữ liệu và kết quả', 'Phát hiện mới', 'Phương pháp khoa học', 'Ứng dụng nghiên cứu', 'Ôn tập Khoa học'],
  government: ['Bắt đầu nào', 'Chính phủ', 'Luật pháp', 'Quyền và trách nhiệm', 'Chính sách công', 'Tòa án', 'Bầu cử', 'Công dân và nhà nước', 'Ôn tập Pháp luật'],
  travel: ['Bắt đầu nào', 'Lên kế hoạch chuyến đi', 'Phương tiện di chuyển', 'Đặt phòng', 'Khám phá điểm đến', 'Truyền thông và tin tức', 'Kể về trải nghiệm', 'Từ vựng du lịch', 'Ôn tập Du lịch'],
};

export type VocabularyTopicLesson = {
  id: string;
  title: string;
  sortOrder: number;
  wordPage: number;
  wordPageSize: number;
  wordCount: number;
};

function titlesForTopic(topic: VocabularyTopic): string[] {
  const slug = topic.slug.toLowerCase();
  const name = `${topic.name} ${topic.nameVi}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (slug.includes('restaurant') || slug.includes('dining') || name.includes('nha hang')) return LESSON_TITLES.restaurant;
  if (slug.includes('greet') || slug.includes('basic-communication') || name.includes('chao hoi') || name.includes('giao tiep co ban')) return LESSON_TITLES.greetings;
  if (slug.includes('education') || name.includes('giao duc')) return LESSON_TITLES.education;
  if (slug.includes('environment') || name.includes('moi truong')) return LESSON_TITLES.environment;
  if (slug.includes('technology') || name.includes('cong nghe')) return LESSON_TITLES.technology;
  if (slug.includes('health') || name.includes('suc khoe')) return LESSON_TITLES.health;
  if (slug.includes('work') || slug.includes('business') || name.includes('kinh te') || name.includes('viec lam') || name.includes('cong viec')) return LESSON_TITLES['work-business'];
  if (slug.includes('society') || name.includes('xa hoi')) return LESSON_TITLES.society;
  if (slug.includes('data') || name.includes('mo ta so lieu')) return LESSON_TITLES.data;
  if (slug.includes('argument') || slug.includes('linker') || name.includes('lap luan') || name.includes('tu noi')) return LESSON_TITLES.argument;
  if (slug.includes('science') || slug.includes('research') || name.includes('khoa hoc') || name.includes('nghien cuu')) return LESSON_TITLES.science;
  if (slug.includes('government') || slug.includes('law') || name.includes('chinh phu') || name.includes('phap luat')) return LESSON_TITLES.government;
  if (slug.includes('travel') || slug.includes('media') || name.includes('du lich') || name.includes('truyen thong')) return LESSON_TITLES.travel;
  return DEFAULT_LESSON_TITLES;
}

/** Build a nine-step mobile lesson path from the topic's existing word catalog. */
export function createVocabularyTopicLessons(topic: VocabularyTopic): VocabularyTopicLesson[] {
  const totalWords = Math.max(0, topic.wordCount);
  const lessonCount = Math.min(9, totalWords);
  if (lessonCount === 0) return [];
  const wordsPerLesson = Math.ceil(totalWords / lessonCount);
  const titles = titlesForTopic(topic);
  return Array.from({ length: lessonCount }, (_, index) => ({
    id: `${topic.id}:lesson:${index + 1}`,
    title: titles[index] ?? `Bài luyện ${index + 1}`,
    sortOrder: index + 1,
    wordPage: index,
    wordPageSize: wordsPerLesson,
    wordCount: Math.min(wordsPerLesson, totalWords - index * wordsPerLesson),
  }));
}
