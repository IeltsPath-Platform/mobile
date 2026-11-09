import type { LessonDetailDto } from '@/src/features/learning/types';

import type { SessionBlock } from './types';

export function passageExcerpt(passage: string, max = 280): string {
  const flat = passage.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(' '));
  return `${cut.slice(0, stop > 80 ? stop : max).trim()}…`;
}

/**
 * Every EXERCISE block, in sort order, with every question in that block.
 * Submit one block at a time so a multi-block lesson can reach lessonCompleted.
 */
export function sessionFromLesson(lesson: LessonDetailDto): { blocks: SessionBlock[] } {
  const asset = lesson.blocks.find((block) => block.blockType === 'ASSET' && block.passage);
  const excerpt = asset?.passage ? passageExcerpt(asset.passage) : undefined;
  const blocks = lesson.blocks
    .filter((block) => block.blockType === 'EXERCISE')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block) => ({
      blockId: block.blockId,
      questions: (block.questions ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((question) => ({
          id: question.questionVersionId,
          stem: question.stem,
          options: question.options,
          passageExcerpt: excerpt,
        })),
    }))
    .filter((block) => block.questions.length > 0);
  return { blocks };
}
