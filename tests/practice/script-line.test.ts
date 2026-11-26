import { describe, expect, it } from 'vitest';

import { scriptRows } from '../../src/features/practice/model/script-line';

describe('scriptRows', () => {
  it('names a speaker only when the speaker changes and colours speakers in order of appearance', () => {
    const rows = scriptRows(['Receptionist: Hello.', 'Receptionist: How can I help?', 'Caller: I want to book.', 'Receptionist: Of course.']);
    expect(rows.map((row) => row.showName)).toEqual([true, false, true, true]);
    expect(rows.map((row) => row.tone)).toEqual([0, 0, 1, 0]);
    expect(rows[0]).toMatchObject({ speaker: 'Receptionist', offset: 14 });
  });

  it('leaves a line without a speaker plain', () => {
    expect(scriptRows(['The talk begins here.'])[0]).toEqual({ speaker: null, offset: 0, showName: false, tone: null });
  });
});
