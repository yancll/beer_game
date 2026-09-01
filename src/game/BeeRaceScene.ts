import Phaser from 'phaser';
import { getEmojiSlot } from '../domain/emojiSlots';
import {
  createGenome,
  evolvePopulation,
  type BeeEvaluation,
  type BeeGenome,
} from '../domain/evolution';
import { projectOutsideCircle } from '../domain/flowerAvoidance';
import { sampleDiscoveryDelayMs } from '../domain/raceBalance';
import type { Participant } from '../domain/types';

const HARVEST_DURATION_MS = 6000;
const HARVEST_RADIUS = 18;
const SEARCH_FLOWER_CLEARANCE = 46;
const EDGE_MARGIN = 38;
const BASE_SPEED = 70;

interface BeeAgent {
  id: string;
  participantId: string;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  bodyShape: Phaser.GameObjects.Ellipse;
  stripeLeft: Phaser.GameObjects.Rectangle;
  stripeRight: Phaser.GameObjects.Rectangle;
  badge: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Text;
  progressTrack: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
  velocity: Phaser.Math.Vector2;
  estimatedTarget: Phaser.Math.Vector2;
  targetRefreshAt: number;
  searchStartedAt: number;
  discoverySample: number;
  searchUnlockAt: number;
  phase: number;
  harvestProgress: number;
  genome: BeeGenome;
  evaluation: BeeEvaluation;
}

interface SceneOptions {
  onWinner: (participantId: string) => void;
  flowerMoveSeconds: number;
}

export class BeeRaceScene extends Phaser.Scene {
  private participants = new Map<string, Participant>();
  private colonies = new Map<string, BeeAgent[]>();
  private flower?: Phaser.GameObjects.Container;
  private meadow?: Phaser.GameObjects.Graphics;
  private nextFlowerMoveAt = 0;
  private flowerMoveMs: number;
  private flowerMoving = false;
  private roundPaused = false;
  private pauseRemainingMs = 0;
  private winnerLocked = false;
  private winnerHandler: (participantId: string) => void;
  private lastWidth = 0;
  private lastHeight = 0;
  private pendingParticipants: Participant[] = [];

  constructor(options: SceneOptions) {
    super({ key: 'BeeRaceScene' });
    this.winnerHandler = options.onWinner;
    this.flowerMoveMs = options.flowerMoveSeconds * 1000;
  }

  create() {
    this.cameras.main.setBackgroundColor('#e7f5df');
    this.meadow = this.add.graphics().setDepth(-20);
    this.drawMeadow();
    this.flower = this.createFlower();
    const target = this.randomFlowerPosition();
    this.flower.setPosition(target.x, target.y);
    this.nextFlowerMoveAt = this.time.now + this.flowerMoveMs;
    this.setParticipants(this.pendingParticipants);
  }

  setWinnerHandler(handler: (participantId: string) => void) {
    this.winnerHandler = handler;
  }

  setParticipants(nextParticipants: readonly Participant[]) {
    this.pendingParticipants = [...nextParticipants];
    if (!this.sys.isActive()) return;
    const nextMap = new Map(nextParticipants.map((participant) => [participant.id, participant]));
    const participantWasRemoved = [...this.participants.keys()].some((id) => !nextMap.has(id));

    for (const [participantId, bees] of this.colonies) {
      if (nextMap.has(participantId)) continue;
      bees.forEach((bee) => bee.root.destroy(true));
      this.colonies.delete(participantId);
    }

    for (const participant of nextParticipants) {
      const previous = this.participants.get(participant.id);
      const bees = this.colonies.get(participant.id) ?? [];
      if (!this.colonies.has(participant.id)) this.colonies.set(participant.id, bees);

      if (previous && previous.intelligence !== participant.intelligence) {
        bees.forEach((bee) => {
          bee.genome = createGenome(participant.intelligence);
          bee.evaluation.genome = bee.genome;
          bee.searchUnlockAt = Math.min(
            bee.searchUnlockAt,
            bee.searchStartedAt + sampleDiscoveryDelayMs(
              participant.intelligence,
              () => bee.discoverySample,
            ),
          );
        });
      }
      if (
        !previous ||
        previous.color !== participant.color ||
        previous.emojiSlot !== participant.emojiSlot
      ) {
        bees.forEach((bee) => this.updateBeeIdentity(bee, participant));
      }

      while (bees.length < participant.beeCount) {
        bees.push(this.createBee(participant, bees.length));
      }
      while (bees.length > participant.beeCount) {
        bees.pop()?.root.destroy(true);
      }
    }

    this.participants = nextMap;
    if (participantWasRemoved) this.winnerLocked = false;
  }

