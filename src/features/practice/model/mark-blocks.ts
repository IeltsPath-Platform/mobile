import { groupItems } from './sections';
import type { TestSection } from './sections';

/** The name of one passage paragraph as a text that can be marked. */
export const paragraphBlock = (sectionId: string, index: number) => `p:${sectionId}:${index}`;

/**
 * Every markable text of a section in reading order: the passage paragraphs, then each group's instructions and its
 * questions as the questions panel lists them. A selection that stretches over several texts follows this order.
 */
export function blockOrderOf(section: TestSection | undefined): string[] {
  if (!section) return [];
  const order = (section.snapshot?.passage?.paragraphs ?? []).map((_, index) => paragraphBlock(section.id, index));
  for (const group of groupItems(section)) {
    if (group.instructions) order.push(`g:${group.key}`);
    for (const item of group.items) if (item.question) order.push(`q:${item.id}`);
  }
  return order;
}
