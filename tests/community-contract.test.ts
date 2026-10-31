import { describe, expect, it, vi } from 'vitest';
vi.mock('@/src/lib/api-client', () => ({ apiRequest: vi.fn(), ApiError: class ApiError extends Error { status = 503; } }));
vi.mock('@/src/lib/image-upload-form', () => ({ imageUploadForm: vi.fn() }));
import { insertMention, notificationHasNext, parseMentionMarkup, parseOffsetPage } from '../src/features/community/api';

describe('community mobile contracts', () => {
  it('preserves Spring offset page metadata for comments and replies', () => {
    const page = parseOffsetPage<{ id: string }>({ content: [{ id: 'a' }], page: 2, size: 20, totalElements: 45, totalPages: 3, last: false }, 0, 20);
    expect(page).toMatchObject({ page: 2, size: 20, totalElements: 45, totalPages: 3, last: false });
    expect(parseOffsetPage([], 0, 20)).toMatchObject({ content: [], page: 0, last: true });
  });
  it('infers notification continuation only from the returned array length', () => {
    expect(notificationHasNext(Array.from({ length: 20 }, () => ({})), 20)).toBe(true);
    expect(notificationHasNext(Array.from({ length: 19 }, () => ({})), 20)).toBe(false);
  });
  it('renders mention labels while keeping UUIDs out of displayed text', () => {
    const parts = parseMentionMarkup('Xin chào @[Nguyễn An](550e8400-e29b-41d4-a716-446655440000)!');
    expect(parts).toEqual([{ text: 'Xin chào ' }, { text: '@Nguyễn An', userId: '550e8400-e29b-41d4-a716-446655440000' }, { text: '!' }]);
    expect(parseMentionMarkup('No mention')[0]).toEqual({ text: 'No mention' });
  });
  it('caps canonical mentions at five', () => {
    const rows = Array.from({ length: 5 }, (_, i) => `@[Member ${i}](550e8400-e29b-41d4-a716-44665544000${i})`).join(' ');
    expect(insertMention(`${rows} @six`, { id: '550e8400-e29b-41d4-a716-446655440006', displayName: 'Six' })).toBeNull();
    expect(insertMention('@na', { id: '550e8400-e29b-41d4-a716-446655440006', displayName: 'Nguyễn An' })).toBe('@[Nguyễn An](550e8400-e29b-41d4-a716-446655440006) ');
  });
});