  setFlowerMoveSeconds(seconds: number) {
    this.flowerMoveMs = seconds * 1000;
    if (this.sys.isActive()) this.nextFlowerMoveAt = this.time.now + this.flowerMoveMs;
  }

  setRoundPaused(paused: boolean) {
    if (paused === this.roundPaused) return;
    if (!this.sys.isActive()) {
      this.roundPaused = paused;
      return;
    }
    if (paused) {
      this.pauseRemainingMs = Math.max(0, this.nextFlowerMoveAt - this.time.now);
    } else {
      this.nextFlowerMoveAt = this.time.now + Math.max(1000, this.pauseRemainingMs);
    }
    this.roundPaused = paused;
  }

  forceWinner(participantId: string) {
    if (!this.participants.has(participantId) || this.winnerLocked) return;
    this.winnerLocked = true;
    this.winnerHandler(participantId);
  }

  update(time: number, delta: number) {
    if (this.scale.width !== this.lastWidth || this.scale.height !== this.lastHeight) {
      this.drawMeadow();
      this.keepObjectsInsideArena();
    }
    if (this.roundPaused || !this.flower) return;

    if (time >= this.nextFlowerMoveAt && !this.flowerMoving) {
      this.evolveColonies();
      this.moveFlower();
      this.nextFlowerMoveAt = time + this.flowerMoveMs;
    }

    const deltaSeconds = Math.min(delta / 1000, 0.05);
    const allBees = [...this.colonies.values()].flat();
    for (const bee of allBees) this.updateBee(bee, allBees, time, delta, deltaSeconds);
  }

  private createBee(participant: Participant, index: number): BeeAgent {
    const spawn = this.randomBeePosition();
    const searchStartedAt = this.time.now;
    const discoverySample = Math.random();
    const root = this.add.container(spawn.x, spawn.y).setDepth(5);
    const body = this.add.container(0, 0);
    const shadow = this.add.ellipse(2, 8, 31, 12, 0x173c25, 0.16);
    const wingLeft = this.add.ellipse(-6, -7, 18, 10, 0xffffff, 0.7).setRotation(-0.45);
    const wingRight = this.add.ellipse(-6, 7, 18, 10, 0xffffff, 0.7).setRotation(0.45);
    const bodyShape = this.add.ellipse(0, 0, 32, 20, Phaser.Display.Color.HexStringToColor(participant.color).color);
    const stripeColor = this.contrastColor(participant.color);
    const stripeLeft = this.add.rectangle(-3, 0, 4, 18, stripeColor);
    const stripeRight = this.add.rectangle(5, 0, 4, 15, stripeColor);
    const eye = this.add.circle(13, -4, 2.4, 0x17231b);
    const eyeTwo = this.add.circle(13, 4, 2.4, 0x17231b);
    body.add([shadow, wingLeft, wingRight, bodyShape, stripeLeft, stripeRight, eye, eyeTwo]);

    const badge = this.add.circle(0, -29, 15, 0xffffff, 0.95).setStrokeStyle(2, stripeColor, 0.6);
    const icon = this.add
      .text(0, -29, getEmojiSlot(participant.emojiSlot)?.emoji ?? '🐝', {
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", sans-serif',
        fontSize: '17px',
      })
      .setOrigin(0.5);
    const progressTrack = this.add.rectangle(-15, -47, 30, 4, 0x173c25, 0.18).setOrigin(0, 0.5);
    const progressFill = this.add.rectangle(-15, -47, 30, 4, 0xf2b72c, 1).setOrigin(0, 0.5).setScale(0, 1);
    root.add([body, badge, icon, progressTrack, progressFill]);

    const genome = createGenome(participant.intelligence);
    const id = `${participant.id}-bee-${index}-${Math.random().toString(16).slice(2)}`;
    return {
      id,
      participantId: participant.id,
      root,
      body,
      bodyShape,
      stripeLeft,
      stripeRight,
      badge,
      icon,
      progressTrack,
      progressFill,
      velocity: new Phaser.Math.Vector2(
        Phaser.Math.FloatBetween(-1, 1),
        Phaser.Math.FloatBetween(-1, 1),
      ).normalize().scale(BASE_SPEED * 0.45),
      estimatedTarget: this.randomBeePosition(),
      targetRefreshAt: 0,
      searchStartedAt,
      discoverySample,
      searchUnlockAt: searchStartedAt + sampleDiscoveryDelayMs(
        participant.intelligence,
        () => discoverySample,
      ),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      harvestProgress: 0,
      genome,
      evaluation: {
        id,
        genome,
        closestDistance: Number.POSITIVE_INFINITY,
        pathDistance: 0,
        harvestProgress: 0,
      },
    };
  }

