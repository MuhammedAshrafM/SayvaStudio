/**
 * `updatedAt` as the Project Picker shows it — readiness ruling RB-3.
 *
 * Compact relative time, the way the drawn Vocabulary grid shows its own
 * Updated column (`2h ago`, `3d ago`, `1w ago`): minutes below an hour, hours
 * below a day, days below a week, weeks from a week onward, each floored.
 * Two parts extend that drawn precedent, and both are canonical in Screens
 * §04: the minute unit, so an edit made moments ago does not read `0h ago`,
 * and weeks with no larger unit above them.
 *
 * Here rather than in a component because AD-07 keeps formatting out of
 * Server Components — its own alternatives rejected "formatting, simple
 * conditionals" inline — and puts decision-worthy presentation work in the
 * Query's View Model assembly. `now` is passed in, from the `Clock` port, so
 * the label is computed once per render and never ticks.
 *
 * Elapsed time is measured in fixed units, not calendar ones: a day is 24
 * hours, a week is seven of them.
 *
 * A timestamp later than `now` — clock skew, or a file edited on a machine
 * whose clock runs ahead — is clamped to zero rather than rendered as a
 * negative age. The design does not cover the case; clamping applies its
 * floor rule and keeps the label from reading as nonsense.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function updatedAgo(updatedAt: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - updatedAt.getTime());

  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d ago`;
  return `${Math.floor(elapsed / WEEK)}w ago`;
}
