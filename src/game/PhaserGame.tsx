import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { Participant } from '../domain/types';
import { BeeRaceScene } from './BeeRaceScene';

interface PhaserGameProps {
  participants: readonly Participant[];
  flowerMoveSeconds: number;
  paused: boolean;
  onWinner: (participantId: string) => void;
}

interface ForceWinnerDetail {
  participantId: string;
}

export function PhaserGame({ participants, flowerMoveSeconds, paused, onWinner }: PhaserGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | undefined>(undefined);
  const sceneRef = useRef<BeeRaceScene | undefined>(undefined);
  const initialOptionsRef = useRef({ onWinner, flowerMoveSeconds });

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new BeeRaceScene(initialOptionsRef.current);
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: '#e8f5df',
      antialias: true,
      render: { pixelArt: false, roundPixels: false },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: 900,
        height: 640,
      },
      scene,
      banner: false,
    });
    gameRef.current = game;

    const labelCanvas = () => {
      const canvas = hostRef.current?.querySelector('canvas');
      canvas?.setAttribute('role', 'img');
      canvas?.setAttribute(
        'aria-label',
        'Arena animada donde las abejas buscan una flor y recogen néctar para ganar.',
      );
    };
    window.requestAnimationFrame(labelCanvas);

    return () => {
      game.destroy(true);
      gameRef.current = undefined;
      sceneRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setWinnerHandler(onWinner);
  }, [onWinner]);

  useEffect(() => {
    sceneRef.current?.setParticipants(participants);
  }, [participants]);

  useEffect(() => {
    sceneRef.current?.setFlowerMoveSeconds(flowerMoveSeconds);
  }, [flowerMoveSeconds]);

  useEffect(() => {
    sceneRef.current?.setRoundPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') return;
    const forceWinner = (event: Event) => {
      const detail = (event as CustomEvent<ForceWinnerDetail>).detail;
      if (detail?.participantId) sceneRef.current?.forceWinner(detail.participantId);
    };
    window.addEventListener('bee-game:force-winner', forceWinner);
    return () => window.removeEventListener('bee-game:force-winner', forceWinner);
  }, []);

  return <div ref={hostRef} className="phaser-host" data-testid="phaser-host" />;
}