  private updateBeeIdentity(bee: BeeAgent, participant: Participant) {
    const fill = Phaser.Display.Color.HexStringToColor(participant.color).color;
    const contrast = this.contrastColor(participant.color);
    bee.bodyShape.setFillStyle(fill);
    bee.stripeLeft.setFillStyle(contrast);
    bee.stripeRight.setFillStyle(contrast);
    bee.badge.setStrokeStyle(2, contrast, 0.6);
    bee.icon.setText(getEmojiSlot(participant.emojiSlot)?.emoji ?? '🐝');
  }

  private updateBee(
    bee: BeeAgent,
    allBees: readonly BeeAgent[],
    time: number,
    deltaMs: number,
    deltaSeconds: number,
  ) {
    const participant = this.participants.get(bee.participantId);
    if (!participant || !this.flower) return;

    const flowerDistance = Phaser.Math.Distance.Between(bee.root.x, bee.root.y, this.flower.x, this.flower.y);
    bee.evaluation.closestDistance = Math.min(bee.evaluation.closestDistance, flowerDistance);
    const recognizesFlower = time >= bee.searchUnlockAt;

    if (recognizesFlower && (time >= bee.targetRefreshAt || flowerDistance < 150)) {
      const precision = bee.genome.directness * (1 - bee.genome.sensorNoise * 0.5);
      const errorRadius = Phaser.Math.Linear(118, 8, precision);
      bee.estimatedTarget.set(
        this.flower.x + Phaser.Math.FloatBetween(-errorRadius, errorRadius),
        this.flower.y + Phaser.Math.FloatBetween(-errorRadius, errorRadius),
      );
      const refreshDelay = Phaser.Math.Linear(1550, 220, precision);
      bee.targetRefreshAt = time + refreshDelay;
    } else if (
      !recognizesFlower &&
      (time >= bee.targetRefreshAt || Phaser.Math.Distance.Between(
        bee.root.x,
        bee.root.y,
        bee.estimatedTarget.x,
        bee.estimatedTarget.y,
      ) < 55)
    ) {
      bee.estimatedTarget.copy(this.randomBeePosition());
      const skill = participant.intelligence / 5;
      bee.targetRefreshAt = time + Phaser.Math.Linear(5600, 3200, skill);
    }

    const desired = new Phaser.Math.Vector2(
      bee.estimatedTarget.x - bee.root.x,
      bee.estimatedTarget.y - bee.root.y,
    );
    if (desired.lengthSq() > 0.001) desired.normalize();
    const wanderStrength = bee.genome.exploration * 0.72;
    desired.x += Math.sin(time * 0.0015 + bee.phase) * wanderStrength;
    desired.y += Math.cos(time * 0.0012 + bee.phase * 1.3) * wanderStrength;
    if (!recognizesFlower && flowerDistance < SEARCH_FLOWER_CLEARANCE * 2) {
      const away = new Phaser.Math.Vector2(
        bee.root.x - this.flower.x,
        bee.root.y - this.flower.y,
      );
      if (away.lengthSq() < 0.001) away.set(Math.cos(bee.phase), Math.sin(bee.phase));
      const avoidanceStrength = 2.4 * (1 - flowerDistance / (SEARCH_FLOWER_CLEARANCE * 2));
      desired.add(away.normalize().scale(avoidanceStrength));
    }
    desired.normalize().scale(BASE_SPEED);

    const responsiveness = Phaser.Math.Linear(0.045, 0.125, 1 - bee.genome.inertia);
    bee.velocity.lerp(desired, Math.min(1, responsiveness * deltaMs * 0.06));
    this.applySeparation(bee, allBees, deltaSeconds);

    const previousX = bee.root.x;
    const previousY = bee.root.y;
    bee.root.x += bee.velocity.x * deltaSeconds;
    bee.root.y += bee.velocity.y * deltaSeconds;
    this.bounceInsideArena(bee);
    if (!recognizesFlower) this.keepSearchingBeeOutsideFlower(bee, time);
    bee.evaluation.pathDistance += Phaser.Math.Distance.Between(previousX, previousY, bee.root.x, bee.root.y);
    bee.body.rotation = Math.atan2(bee.velocity.y, bee.velocity.x);
    bee.body.setScale(1, 1 + Math.sin(time * 0.025 + bee.phase) * 0.035);

    const currentFlowerDistance = Phaser.Math.Distance.Between(
      bee.root.x,
      bee.root.y,
      this.flower.x,
      this.flower.y,
    );
    if (recognizesFlower && currentFlowerDistance <= HARVEST_RADIUS && !this.flowerMoving) {
      bee.harvestProgress = Math.min(1, bee.harvestProgress + deltaMs / HARVEST_DURATION_MS);
      bee.velocity.scale(0.982);
    } else {
      bee.harvestProgress = Math.max(0, bee.harvestProgress - deltaMs / 4200);
    }
    bee.evaluation.harvestProgress = Math.max(bee.evaluation.harvestProgress, bee.harvestProgress);
    bee.progressFill.setScale(bee.harvestProgress, 1);
    bee.progressTrack.setVisible(bee.harvestProgress > 0.01);
    bee.progressFill.setVisible(bee.harvestProgress > 0.01);

    if (bee.harvestProgress >= 1 && !this.winnerLocked) {
      this.winnerLocked = true;
      this.createVictoryBurst(bee.root.x, bee.root.y, participant.color);
      this.winnerHandler(participant.id);
    }
  }

