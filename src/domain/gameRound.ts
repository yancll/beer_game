import { getEmojiSlot } from './emojiSlots';
import { removeParticipant } from './participants';
import type { Participant, Winner } from './types';

export interface WinnerResolution {
  winner: Winner | null;
  remainingParticipants: Participant[];
}

export function resolveWinner(
  participants: readonly Participant[],
  participantId: string,
): WinnerResolution {
  const participant = participants.find((current) => current.id === participantId);
  if (!participant) return { winner: null, remainingParticipants: [...participants] };

  return {
    winner: {
      participantId,
      name: participant.name,
      emoji: getEmojiSlot(participant.emojiSlot)?.emoji ?? '🐝',
      color: participant.color,
    },
    remainingParticipants: removeParticipant(participants, participantId),
  };
}
