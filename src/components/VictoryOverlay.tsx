import type { Winner } from '../domain/types';

interface VictoryOverlayProps {
  winner: Winner | null;
}

export function VictoryOverlay({ winner }: VictoryOverlayProps) {
  if (!winner) return null;

  return (
    <div className="victory-backdrop" role="dialog" aria-modal="true" aria-labelledby="victory-title">
      <div className="victory-card" style={{ '--winner-color': winner.color } as React.CSSProperties}>
        <div className="victory-rays" aria-hidden="true" />
        <span className="victory-emoji" aria-hidden="true">{winner.emoji}</span>
        <span className="victory-kicker">¡Llegó a la flor!</span>
        <h2 id="victory-title">Victoria de {winner.name}</h2>
        <p>Su colonia sale de la carrera. Enseguida continúan los demás participantes.</p>
        <div className="victory-timer" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
