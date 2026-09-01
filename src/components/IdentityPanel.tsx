import { EMOJI_SLOTS } from '../domain/emojiSlots';
import type { Participant } from '../domain/types';

interface IdentityPanelProps {
  participants: readonly Participant[];
  onEdit: (participantId: string) => void;
  onRemove: (participantId: string) => void;
}

export function IdentityPanel({ participants, onEdit, onRemove }: IdentityPanelProps) {
  return (
    <aside className="identity-panel" aria-labelledby="identity-panel-title">
      <div className="panel-heading identity-heading">
        <div>
          <span className="eyebrow">Competencia</span>
          <h2 id="identity-panel-title">Identidades y configuración</h2>
        </div>
      </div>
      <p className="identity-note">Cada emoji identifica a una colonia y conserva su configuración.</p>
      <div className="participant-list identity-list">
        {EMOJI_SLOTS.map((slot) => {
          const participant = participants.find((current) => current.emojiSlot === slot.number);
          return (
            <div
              className="participant-row identity-row"
              data-assigned={participant ? 'true' : 'false'}
              key={slot.number}
            >
              {participant ? (
                <>
                  <button
                    className="participant-edit identity-edit"
                    type="button"
                    aria-label={`Editar a ${participant.name}`}
                    onClick={() => onEdit(participant.id)}
                  >
                    <span
                      className="participant-color"
                      style={{ backgroundColor: participant.color }}
                      aria-hidden="true"
                    />
                    <span className="participant-row-emoji" aria-hidden="true">{slot.emoji}</span>
                    <span>
                      <strong className="roster-name">{participant.name}</strong>
                      <small>{participant.beeCount} abejas · inteligencia {participant.intelligence}</small>
                    </span>
                  </button>
                  <button
                    className="remove-button"
                    type="button"
                    aria-label={`Retirar a ${participant.name}`}
                    onClick={() => onRemove(participant.id)}
                  >
                    ×
                  </button>
                </>
              ) : (
                <div
                  className="identity-empty-row"
                  aria-label={`${slot.label}, disponible`}
                >
                  <span className="identity-available-dot" aria-hidden="true" />
                  <span className="participant-row-emoji" aria-hidden="true">{slot.emoji}</span>
                  <span>
                    <strong>Disponible</strong>
                    <small>{slot.label}</small>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
