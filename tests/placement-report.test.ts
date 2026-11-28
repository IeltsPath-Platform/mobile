import { describe, expect, it } from 'vitest';

import { bandStep, daysUntil, feasibility, formatExamMonth, hoursPerWeek, monthToExamDate, stepLabel, upcomingMonths } from '@/src/features/placement/report';

const now = new Date(2026, 10, 28); // 28/11/2026

describe('placement report', () => {
  it('places a band on the chart, clamping to its ends', () => {
    expect(bandStep(1)).toBe(5.5);
    expect(bandStep(6.3)).toBe(6.5);
    expect(bandStep(9)).toBe(8);
    expect(stepLabel(5.5)).toBe('≤5.5');
    expect(stepLabel(8)).toBe('≥8.0');
    expect(stepLabel(7)).toBe('7.0');
  });

  it('turns survey answers into dates and hours', () => {
    expect(upcomingMonths(now)[0]).toEqual({ label: 'Tháng 12/2026', value: '2026-12' });
    expect(monthToExamDate('2027-02')).toBe('2027-02-28');
    expect(formatExamMonth('2027-02-28')).toBe('Tháng 2/2027');
    expect(formatExamMonth(null)).toBe('Chưa xác định');
    expect(hoursPerWeek(90)).toBe(10.5);
    expect(daysUntil('2026-12-31', now)).toBe(33);
    expect(daysUntil('2026-01-01', now)).toBeNull();
  });

  it('judges whether the goal fits the time left', () => {
    expect(feasibility(5, null, now).tone).toBe('none');
    expect(feasibility(7, { targetBand: 6.5, examDate: null, availableMinutesPerDay: 90 }, now).tone).toBe('done');
    // 1 band at 10.5 h/week ≈ 3.3 months: fits a year, not a month.
    expect(feasibility(6, { targetBand: 7, examDate: '2027-11-30', availableMinutesPerDay: 90 }, now).tone).toBe('ok');
    expect(feasibility(6, { targetBand: 7, examDate: '2026-12-31', availableMinutesPerDay: 90 }, now).tone).toBe('tight');
    expect(feasibility(6, { targetBand: 7, examDate: null, availableMinutesPerDay: 90 }, now).text).toContain('4 tháng');
  });
});
