import { describe, expect, it } from 'vitest';
import { EMOJI_SLOTS, getEmojiSlot, MAX_PARTICIPANTS } from './emojiSlots';

describe('emoji slots', () => {
  it('provides fifteen unique emoji identities', () => {
    expect(EMOJI_SLOTS).toHaveLength(15);
    expect(MAX_PARTICIPANTS).toBe(15);
    expect(new Set(EMOJI_SLOTS.map((slot) => slot.number)).size).toBe(15);
    expect(new Set(EMOJI_SLOTS.map((slot) => slot.emoji)).size).toBe(15);
  });

  it('resolves an assigned slot and returns undefined outside the roster', () => {
    expect(getEmojiSlot(4)?.emoji).toBe('🍀');
    expect(getEmojiSlot(15)?.emoji).toBe('👑');
    expect(getEmojiSlot(99)).toBeUndefined();
  });
});
