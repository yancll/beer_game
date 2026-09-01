import { useMemo, useState } from 'react';
import { EMOJI_SLOTS } from '../domain/emojiSlots';
import { MAX_BEES_PER_PARTICIPANT, validateParticipantDraft } from '../domain/participants';
import type { Participant, ParticipantDraft } from '../domain/types';

interface ControlPanelProps {
  participants: readonly Participant[];
  flowerMoveSeconds: number;
  editingId?: string;
  onFlowerMoveSecondsChange: (seconds: number) => void;
  onEditingChange: (participantId?: string) => void;
  onSave: (draft: ParticipantDraft, editingId?: string) => void;
}

const DEFAULT_COLOR = '#f2a51f';

function firstFreeSlot(participants: readonly Participant[], reservedSlot?: number): number {
  const occupied = new Set(participants.map((participant) => participant.emojiSlot));
  if (reservedSlot) occupied.add(reservedSlot);
  return EMOJI_SLOTS.find((slot) => !occupied.has(slot.number))?.number ?? 1;
}

function emptyDraft(participants: readonly Participant[], reservedSlot?: number): ParticipantDraft {
  return {
    name: '',
    color: DEFAULT_COLOR,
    emojiSlot: firstFreeSlot(participants, reservedSlot),
    beeCount: 1,
    intelligence: 0,
  };
}

export function ControlPanel({
  participants,
  flowerMoveSeconds,
  editingId,
  onFlowerMoveSecondsChange,
  onEditingChange,
  onSave,
}: ControlPanelProps) {
  const editingParticipant = participants.find((participant) => participant.id === editingId);
  const activeEditingId = editingParticipant ? editingId : undefined;
  const [draft, setDraft] = useState<ParticipantDraft>(() =>
    editingParticipant ? {
      name: editingParticipant.name,
      color: editingParticipant.color,
      emojiSlot: editingParticipant.emojiSlot,
      beeCount: editingParticipant.beeCount,
      intelligence: editingParticipant.intelligence,
    } : emptyDraft(participants),
  );
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(
    () => validateParticipantDraft(draft, participants, activeEditingId),
    [activeEditingId, draft, participants],
  );

  const reset = (reservedSlot?: number) => {
    onEditingChange(undefined);
    setDraft(emptyDraft(participants, reservedSlot));
    setSubmitted(false);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid) return;
    const newlyReservedSlot = activeEditingId ? undefined : draft.emojiSlot;
    onSave(draft, activeEditingId);
    reset(newlyReservedSlot);
  };

  return (
    <aside className="control-panel" aria-labelledby="control-panel-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Control central</span>
          <h2 id="control-panel-title">Participantes</h2>
        </div>
        <span className="participant-total" aria-label={`${participants.length} participantes activos`}>
          {participants.length}/10
        </span>
      </div>

      <form className="participant-form" onSubmit={submit} noValidate>
        <label className="field-label" htmlFor="participant-name">
          Nombre
        </label>
        <input
          id="participant-name"
          className="text-input"
          value={draft.name}
          maxLength={24}
          autoComplete="off"
          placeholder="Ejemplo: Ana"
          aria-invalid={submitted && Boolean(validation.errors.name)}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        {submitted && validation.errors.name && <p className="field-error">{validation.errors.name}</p>}

        <fieldset className="emoji-picker">
          <legend>Selecciona un emoji</legend>
          <div className="emoji-picker-grid">
            {EMOJI_SLOTS.map((slot) => {
              const owner = participants.find(
                (participant) => participant.emojiSlot === slot.number && participant.id !== activeEditingId,
              );
              const selected = draft.emojiSlot === slot.number;
              return (
                <button
                  key={slot.number}
                  type="button"
                  className="emoji-choice"
                  data-selected={selected || undefined}
                  disabled={Boolean(owner)}
                  aria-pressed={selected}
                  aria-label={`${slot.label}${owner ? `, asignado a ${owner.name}` : ''}`}
                  onClick={() => setDraft((current) => ({ ...current, emojiSlot: slot.number }))}
                >
                  <span aria-hidden="true">{slot.emoji}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {submitted && validation.errors.emojiSlot && (
          <p className="field-error">{validation.errors.emojiSlot}</p>
        )}

        <div className="color-row">
          <label className="field-label" htmlFor="participant-color">
            Color de sus abejas
          </label>
          <input
            id="participant-color"
            className="color-input"
            type="color"
            value={draft.color}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
          />
        </div>

        <label className="range-heading" htmlFor="bee-count">
          <span>Cantidad de abejas</span>
          <strong>{draft.beeCount}</strong>
        </label>
        <input
          id="bee-count"
          className="range-input"
          type="range"
          min="1"
          max={MAX_BEES_PER_PARTICIPANT}
          value={draft.beeCount}
          onChange={(event) =>
            setDraft((current) => ({ ...current, beeCount: Number(event.target.value) }))
          }
        />

        <label className="range-heading" htmlFor="bee-intelligence">
          <span>Inteligencia</span>
          <strong>{draft.intelligence}/5</strong>
        </label>
        <input
          id="bee-intelligence"
          className="range-input"
          type="range"
          min="0"
          max="5"
          value={draft.intelligence}
          onChange={(event) =>
            setDraft((current) => ({ ...current, intelligence: Number(event.target.value) }))
          }
        />
        <p className="range-caption">
          0 explora más; 5 calcula una ruta mucho más precisa.
        </p>

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!activeEditingId && participants.length >= 10}>
            {activeEditingId ? 'Guardar cambios' : 'Añadir participante'}
          </button>
          {activeEditingId && (
            <button className="secondary-button" type="button" onClick={() => reset()}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="round-settings">
        <label className="range-heading" htmlFor="flower-time">
          <span>La flor cambia de lugar</span>
          <strong>{flowerMoveSeconds} s</strong>
        </label>
        <input
          id="flower-time"
          className="range-input"
          type="range"
          min="30"
          max="60"
          value={flowerMoveSeconds}
          onChange={(event) => onFlowerMoveSecondsChange(Number(event.target.value))}
        />
      </div>
    </aside>
  );
}
