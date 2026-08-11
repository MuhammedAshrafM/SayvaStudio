import { describe, expect, it } from 'vitest';
import { cn } from './cn.js';

describe('cn', () => {
  it('keeps classes that do not conflict', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('resolves a Tailwind conflict in favour of the last class', () => {
    // Without twMerge this returns 'p-2 p-4' and which one applies depends
    // on stylesheet order, not on argument order.
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('only treats classes as conflicting when they target the same property', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    expect(cn('text-sm', 'text-center')).toBe('text-sm text-center');
  });

  it('flattens the conditional shapes a component produces', () => {
    // Written as a real component would: the conditionals come from props,
    // not from literals, so this exercises the branch clsx actually sees.
    const classesFor = (isDisabled: boolean, isActive: boolean) =>
      cn('base', isDisabled && 'skipped', ['array'], { on: isActive, off: isDisabled });

    expect(classesFor(false, true)).toBe('base array on');
    expect(classesFor(true, false)).toBe('base skipped array off');
  });

  it('drops nullish input rather than emitting "undefined"', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it("lets a caller's className override the component default", () => {
    // The contract every primitive relies on: `cn(componentDefaults, props.className)`
    // must let the caller win, or `className` is not an escape hatch at all.
    const componentDefault = 'rounded-sm bg-white';
    const callerOverride = 'bg-transparent';
    expect(cn(componentDefault, callerOverride)).toBe('rounded-sm bg-transparent');
  });
});
