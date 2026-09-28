import { describe, expect, it } from 'vitest';
import { updatedAgo } from './updated-ago.js';

/**
 * RB-3's presentation rule, tested at every boundary it states: the last
 * value of each unit and the first value of the next.
 */

const NOW = new Date('2026-09-28T12:00:00.000Z');
const ago = (ms: number) => updatedAgo(new Date(NOW.getTime() - ms), NOW);

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe('updatedAgo', () => {
  it.each([
    ['just now', 0, '0m ago'],
    ['under a minute', 59 * SECOND, '0m ago'],
    ['a minute', MINUTE, '1m ago'],
    ['the last minute before an hour', HOUR - 1, '59m ago'],
    ['an hour', HOUR, '1h ago'],
    ['five and a half hours, floored', 5 * HOUR + 30 * MINUTE, '5h ago'],
    ['the last moment before a day', DAY - 1, '23h ago'],
    ['a day', DAY, '1d ago'],
    ['three days', 3 * DAY, '3d ago'],
    ['the last moment before a week', WEEK - 1, '6d ago'],
    ['a week', WEEK, '1w ago'],
    ['thirteen days, floored', 13 * DAY, '1w ago'],
    ['two weeks', 2 * WEEK, '2w ago'],
    ['a year — weeks, with no larger unit', 365 * DAY, '52w ago'],
  ])('%s → %s', (_label, elapsed, expected) => {
    expect(ago(elapsed)).toBe(expected);
  });

  it('matches every value the drawn Vocabulary grid shows', () => {
    // The precedent RB-3 follows: 2h, 1d…6d, 1w, 2w.
    expect(ago(2 * HOUR)).toBe('2h ago');
    for (const d of [1, 3, 4, 5, 6]) expect(ago(d * DAY)).toBe(`${d}d ago`);
    expect(ago(1 * WEEK)).toBe('1w ago');
    expect(ago(2 * WEEK)).toBe('2w ago');
  });

  it('never introduces a unit the rule does not name', () => {
    // No months, years, seconds, "just now" or absolute dates.
    const labels = [0, 30 * SECOND, 5 * MINUTE, 3 * HOUR, 2 * DAY, 30 * DAY, 400 * DAY].map(ago);
    for (const label of labels) expect(label).toMatch(/^\d+[mhdw] ago$/);
  });

  it('clamps a timestamp later than now to zero instead of a negative age', () => {
    expect(updatedAgo(new Date(NOW.getTime() + 5 * MINUTE), NOW)).toBe('0m ago');
  });
});
