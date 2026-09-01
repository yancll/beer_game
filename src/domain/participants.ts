import { EMOJI_SLOTS } from './emojiSlots';
import type { IntelligenceLevel, Participant, ParticipantDraft } from './types';

export interface ParticipantValidation {
  valid: boolean;
  errors: Partial<Record<keyof ParticipantDraft, string>>;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function validateParticipantDraft(
  draft: ParticipantDraft,
  participants: readonly Participant[],
  editingId?: string,
): ParticipantValidation {
  const errors: ParticipantValidation['errors'] = {};
  const name = draft.name.trim();

  if (name.length < 1) errors.name = 'Escribe el nombre de la persona.';
  if (name.length > 24) errors.name = 'Usa un nombre de hasta 24 caracteres.';

  const duplicateName = participants.some(
    (participant) =>
      participant.id !== editingId &&
      participant.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0,
  );
  if (duplicateName) errors.name = 'Ya existe una persona con ese nombre.';

  if (!HEX_COLOR.test(draft.color)) errors.color = 'Selecciona un color válido.';
  if (!EMOJI_SLOTS.some((slot) => slot.number === draft.emojiSlot)) {
    errors.emojiSlot = 'Selecciona un número de emoji.';
  }

  const occupiedSlot = participants.some(
    (participant) => participant.id !== editingId && participant.emojiSlot === draft.emojiSlot,
  );
  if (occupiedSlot) errors.emojiSlot = 'Ese emoji ya está asignado.';

  if (!Number.isInteger(draft.beeCount) || draft.beeCount < 1 || draft.beeCount > 10) {
    errors.beeCount = 'La cantidad debe estar entre 1 y 10.';
  }
  if (!Number.isInteger(draft.intelligence) || draft.intelligence < 0 || draft.intelligence > 5) {
    errors.intelligence = 'La inteligencia debe estar entre 0 y 5.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function upsertParticipant(
  participants: readonly Participant[],
  draft: ParticipantDraft,
  editingId?: string,
  idFactory: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
): Participant[] {
  const validation = validateParticipantDraft(draft, participants, editingId);
  if (!validation.valid) throw new Error('Invalid participant draft');

  const existing = editingId ? participants.find((participant) => participant.id === editingId) : undefined;
  const participant: Participant = {
    id: existing?.id ?? idFactory(),
    name: draft.name.trim(),
    color: draft.color,
    emojiSlot: draft.emojiSlot,
    beeCount: draft.beeCount,
    intelligence: draft.intelligence as IntelligenceLevel,
    createdAt: existing?.createdAt ?? now(),
  };

  if (!existing) return [...participants, participant];
  return participants.map((current) => (current.id === existing.id ? participant : current));
}

export function removeParticipant(
  participants: readonly Participant[],
  participantId: string,
): Participant[] {
  return participants.filter((participant) => participant.id !== participantId);
}

export function parseStoredParticipants(raw: string | null): Participant[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const accepted: Participant[] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== 'object') continue;
      const item = candidate as Partial<Participant>;
      const draft: ParticipantDraft = {
        name: typeof item.name === 'string' ? item.name : '',
        color: typeof item.color === 'string' ? item.color : '',
        emojiSlot: Number(item.emojiSlot),
        beeCount: Number(item.beeCount),
        intelligence: Number(item.intelligence),
      };
      const id = typeof item.id === 'string' ? item.id : '';
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : 0;
      if (!id || !createdAt || !validateParticipantDraft(draft, accepted).valid) continue;
      accepted.push({
        id,
        createdAt,
        ...draft,
        intelligence: draft.intelligence as IntelligenceLevel,
      });
    }
    return accepted;
  } catch {
    return [];
  }
}
