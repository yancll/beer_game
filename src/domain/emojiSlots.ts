export interface EmojiSlot {
  number: number;
  emoji: string;
  label: string;
}

export const EMOJI_SLOTS: readonly EmojiSlot[] = [
  { number: 1, emoji: '🌟', label: 'Estrella' },
  { number: 2, emoji: '🌈', label: 'Arcoíris' },
  { number: 3, emoji: '🔥', label: 'Fuego' },
  { number: 4, emoji: '🍀', label: 'Trébol' },
  { number: 5, emoji: '🚀', label: 'Cohete' },
  { number: 6, emoji: '💎', label: 'Diamante' },
  { number: 7, emoji: '🌙', label: 'Luna' },
  { number: 8, emoji: '⚡', label: 'Rayo' },
  { number: 9, emoji: '🎯', label: 'Diana' },
  { number: 10, emoji: '🏆', label: 'Trofeo' },
] as const;

export function getEmojiSlot(slotNumber: number): EmojiSlot | undefined {
  return EMOJI_SLOTS.find((slot) => slot.number === slotNumber);
}
