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
  { number: 11, emoji: '🦋', label: 'Mariposa' },
  { number: 12, emoji: '🍎', label: 'Manzana' },
  { number: 13, emoji: '🎈', label: 'Globo' },
  { number: 14, emoji: '🐾', label: 'Huella' },
  { number: 15, emoji: '👑', label: 'Corona' },
] as const;

export const MAX_PARTICIPANTS = EMOJI_SLOTS.length;

export function getEmojiSlot(slotNumber: number): EmojiSlot | undefined {
  return EMOJI_SLOTS.find((slot) => slot.number === slotNumber);
}