  private applySeparation(bee: BeeAgent, allBees: readonly BeeAgent[], deltaSeconds: number) {
    const separation = new Phaser.Math.Vector2();
    for (const other of allBees) {
      if (other === bee) continue;
      const distance = Phaser.Math.Distance.Between(bee.root.x, bee.root.y, other.root.x, other.root.y);
      if (distance <= 0 || distance >= 30) continue;
      separation.x += (bee.root.x - other.root.x) / distance;
      separation.y += (bee.root.y - other.root.y) / distance;
    }
    if (separation.lengthSq() > 0) {
      separation.normalize().scale(54 * deltaSeconds);
      bee.velocity.add(separation);
    }
    if (bee.velocity.length() > BASE_SPEED) bee.velocity.normalize().scale(BASE_SPEED);
  }

  private bounceInsideArena(bee: BeeAgent) {
    const maxX = Math.max(EDGE_MARGIN, this.scale.width - EDGE_MARGIN);
    const maxY = Math.max(EDGE_MARGIN, this.scale.height - EDGE_MARGIN);
    if (bee.root.x <= EDGE_MARGIN || bee.root.x >= maxX) bee.velocity.x *= -1;
    if (bee.root.y <= EDGE_MARGIN || bee.root.y >= maxY) bee.velocity.y *= -1;
    bee.root.x = Phaser.Math.Clamp(bee.root.x, EDGE_MARGIN, maxX);
    bee.root.y = Phaser.Math.Clamp(bee.root.y, EDGE_MARGIN, maxY);
  }

