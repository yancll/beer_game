import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { EmojiRoster } from './components/EmojiRoster';
import { EmptyArena } from './components/EmptyArena';
import { VictoryOverlay } from './components/VictoryOverlay';
import { resolveWinner } from './domain/gameRound';
import { REFERENCE_EXPERT_BEE_COUNT } from './domain/raceBalance';
import {
  parseStoredParticipants,
  removeParticipant,
  upsertParticipant,
} from './domain/participants';
import type { Participant, ParticipantDraft, Winner } from './domain/types';
import { PhaserGame } from './game/PhaserGame';

const PARTICIPANTS_STORAGE_KEY = 'beer-game:participants:v1';
const FLOWER_TIME_STORAGE_KEY = 'beer-game:flower-time:v1';
const VICTORY_DURATION_MS = 3200;

function loadFlowerMoveSeconds(): number {
  const stored = Number(localStorage.getItem(FLOWER_TIME_STORAGE_KEY));
  return Number.isFinite(stored) && stored >= 30 && stored <= 60 ? stored : 40;
}

export function App() {
  const [participants, setParticipants] = useState<Participant[]>(() =>
    parseStoredParticipants(localStorage.getItem(PARTICIPANTS_STORAGE_KEY)),
  );
  const [flowerMoveSeconds, setFlowerMoveSeconds] = useState(loadFlowerMoveSeconds);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [paused, setPaused] = useState(false);
  const participantsRef = useRef(participants);
  const winnerLockRef = useRef(false);
  const victoryTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    participantsRef.current = participants;
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem(FLOWER_TIME_STORAGE_KEY, String(flowerMoveSeconds));
  }, [flowerMoveSeconds]);

  useEffect(
    () => () => {
      if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);
    },
    [],
  );

  const saveParticipant = (draft: ParticipantDraft, editingId?: string) => {
    setParticipants((current) => upsertParticipant(current, draft, editingId));
  };

  const retireParticipant = (participantId: string) => {
    setParticipants((current) => removeParticipant(current, participantId));
  };

  const handleWinner = useCallback((participantId: string) => {
    if (winnerLockRef.current) return;
    const resolution = resolveWinner(participantsRef.current, participantId);
    if (!resolution.winner) return;
    winnerLockRef.current = true;
    setWinner(resolution.winner);
    setPaused(true);
    setParticipants(resolution.remainingParticipants);

    if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);
    victoryTimerRef.current = window.setTimeout(() => {
      setWinner(null);
      setPaused(false);
      winnerLockRef.current = false;
    }, VICTORY_DURATION_MS);
  }, []);

  const totalBees = useMemo(
    () => participants.reduce((total, participant) => total + participant.beeCount, 0),
    [participants],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <span>🐝</span>
        </div>
        <div className="brand-copy">
          <span className="eyebrow">Simulación evolutiva</span>
          <h1>beer_game</h1>
          <p>Una flor, muchas estrategias y una sola colonia ganadora por ronda.</p>
        </div>
        <div className="header-stats" aria-label="Estado de la carrera">
          <div>
            <strong>{participants.length}</strong>
            <span>personas</span>
          </div>
          <div>
            <strong>{totalBees}</strong>
            <span>abejas</span>
          </div>
        </div>
      </header>

      <main className="workspace-grid">
        <ControlPanel
          participants={participants}
          flowerMoveSeconds={flowerMoveSeconds}
          onFlowerMoveSecondsChange={setFlowerMoveSeconds}
          onSave={saveParticipant}
          onRemove={retireParticipant}
        />

        <section className="arena-panel" aria-labelledby="arena-title">
          <div className="arena-heading">
            <div>
              <span className="live-dot" aria-hidden="true" />
              <span>En vivo</span>
            </div>
            <h2 id="arena-title">Jardín de competencia</h2>
            <p>Primero debe localizar la flor y después permanecer en ella hasta llenar su barra de néctar.</p>
          </div>
          <div className="game-frame">
            <PhaserGame
              participants={participants}
              flowerMoveSeconds={flowerMoveSeconds}
              paused={paused}
              onWinner={handleWinner}
            />
            {participants.length === 0 && !winner && <EmptyArena />}
            <VictoryOverlay winner={winner} />
          </div>
          <div className="arena-footer">
            <span><i className="footer-dot flower-dot" />La flor cambia cada {flowerMoveSeconds} segundos</span>
            <span>
              <i className="footer-dot brain-dot" />
              Equilibrada para ~5–10 min incluso con {REFERENCE_EXPERT_BEE_COUNT} abejas expertas
            </span>
          </div>
        </section>

        <EmojiRoster participants={participants} />
      </main>
    </div>
  );
}
