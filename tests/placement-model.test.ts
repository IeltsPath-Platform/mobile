import { describe, expect, it } from 'vitest';

import { essayAnswer, groupSections, readEssay, readSpokenSeconds, spokenAnswer } from '@/src/features/placement/model';
import type { TestSection } from '@/src/features/practice/model/sections';

const section = (id: string, sortOrder: number, skill: string): TestSection => ({
  id, sortOrder, partNo: null, startedAt: null, completedAt: null, items: [],
  snapshot: { skill } as TestSection['snapshot'],
});

describe('placement model', () => {
  it('groups consecutive sections of one skill, in test order', () => {
    const groups = groupSections([section('w2', 4, 'WRITING'), section('r', 1, 'READING'), section('w1', 3, 'WRITING'), section('l', 2, 'LISTENING'), section('s', 5, 'speaking')]);
    expect(groups.map((group) => [group.skill, group.sections.map((s) => s.id)])).toEqual([
      ['READING', ['r']], ['LISTENING', ['l']], ['WRITING', ['w1', 'w2']], ['SPEAKING', ['s']],
    ]);
    expect(groups[2].id).toBe('w1');
  });

  it('round-trips an essay through the web parts format and reads web drafts', () => {
    expect(readEssay(essayAnswer('My essay'))).toBe('My essay');
    expect(readEssay(JSON.stringify({ parts: ['Intro', '', 'Body', ' '] }))).toBe('Intro\n\nBody');
    expect(readEssay('plain old draft')).toBe('plain old draft');
    expect(readEssay(undefined)).toBe('');
  });

  it('remembers how long each Speaking answer was', () => {
    expect(readSpokenSeconds(spokenAnswer(42))).toBe(42);
    expect(readSpokenSeconds(undefined)).toBe(0);
    expect(readSpokenSeconds('not json')).toBe(0);
  });
});

describe('minimum words', () => {
  it('reads the count the prompt asks for', async () => {
    const { minimumWords } = await import('@/src/features/placement/model');
    expect(minimumWords('Give reasons for your answer. Write at least 80 words.')).toBe(80);
    expect(minimumWords('Write at least 150 words.')).toBe(150);
    expect(minimumWords('Describe a place.')).toBeNull();
  });
});
