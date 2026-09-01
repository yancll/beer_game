import { describe, expect, it } from 'vitest';
import { resolveWinner } from './gameRound';
import type { Participant } from './types';

const participants: Participant[] = [
  {
    id: 'ana',
    name: 'Ana',
    color: '#f2a51f',
    emojiSlot: 3,
    beeCount: 2,
    intelligence: 1,
    createdAt: 100,
  },
  {
    id: 'luis',
    name: 'Luis',
    color: '#3979d5',
    emojiSlot: 7,
    beeCount: 1,
    intelligence: 4,
    createdAt: 200,
  },
];

describe('winner resolution', () => {
  it('creates the victory identity, removes the winner and preserves everyone else', () => {
    const result = resolveWinner(participants, 'ana');
    expect(result.winner).toEqual({
      participantId: 'ana',
      name: 'Ana',
      emoji: '🔥',
      color: '#f2a51f',
    });
    expect(result.remainingParticipants).toEqual([participants[1]]);
  });

  it('leaves the round unchanged when the participant no longer exists', () => {
    const result = resolveWinner(participants, 'missing');
    expect(result.winner).toBeNull();
    expect(result.remainingParticipants).toEqual(participants);
    expect(result.remainingParticipants).not.toBe(participants);
  });
});
