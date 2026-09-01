import { EMOJI_SLOTS } from '../domain/emojiSlots';
import type { Participant } from '../domain/types';

interface EmojiRosterProps {
  participants: readonly Participant[];
}

export function EmojiRoster({ participants }: EmojiRosterProps) {
  return (
    <aside className="emoji-roster" aria-labelledby="emoji-roster-title">
      <div className="panel-heading roster-heading">
        <div>
          <span className="eyebrow">Identidades</span>
          <h2 id="emoji-roster-title">Emojis</h2>
        </div>
      </div>
      <ol className="roster-list">
        {EMOJI_SLOTS.map((slot) => {
          const participant = participants.find((current) => current.emojiSlot === slot.number);
          return (
            <li className="roster-row" data-assigned={participant ? 'true' : 'false'} key={slot.number}>
              <span className="roster-number">{slot.number}</span>
              <span className="roster-emoji" aria-hidden="true">{slot.emoji}</span>
              {participant ? (
                <span className="roster-name">
                  <span
                    className="roster-color"
                    style={{ backgroundColor: participant.color }}
                    aria-hidden="true"
                  />
                  {participant.name}
                </span>
              ) : (
                <span className="roster-empty" aria-label={`${slot.label}, sin asignar`} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="roster-note">El emoji asignado aparece sobre cada abeja.</p>
    </aside>
  );
}