  private keepSearchingBeeOutsideFlower(bee: BeeAgent, time: number) {
    if (!this.flower) return;
    const projection = projectOutsideCircle(
      { x: bee.root.x, y: bee.root.y },
      { x: this.flower.x, y: this.flower.y },
      SEARCH_FLOWER_CLEARANCE,
      bee.phase,
    );
    if (!projection.displaced) return;

    bee.root.setPosition(projection.x, projection.y);
    const inwardSpeed =
      bee.velocity.x * projection.normalX + bee.velocity.y * projection.normalY;
    if (inwardSpeed < 0) {
      bee.velocity.x -= projection.normalX * inwardSpeed * 1.8;
      bee.velocity.y -= projection.normalY * inwardSpeed * 1.8;
    }
    bee.estimatedTarget.copy(this.randomBeePosition());
    bee.targetRefreshAt = time + 1800;
  }

  private createFlower(): Phaser.GameObjects.Container {
    const flower = this.add.container(0, 0).setDepth(3);
    const halo = this.add.circle(0, 0, 23, 0xf8d76b, 0.11);
    const stem = this.add.rectangle(0, 14, 4, 27, 0x4f9158).setOrigin(0.5, 0);
    const leafLeft = this.add.ellipse(-7, 24, 13, 6, 0x69a85f).setRotation(-0.5);
    const leafRight = this.add.ellipse(7, 31, 13, 6, 0x69a85f).setRotation(0.5);
    flower.add([halo, stem, leafLeft, leafRight]);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const petal = this.add
        .ellipse(Math.cos(angle) * 10, Math.sin(angle) * 10, 15, 8, 0xfff8ee)
        .setRotation(angle);
      flower.add(petal);
    }
    flower.add(this.add.circle(0, 0, 7, 0xf5bd32).setStrokeStyle(2, 0xe29b1d, 0.55));
    flower.add(
      this.add
        .text(0, -31, 'META', {
          color: '#24472c',
          backgroundColor: '#ffffffdd',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '8px',
          fontStyle: 'bold',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5),
    );
    this.tweens.add({
      targets: halo,
      scale: 1.14,
      alpha: 0.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return flower;
  }

  private moveFlower() {
    if (!this.flower) return;
    this.flowerMoving = true;
    for (const bees of this.colonies.values()) {
      bees.forEach((bee) => {
        bee.harvestProgress = 0;
        bee.progressFill.setScale(0, 1);
      });
    }
    const target = this.randomFlowerPosition();
    this.createPollenTrail(this.flower.x, this.flower.y);
    this.tweens.add({
      targets: this.flower,
      x: target.x,
      y: target.y,
      duration: 900,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.flowerMoving = false;
        if (this.flower) this.createPollenTrail(this.flower.x, this.flower.y);
      },
    });
  }

  private evolveColonies() {
    for (const [participantId, bees] of this.colonies) {
      const participant = this.participants.get(participantId);
      if (!participant) continue;
      const evolved = evolvePopulation(
        bees.map((bee) => ({ ...bee.evaluation, genome: bee.genome })),
        participant.intelligence,
      );
      const byId = new Map(evolved.map((item) => [item.id, item.genome]));
      bees.forEach((bee) => {
        bee.genome = byId.get(bee.id) ?? bee.genome;
        bee.evaluation = {
          id: bee.id,
          genome: bee.genome,
          closestDistance: Number.POSITIVE_INFINITY,
          pathDistance: 0,
          harvestProgress: 0,
        };
      });
    }
  }

  private createPollenTrail(x: number, y: number) {
    for (let index = 0; index < 9; index += 1) {
      const pollen = this.add
        .circle(
          x + Phaser.Math.FloatBetween(-28, 28),
          y + Phaser.Math.FloatBetween(-24, 24),
          Phaser.Math.FloatBetween(2, 5),
          0xf4c247,
          0.75,
        )
        .setDepth(2);
      this.tweens.add({
        targets: pollen,
        x: pollen.x + Phaser.Math.FloatBetween(-20, 20),
        y: pollen.y - Phaser.Math.FloatBetween(20, 55),
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(700, 1300),
        delay: index * 35,
        onComplete: () => pollen.destroy(),
      });
    }
  }

  private createVictoryBurst(x: number, y: number, color: string) {
    const baseColor = Phaser.Display.Color.HexStringToColor(color).color;
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(3, 6), index % 2 ? baseColor : 0xf6c84d).setDepth(20);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * Phaser.Math.FloatBetween(70, 150),
        y: y + Math.sin(angle) * Phaser.Math.FloatBetween(70, 150),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(700, 1100),
        onComplete: () => dot.destroy(),
      });
    }
  }

  private drawMeadow() {
    if (!this.meadow) return;
    this.lastWidth = this.scale.width;
    this.lastHeight = this.scale.height;
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    this.meadow.clear();
    this.meadow.fillStyle(0xe8f5df, 1).fillRect(0, 0, width, height);

    const patches = [
      [0.08, 0.16, 70, 34], [0.88, 0.18, 90, 42], [0.18, 0.82, 110, 48],
      [0.72, 0.78, 125, 55], [0.46, 0.12, 80, 34], [0.5, 0.92, 95, 40],
    ];
    this.meadow.fillStyle(0xb9ddb0, 0.32);
    patches.forEach(([x, y, patchWidth, patchHeight]) => {
      this.meadow?.fillEllipse(x * width, y * height, patchWidth, patchHeight);
    });

    this.meadow.fillStyle(0xffffff, 0.7);
    for (let index = 0; index < 20; index += 1) {
      const x = ((index * 73) % 97) / 100 * width + 10;
      const y = ((index * 41) % 89) / 100 * height + 10;
      this.meadow.fillCircle(x, y, index % 3 === 0 ? 3 : 2);
    }
  }

  private keepObjectsInsideArena() {
    if (this.flower) {
      this.flower.x = Phaser.Math.Clamp(this.flower.x, 70, Math.max(70, this.scale.width - 70));
      this.flower.y = Phaser.Math.Clamp(this.flower.y, 78, Math.max(78, this.scale.height - 78));
    }
    for (const bees of this.colonies.values()) bees.forEach((bee) => this.bounceInsideArena(bee));
  }

  private randomFlowerPosition() {
    const maxX = Math.max(76, this.scale.width - 76);
    const maxY = Math.max(84, this.scale.height - 84);
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(76, maxX),
      Phaser.Math.Between(84, maxY),
    );
  }

  private randomBeePosition() {
    const maxX = Math.max(EDGE_MARGIN + 1, this.scale.width - EDGE_MARGIN);
    const maxY = Math.max(EDGE_MARGIN + 1, this.scale.height - EDGE_MARGIN);
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(EDGE_MARGIN, maxX),
      Phaser.Math.Between(EDGE_MARGIN, maxY),
    );
  }

  private contrastColor(hex: string): number {
    const color = Phaser.Display.Color.HexStringToColor(hex);
    const brightness = (color.red * 299 + color.green * 587 + color.blue * 114) / 1000;
    return brightness > 150 ? 0x18201a : 0xffffff;
  }
}
