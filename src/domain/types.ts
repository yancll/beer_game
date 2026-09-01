export type IntelligenceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface Participant {
  id: string;
  name: string;
  color: string;
  emojiSlot: number;
  beeCount: number;
  intelligence: IntelligenceLevel;
  createdAt: number;
}

export interface ParticipantDraft {
  name: string;
  color: string;
  emojiSlot: number;
  beeCount: number;
  intelligence: number;
}

export interface Winner {
  participantId: string;
  name: string;
  emoji: string;
  color: string;
}
