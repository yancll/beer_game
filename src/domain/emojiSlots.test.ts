import { describe, expect, it } from 'vitest';
import { EMOJI_SLOTS, getEmojiSlot } from './emojiSlots';

describe('emoji slots', () => {
  it('provides ten unique numbered identities', () => {
    expect(EMOJI_SLOTS).toHaveLength(10);
    expect(new Set(EMOJI_SLOTS.map((slot) => slot.number)).size).toBe(10);
    expect(new Set(EMOJI_SLOTS.map((slot) => slot.emoji)).size).toBe(10);
  });

  it('resolves an assigned slot and returns undefined outside the roster', () => {
    expect(getEmojiSlot(4)?.emoji).toBe('🍀');
    expect(getEmojiSlot(99)).toBeUndefined();
  });
});
