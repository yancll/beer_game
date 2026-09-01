import { describe, expect, it } from 'vitest';
import {
  parseStoredParticipants,
  removeParticipant,
  upsertParticipant,
  validateParticipantDraft,
} from './participants';
import type { Participant, ParticipantDraft } from './types';

const draft: ParticipantDraft = {
  name: 'Ana',
  color: '#f2a51f',
  emojiSlot: 1,
  beeCount: 1,
  intelligence: 0,
};

const existing: Participant = {
  id: 'person-1',
  createdAt: 100,
  name: draft.name,
  color: draft.color,
  emojiSlot: draft.emojiSlot,
  beeCount: draft.beeCount,
  intelligence: 0,
};

describe('participant validation', () => {
  it('accepts the initial one-bee participant', () => {
    expect(validateParticipantDraft(draft, [])).toEqual({ valid: true, errors: {} });
  });

  it('rejects malformed fields and out-of-range values', () => {
    const result = validateParticipantDraft(
      { name: '', color: 'orange', emojiSlot: 99, beeCount: 0, intelligence: 6 },
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      name: expect.any(String),
      color: expect.any(String),
      emojiSlot: expect.any(String),
      beeCount: expect.any(String),
      intelligence: expect.any(String),
    });
  });

  it('rejects long and duplicate names plus occupied emoji slots', () => {
    const duplicate = validateParticipantDraft(
      { ...draft, name: 'Ana', emojiSlot: 1 },
      [existing],
    );
    expect(duplicate.errors.name).toContain('existe');
    expect(duplicate.errors.emojiSlot).toContain('asignado');

    const longName = validateParticipantDraft({ ...draft, name: 'a'.repeat(25) }, []);
    expect(longName.errors.name).toContain('24');
  });

  it('allows a participant to keep its own name and emoji while editing', () => {
    expect(validateParticipantDraft(draft, [existing], existing.id).valid).toBe(true);
  });
});

describe('participant operations', () => {
  it('adds a participant with normalized name and deterministic metadata', () => {
    const result = upsertParticipant(
      [],
      { ...draft, name: '  Ana  ' },
      undefined,
      () => 'new-id',
      () => 200,
    );
    expect(result).toEqual([{ ...draft, id: 'new-id', createdAt: 200 }]);
  });

  it('updates a participant without changing its identity or creation time', () => {
    const result = upsertParticipant(
      [existing],
      { ...draft, beeCount: 7, intelligence: 5 },
      existing.id,
    );
    expect(result[0]).toMatchObject({ id: existing.id, createdAt: 100, beeCount: 7, intelligence: 5 });
  });

  it('throws when bypassing validation with an invalid draft', () => {
    expect(() => upsertParticipant([], { ...draft, beeCount: 11 })).toThrow('Invalid participant draft');
  });

  it('removes only the requested winner', () => {
    const second = { ...existing, id: 'person-2', name: 'Luis', emojiSlot: 2 };
    expect(removeParticipant([existing, second], existing.id)).toEqual([second]);
  });
});

describe('stored participants', () => {
  it('loads valid records and discards invalid or duplicate records', () => {
    const stored = JSON.stringify([
      existing,
      { ...existing, id: 'duplicate', createdAt: 101 },
      { ...existing, id: '', createdAt: 102, name: 'Luis', emojiSlot: 2 },
      { nonsense: true },
      null,
    ]);
    expect(parseStoredParticipants(stored)).toEqual([existing]);
  });

  it('returns an empty list for missing, malformed, or non-array storage', () => {
    expect(parseStoredParticipants(null)).toEqual([]);
    expect(parseStoredParticipants('{bad json')).toEqual([]);
    expect(parseStoredParticipants('{}')).toEqual([]);
  });
});
