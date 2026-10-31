import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOpenArrival,
  consumeOpenArrival,
  isOpenArrival,
  markOpenArrival,
} from './open-arrival';

/**
 * The in-memory, one-shot mark that tells the Workspace Entry an arrival
 * came from the Picker's Open. Module state, so every test leaves it clear.
 */

const A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

afterEach(() => {
  clearOpenArrival();
});

describe('the Open arrival mark', () => {
  it('is absent until Open sets it — a direct navigation finds nothing', () => {
    expect(isOpenArrival(A)).toBe(false);
    expect(consumeOpenArrival(A)).toBe(false);
  });

  it('names the Project Open marked', () => {
    markOpenArrival(A);
    expect(isOpenArrival(A)).toBe(true);
  });

  it('is read without being cleared', () => {
    markOpenArrival(A);
    isOpenArrival(A);
    expect(isOpenArrival(A)).toBe(true);
  });

  it('is consumed once, for its own Project', () => {
    markOpenArrival(A);

    expect(consumeOpenArrival(A)).toBe(true);
    expect(consumeOpenArrival(A)).toBe(false);
    expect(isOpenArrival(A)).toBe(false);
  });

  it('does not match, and is not consumed by, another Project', () => {
    markOpenArrival(A);

    expect(isOpenArrival(B)).toBe(false);
    expect(consumeOpenArrival(B)).toBe(false);
    expect(isOpenArrival(A)).toBe(true);
  });

  it('holds one Project at a time — a later Open replaces it', () => {
    markOpenArrival(A);
    markOpenArrival(B);

    expect(isOpenArrival(A)).toBe(false);
    expect(isOpenArrival(B)).toBe(true);
  });

  it('is dropped by clearing, so a stale mark cannot be read later', () => {
    markOpenArrival(A);
    clearOpenArrival();

    expect(isOpenArrival(A)).toBe(false);
    expect(consumeOpenArrival(A)).toBe(false);
  });
});
