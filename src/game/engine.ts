/* Core game engine: loop, physics, spawning, effects, scoring, records. */
import { AudioMan } from "./audio";
import {
  drawBackground,
  drawGround,
  drawObstacle,
  drawFood,
  drawPlayer,
  drawParticle,
  drawFloaters,
  drawFX,
} from "./render";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function faNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export type Phase = "menu" | "playing" | "paused" | "over";
export type FoodKind =
  | "worm" | "beetle" | "butterfly" | "chili" | "mushroom"
  | "corn" | "note" | "apple" | "egg"
  // new 16 foods
  | "star" | "magnet" | "shield" | "rainbow" | "pepper"
  | "honey" | "diamond" | "feather" | "clover"
  | "acorn" | "berry" | "grain" | "fish" | "cheese"
  | "carrot" | "golden_egg";

export type ObstacleKind = "rock" | "fence" | "hay" | "crow" | "snake" | "bees" | "fox";
export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  dead?: boolean;
}

/* ── character evolution ─────────────────────── */
export type CharStage = "chick" | "young" | "warrior" | "legendary" | "phoenix" | "cosmic";
export const CHAR_STAGES: CharStage[] = ["chick", "young", "warrior", "legendary", "phoenix", "cosmic"];
export const CHAR_NAMES: Record<CharStage, string> = {
  chick: "جوجه",
  young: "خروس جوان",
  warrior: "خروس جنگجو",
  legendary: "خروس افسانه‌ای",
  phoenix: "ققنوس آتشین",
  cosmic: "خروس کیهانی",
};
export const CHAR_XP_NEED = [0, 5, 12, 22, 35, 50]; // xp needed to reach each stage
export interface Food {
  kind: FoodKind;
  x: number;
  y: number;
  phase: number;
  dead?: boolean;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "dot" | "feather" | "confetti" | "smoke" | "note" | "star";
  rot: number;
  vr: number;
  grav: number;
}
export interface Floater {
  x: number;
  y: number;
  txt: string;
  life: number;
  color: string;
  size: number;
}
export interface EffectState {
  t: number;
  dur: number;
}
export interface HudEffect {
  id: string;
  label: string;
  t: number;
  dur: number;
  color: string;
}
export type EffectKey = "chili" | "fly" | "corn" | "disco";

export interface HudData {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  dist: number;
  effects: HudEffect[];
  newRecord: boolean;
  muted: boolean;
  xp: number;
  charStage: CharStage;
}

const BEST_KEY = "khorus-runner-best-v1";
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function pick<T>(pairs: [T, number][]): T {
  let total = 0;
  for (const p of pairs) total += p[1];
  let r = Math.random() * total;
  for (const p of pairs) {
    r -= p[1];
    if (r <= 0) return p[0];
  }
  return pairs[0][0];
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 960;
  H = 540;
  u = 1;
  groundY = 440;
  time = 0;
  scrollX = 0;
  dusk = 0;

  phase: Phase = "menu";
  score = 0;
  best = 0;
  lives = 3;
  dist = 0;
  newRecord = false;
  flashT = 0;
  shake = 0;

  player = {
    x: 200, y: 440, vy: 0, onGround: true, ducking: false, hurtT: 0, runPhase: 0,
    invincibleT: 0, shieldT: 0, magnetT: 0, jumpBoostT: 0, fishT: 0, bigT: 0, visionT: 0,
  };
  effects: Record<EffectKey, EffectState> = {
    chili: { t: 0, dur: 6 },
    fly: { t: 0, dur: 6 },
    corn: { t: 0, dur: 5 },
    disco: { t: 0, dur: 7 },
  };

  // evolution system
  xp = 0;
  charStage: CharStage = "chick";

  // temporary boosts
  scoreMultiplier = 1;
  scoreMultiplierT = 0;
  luckBoost = false;
  luckBoostT = 0;

  obstacles: Obstacle[] = [];
  foods: Food[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  stars: { x: number; y: number; r: number; p: number }[] = [];
  clouds: { x: number; y: number; s: number }[] = [];

  audio = new AudioMan();
  private onHud: (h: HudData) => void;
  private raf = 0;
  private lastT = 0;
  private elapsed = 0;
  private overT = 0;
  private obsT = 1.4;
  private foodT = 0.7;
  private flapCd = 0;
  private trailCd = 0;
  private hudCd = 0;
  private milestone = 0;
  private jumpHeld = false;
  private keyDuck = false;
  private destroyed = false;

  private keyDown = (ev: KeyboardEvent) => this.onKeyDown(ev);
  private keyUp = (ev: KeyboardEvent) => this.onKeyUp(ev);
  private onResize = () => this.resize();
  private onBlur = () => {
    if (this.phase === "playing") this.togglePause();
  };

  constructor(canvas: HTMLCanvasElement, onHud: (h: HudData) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.onHud = onHud;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    for (let i = 0; i < 42; i++)
      this.stars.push({ x: Math.random(), y: Math.random() * 0.65, r: rand(0.8, 2), p: rand(0, 6) });
    for (let i = 0; i < 6; i++)
      this.clouds.push({ x: Math.random() * 1400, y: rand(0.1, 0.48), s: rand(0.7, 1.4) });
    this.resize();
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    this.pushHud();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    this.audio.stopMusic();
  }

  /* ── public controls ─────────────────────────── */
  actionPress() {
    this.audio.unlock();
    if (this.phase === "playing") this.jump();
    else if (this.phase === "menu") this.begin();
    else if (this.phase === "over" && this.overT > 0.5) this.begin();
    else if (this.phase === "paused") this.togglePause();
  }
  pressJump() {
    this.jumpHeld = true;
    this.actionPress();
  }
  releaseJump() {
    this.jumpHeld = false;
  }
  setDuck(d: boolean) {
    this.keyDuck = d;
    this.player.ducking = d;
    if (d && this.phase === "playing" && this.player.onGround) {
      this.player.vy = Math.max(this.player.vy, 0);
    }
  }
  begin() {
    this.reset();
    this.phase = "playing";
    this.audio.unlock();
    this.audio.startMusic();
    this.audio.ui();
    this.pushHud();
  }
  togglePause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.audio.stopMusic();
      this.audio.ui();
    } else if (this.phase === "paused") {
      this.phase = "playing";
      this.audio.startMusic();
      this.audio.ui();
      this.lastT = 0;
    }
    this.pushHud();
  }
  toMenu() {
    this.phase = "menu";
    this.audio.stopMusic();
    this.audio.ui();
    this.pushHud();
  }
  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.pushHud();
  }

  private onKeyDown(ev: KeyboardEvent) {
    const c = ev.code;
    if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(c)) ev.preventDefault();
    if (c === "Space" || c === "ArrowUp" || c === "KeyW") {
      if (!ev.repeat) this.pressJump();
    } else if (c === "ArrowDown" || c === "KeyS") {
      if (!ev.repeat) this.setDuck(true);
    } else if (c === "KeyP" || c === "Escape") {
      if (this.phase === "playing" || this.phase === "paused") this.togglePause();
    } else if (c === "Enter") {
      this.actionPress();
    } else if (c === "KeyM") {
      this.toggleMute();
    }
  }
  private onKeyUp(ev: KeyboardEvent) {
    const c = ev.code;
    if (c === "Space" || c === "ArrowUp" || c === "KeyW") this.releaseJump();
    else if (c === "ArrowDown" || c === "KeyS") this.setDuck(false);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.u = Math.max(0.62, this.H / 540);
    this.groundY = this.H * 0.82;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.player.x = Math.max(110, this.W * 0.22);
    if (this.player.y > this.groundY) this.player.y = this.groundY;
    if (this.phase !== "playing") this.player.y = this.groundY;
  }

  private reset() {
    this.score = 0;
    this.dist = 0;
    this.elapsed = 0;
    this.lives = 3;
    this.newRecord = false;
    this.obstacles = [];
    this.foods = [];
    this.particles = [];
    this.floaters = [];
    this.player.y = this.groundY;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.ducking = false;
    this.player.hurtT = 0;
    this.player.invincibleT = 0;
    this.player.shieldT = 0;
    this.player.magnetT = 0;
    this.player.jumpBoostT = 0;
    this.player.fishT = 0;
    this.player.bigT = 0;
    this.player.visionT = 0;
    this.scoreMultiplier = 1;
    this.scoreMultiplierT = 0;
    this.luckBoost = false;
    this.luckBoostT = 0;
    // xp and charStage persist across runs
    for (const k of Object.keys(this.effects) as (keyof typeof this.effects)[]) this.effects[k].t = 0;
    this.obsT = 1.3;
    this.foodT = 0.5;
    this.milestone = 0;
    this.flashT = 0;
    this.shake = 0;
    this.overT = 0;
  }

  /* ── main loop ───────────────────────────────── */
  private loop(t: number) {
    if (this.destroyed) return;
    if (!this.lastT) this.lastT = t;
    const dt = Math.min(0.033, (t - this.lastT) / 1000);
    this.lastT = t;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
  }

  private update(dt: number) {
    this.time += dt;
    if (this.phase === "over") this.overT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.shake = Math.max(0, this.shake - dt * 34);

    if (this.phase === "menu") {
      this.scrollX += 70 * this.u * dt;
      this.player.y = this.groundY;
      this.player.runPhase += dt * 9;
      this.updateParticles(dt);
      return;
    }
    if (this.phase !== "playing") {
      this.updateParticles(dt);
      return;
    }

    const u = this.u;
    this.elapsed += dt;

    // timers
    for (const k of Object.keys(this.effects) as (keyof typeof this.effects)[])
      this.effects[k].t = Math.max(0, this.effects[k].t - dt);
    this.player.hurtT = Math.max(0, this.player.hurtT - dt);
    this.player.invincibleT = Math.max(0, this.player.invincibleT - dt);
    this.player.shieldT = Math.max(0, this.player.shieldT - dt);
    this.player.magnetT = Math.max(0, this.player.magnetT - dt);
    this.player.jumpBoostT = Math.max(0, this.player.jumpBoostT - dt);
    this.player.fishT = Math.max(0, this.player.fishT - dt);
    this.player.bigT = Math.max(0, this.player.bigT - dt);
    this.player.visionT = Math.max(0, this.player.visionT - dt);
    this.scoreMultiplierT = Math.max(0, this.scoreMultiplierT - dt);
    if (this.scoreMultiplierT <= 0) this.scoreMultiplier = 1;
    this.luckBoostT = Math.max(0, this.luckBoostT - dt);
    if (this.luckBoostT <= 0) this.luckBoost = false;
    this.flapCd = Math.max(0, this.flapCd - dt);

    const chili = this.effects.chili.t > 0;
    const fly = this.effects.fly.t > 0;
    const corn = this.effects.corn.t > 0;
    const disco = this.effects.disco.t > 0;

    const baseSpeed = (335 + Math.min(390, this.elapsed * 8.5)) * u;
    const worldSpeed = baseSpeed * (chili ? 1.65 : 1) * (corn ? 0.55 : 1);
    this.scrollX += worldSpeed * dt;
    this.dist += (worldSpeed * dt) / (46 * u);
    this.score += worldSpeed * dt * 0.022 * (disco ? 2 : 1);

    // milestone shout
    if (Math.floor(this.dist / 100) > this.milestone) {
      this.milestone = Math.floor(this.dist / 100);
      this.floater(this.player.x, this.groundY - 170 * u, `${faNum(this.milestone * 100)} متر!`, "#8ef0c3", 30);
      this.audio.coin();
    }

    // player physics
    const g = (fly ? 2350 : 3400) * u;
    const p = this.player;
    p.vy += g * dt;
    p.y += p.vy * dt;
    if (p.y >= this.groundY) {
      if (!p.onGround) {
        this.audio.land();
        this.burst(p.x, this.groundY, 5, "#a5793f", "smoke", 90);
      }
      p.y = this.groundY;
      p.vy = 0;
      p.onGround = true;
    } else p.onGround = false;
    p.ducking = this.keyDuck;
    p.runPhase += dt * (9 + worldSpeed / (30 * u));

    // hold-to-flap while fly power active
    if (fly && this.jumpHeld && !p.onGround && this.flapCd <= 0) {
      this.flap();
    }

    // trails
    this.trailCd -= dt;
    if (this.trailCd <= 0) {
      if (chili) {
        this.trailCd = 0.028;
        this.particle({
          x: p.x - 30 * u, y: p.y - rand(20, 60) * u,
          vx: -rand(120, 260) * u, vy: rand(-40, 40) * u,
          life: rand(0.25, 0.45), size: rand(3, 6), color: pick([["#ff9f1c", 1], ["#ff5722", 1], ["#ffd23f", 1]]),
          type: "dot", grav: 0,
        });
      }
      if (fly) {
        this.trailCd = 0.06;
        this.particle({
          x: p.x + rand(-20, 20) * u, y: p.y - rand(10, 80) * u,
          vx: -rand(40, 120) * u, vy: rand(-30, 10) * u,
          life: 0.5, size: rand(2, 4), color: "#c9ffe4", type: "star", grav: 0,
        });
      }
      if (disco) {
        this.trailCd = 0.09;
        this.particle({
          x: p.x + rand(-40, 40) * u, y: p.y - rand(0, 120) * u,
          vx: rand(-60, 60) * u, vy: -rand(40, 120) * u,
          life: rand(0.5, 0.9), size: rand(3, 5),
          color: `hsl(${Math.random() * 360},95%,62%)`, type: Math.random() > 0.5 ? "confetti" : "note", grav: 260,
        });
      }
    }

    // spawn obstacles (pattern-driven)
    this.obsT -= dt;
    if (this.obsT <= 0) {
      this.spawnPattern(worldSpeed);
    }
    this.foodT -= dt;
    if (this.foodT <= 0) {
      this.spawnFoodChain();
    }

    // move entities
    for (const o of this.obstacles) {
      const extraSpeed = o.kind === "crow" ? 85 * u : o.kind === "fox" ? 120 * u : o.kind === "bees" ? 60 * u : 0;
      o.x -= (worldSpeed + extraSpeed) * dt;
    }
    for (const f of this.foods) {
      f.x -= worldSpeed * dt;
      // magnet effect
      if (this.player.magnetT > 0) {
        const dx = this.player.x - f.x;
        const dy = (this.player.y - 40 * u) - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 * u) {
          f.x += (dx / dist) * 180 * u * dt;
          f.y += (dy / dist) * 180 * u * dt;
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => !o.dead && o.x > -180 * u);
    this.foods = this.foods.filter((f) => !f.dead && f.x > -120 * u);

    // collisions
    const duck = p.ducking && p.onGround;
    const ph = (duck ? 46 : 86) * u;
    const pw = 46 * u;
    const px0 = p.x - pw / 2 + 6 * u;
    const px1 = p.x + pw / 2 - 6 * u;
    const py0 = p.y - ph + 6 * u;
    const py1 = p.y - 2 * u;

    for (const o of this.obstacles) {
      if (o.x > p.x + 200 * u) break;
      const ox0 = o.x + 4 * u, ox1 = o.x + o.w - 4 * u;
      const oy0 = o.y + 4 * u, oy1 = o.y + o.h - 2 * u;
      if (px1 > ox0 && px0 < ox1 && py1 > oy0 && py0 < oy1) {
        if (chili || p.invincibleT > 0) this.smash(o);
        else if (p.shieldT > 0) {
          p.shieldT = 0;
          o.dead = true;
          this.burst(o.x + o.w / 2, o.y + o.h / 2, 10, "#4da6ff", "star", 150);
          this.floater(o.x + o.w / 2, o.y - 20 * u, "سپر!", "#4da6ff", 28);
        }
        else if (p.hurtT <= 0) this.hurt();
      }
    }
    for (const f of this.foods) {
      const r = 30 * u;
      if (f.x + r > px0 && f.x - r < px1 && f.y + r > py0 - 14 * u && f.y - r < py1) {
        f.dead = true;
        this.applyFood(f.kind, f.x, f.y);
      }
    }

    this.updateParticles(dt);
    for (const fl of this.floaters) {
      fl.y -= 62 * u * dt;
      fl.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    this.hudCd -= dt;
    if (this.hudCd <= 0) {
      this.hudCd = 0.08;
      this.pushHud();
    }
  }

  private updateParticles(dt: number) {
    const u = this.u;
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.vy += pt.grav * u * dt;
      pt.x += pt.vx * u * dt;
      pt.y += pt.vy * u * dt;
      pt.rot += pt.vr * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0 && pt.y < this.H + 40);
  }

  /* ── spawning ────────────────────────────────── */
  private makeObstacle(kind: ObstacleKind, x: number): Obstacle {
    const u = this.u;
    let w = 0, h = 0, y = 0;
    if (kind === "rock") {
      w = rand(40, 52) * u; h = rand(36, 48) * u; y = this.groundY - h;
    } else if (kind === "fence") {
      w = rand(42, 50) * u; h = rand(70, 88) * u; y = this.groundY - h;
    } else if (kind === "hay") {
      w = rand(60, 72) * u; h = rand(106, 126) * u; y = this.groundY - h;
    } else if (kind === "snake") {
      w = rand(60, 80) * u; h = rand(28, 36) * u; y = this.groundY - h;
    } else if (kind === "bees") {
      w = 50 * u; h = 35 * u; y = this.groundY - rand(70, 100) * u;
    } else if (kind === "fox") {
      w = rand(55, 65) * u; h = rand(40, 48) * u; y = this.groundY - h;
    } else { // crow
      w = 46 * u; h = 30 * u; y = this.groundY - rand(88, 116) * u;
    }
    return { kind, x, y, w, h, phase: rand(0, 6) };
  }

  private spawnPattern(worldSpeed: number) {
    const u = this.u;
    const elapsed = this.elapsed;
    const last = this.obstacles[this.obstacles.length - 1];
    // safe window: never too close to last obstacle
    const minGap = worldSpeed * 0.9;
    if (last && last.x > this.W - minGap) {
      this.obsT = 0.18;
      return;
    }
    const baseX = this.W + 40 * u;

    // difficulty tiers
    const tier = elapsed < 12 ? 0 : elapsed < 30 ? 1 : elapsed < 55 ? 2 : 3;

    // pick a pattern
    type Pattern = () => { obs: Obstacle[]; foods: { kind: FoodKind; x: number; y: number }[]; gap: number };
    const patterns: { fn: Pattern; w: number; minTier: number; maxTier?: number }[] = [
      // Tutorial — single rock + worm (first 12 seconds only)
      { minTier: 0, maxTier: 0, w: 60, fn: () => {
        const obs = [this.makeObstacle("rock", baseX)];
        const foods = [{ kind: "worm" as FoodKind, x: baseX + 120 * u, y: this.groundY - 26 * u }];
        return { obs, foods, gap: 1.8 };
      }},
      // Tier 0 — easy single obstacle + reward
      { minTier: 0, w: 40, fn: () => {
        const obs = [this.makeObstacle("rock", baseX)];
        const foods = [{ kind: "worm" as FoodKind, x: baseX + 140 * u, y: this.groundY - 26 * u }];
        return { obs, foods, gap: 1.55 };
      }},
      // Tier 0 — fence with butterfly arc reward
      { minTier: 0, w: 30, fn: () => {
        const obs = [this.makeObstacle("fence", baseX)];
        const foods: { kind: FoodKind; x: number; y: number }[] = [];
        for (let i = 0; i < 4; i++) {
          const t = i / 3;
          foods.push({
            kind: "butterfly",
            x: baseX + (60 + i * 52) * u,
            y: this.groundY - (90 + Math.sin(t * Math.PI) * 70) * u,
          });
        }
        return { obs, foods, gap: 1.7 };
      }},
      // Tier 1 — double rock with gap reward
      { minTier: 1, w: 22, fn: () => {
        const obs = [
          this.makeObstacle("rock", baseX),
          this.makeObstacle("rock", baseX + rand(180, 220) * u),
        ];
        const foods = [{ kind: "beetle" as FoodKind, x: baseX + 100 * u, y: this.groundY - 26 * u }];
        return { obs, foods, gap: 1.65 };
      }},
      // Tier 1 — reward after jump (chili above fence)
      { minTier: 1, w: 22, fn: () => {
        const obs = [this.makeObstacle("fence", baseX)];
        const foods = [{ kind: "chili" as FoodKind, x: baseX + 30 * u, y: this.groundY - 135 * u }];
        return { obs, foods, gap: 1.8 };
      }},
      // Tier 1 — worm row on ground
      { minTier: 0, w: 25, fn: () => {
        const foods: { kind: FoodKind; x: number; y: number }[] = [];
        for (let i = 0; i < 5; i++) {
          foods.push({ kind: "worm", x: baseX + i * 48 * u, y: this.groundY - 26 * u });
        }
        return { obs: [], foods, gap: 1.1 };
      }},
      // Tier 2 — crow + mushroom reward (fly over)
      { minTier: 2, w: 18, fn: () => {
        const obs = [this.makeObstacle("crow", baseX)];
        const foods = [{ kind: "mushroom" as FoodKind, x: baseX + 20 * u, y: this.groundY - 160 * u }];
        return { obs, foods, gap: 1.85 };
      }},
      // Tier 1 — snake + star reward (duck under)
      { minTier: 1, w: 20, fn: () => {
        const obs = [this.makeObstacle("snake", baseX)];
        const foods = [{ kind: "star" as FoodKind, x: baseX + 30 * u, y: this.groundY - 140 * u }];
        return { obs, foods, gap: 1.75 };
      }},
      // Tier 2 — bees + shield reward
      { minTier: 2, w: 16, fn: () => {
        const obs = [this.makeObstacle("bees", baseX)];
        const foods = [{ kind: "shield" as FoodKind, x: baseX + 25 * u, y: this.groundY - 150 * u }];
        return { obs, foods, gap: 1.9 };
      }},
      // Tier 2 — fox + rainbow reward
      { minTier: 2, w: 14, fn: () => {
        const obs = [this.makeObstacle("fox", baseX)];
        const foods = [{ kind: "rainbow" as FoodKind, x: baseX + 30 * u, y: this.groundY - 145 * u }];
        return { obs, foods, gap: 2.0 };
      }},
      // Tier 1 — hidden acorn (evolution)
      { minTier: 1, w: 12, fn: () => {
        const foods = [{ kind: "acorn" as FoodKind, x: baseX + rand(100, 200) * u, y: this.groundY - rand(80, 180) * u }];
        return { obs: [], foods, gap: 1.5 };
      }},
      // Tier 2 — hidden diamond
      { minTier: 2, w: 8, fn: () => {
        const foods = [{ kind: "diamond" as FoodKind, x: baseX + rand(120, 220) * u, y: this.groundY - rand(100, 200) * u }];
        return { obs: [], foods, gap: 1.6 };
      }},
      // Tier 2 — hay + note dance reward
      { minTier: 2, w: 16, fn: () => {
        const obs = [this.makeObstacle("hay", baseX)];
        const foods = [{ kind: "note" as FoodKind, x: baseX + 30 * u, y: this.groundY - 155 * u }];
        return { obs, foods, gap: 2.0 };
      }},
      // Tier 2 — staircase butterflies
      { minTier: 1, w: 18, fn: () => {
        const foods: { kind: FoodKind; x: number; y: number }[] = [];
        for (let i = 0; i < 5; i++) {
          foods.push({
            kind: "butterfly",
            x: baseX + i * 50 * u,
            y: this.groundY - (70 + i * 26) * u,
          });
        }
        return { obs: [], foods, gap: 1.2 };
      }},
      // Tier 3 — double fence with corn slow-mo reward
      { minTier: 3, w: 14, fn: () => {
        const gap = rand(150, 180) * u;
        const obs = [
          this.makeObstacle("fence", baseX),
          this.makeObstacle("fence", baseX + gap + 46 * u),
        ];
        const foods = [{ kind: "corn" as FoodKind, x: baseX + gap / 2 + 20 * u, y: this.groundY - 50 * u }];
        return { obs, foods, gap: 2.1 };
      }},
      // Tier 3 — egg in the sky (fly reward)
      { minTier: 2, w: 10, fn: () => {
        const foods = [{ kind: "egg" as FoodKind, x: baseX + 80 * u, y: this.groundY - 200 * u }];
        return { obs: [], foods, gap: 1.4 };
      }},
      // Tier 0 — apple (life)
      { minTier: 0, w: 8, fn: () => {
        const foods = [{ kind: "apple" as FoodKind, x: baseX + 80 * u, y: this.groundY - 26 * u }];
        return { obs: [], foods, gap: 1.3 };
      }},
    ];

    const eligible = patterns.filter((p) => p.minTier <= tier && (p.maxTier === undefined || p.maxTier >= tier));
    const totalW = eligible.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * totalW;
    let chosen = eligible[0];
    for (const p of eligible) {
      r -= p.w;
      if (r <= 0) { chosen = p; break; }
    }
    const result = chosen.fn();
    for (const o of result.obs) this.obstacles.push(o);
    for (const f of result.foods) {
      this.foods.push({ kind: f.kind, x: f.x, y: f.y, phase: rand(0, 6) });
    }
    // gap scales slightly with difficulty; very generous at start
    const earlyMul = elapsed < 6 ? 1.45 : elapsed < 15 ? 1.15 : 1;
    const gapMul = Math.max(0.82, 1 - elapsed * 0.0025) * earlyMul;
    // if no obstacles in pattern, give breathing room
    const baseGap = result.obs.length === 0 ? Math.max(result.gap, 0.9) : result.gap;
    this.obsT = baseGap * gapMul + rand(-0.1, 0.1);
    this.foodT = rand(0.7, 1.3);
  }

  private spawnFoodChain() {
    // Occasional bonus food chains between patterns (decorative)
    const u = this.u;
    if (Math.random() < 0.55) {
      this.foodT = rand(0.55, 0.9);
      return;
    }
    const baseX = this.W + rand(40, 120) * u;
    const kind: FoodKind = Math.random() < 0.5 ? "beetle" : "worm";
    const count = Math.floor(rand(3, 5));
    for (let i = 0; i < count; i++) {
      this.foods.push({
        kind,
        x: baseX + i * 48 * u,
        y: this.groundY - 26 * u,
        phase: rand(0, 6),
      });
    }
    this.foodT = rand(1.1, 1.8);
  }

  /* ── actions ─────────────────────────────────── */
  private jump() {
    const p = this.player;
    const u = this.u;
    if (p.onGround) {
      const jumpPower = p.jumpBoostT > 0 ? -1450 : -1170;
      p.vy = jumpPower * u;
      p.onGround = false;
      p.ducking = false;
      this.audio.jump();
      this.burst(p.x, this.groundY, 6, "#b98d4f", "smoke", 110);
    } else if (this.effects.fly.t > 0) {
      this.flap();
    }
  }
  private flap() {
    const u = this.u;
    this.player.vy = -640 * u;
    this.flapCd = 0.17;
    this.audio.flap();
    this.burst(this.player.x - 16 * u, this.player.y - 30 * u, 3, "#c9ffe4", "star", 70);
  }

  private addScore(n: number) {
    const mul = (this.effects.disco.t > 0 ? 2 : 1) * this.scoreMultiplier;
    this.score += n * mul;
  }

  private applyFood(kind: FoodKind, x: number, y: number) {
    const u = this.u;
    this.burst(x, y, 8, "#ffd23f", "star", 130);
    const labels: Record<FoodKind, string> = {
      worm: "+۱۵۰", beetle: "+۱۰۰", butterfly: "+۲۰۰", egg: "+۵۰۰!",
      apple: "", chili: "تند و تیز!", mushroom: "بال‌ها باز شد!",
      corn: "اسلوموشن!", note: "برقص! ×۲",
      star: "نامرایی!", magnet: "آهنربا!", shield: "سپر!",
      rainbow: "رنگین‌کمان!", pepper: "سنگ‌شکن!", honey: "عسل ×۳!",
      diamond: "+۱۰۰۰!", feather: "پرش بلند!", clover: "شانس!",
      acorn: "رشد!", berry: "سلامتی!", grain: "+۸۰",
      fish: "شنای هوایی!", cheese: "بزرگ!", carrot: "دید بهتر!",
      golden_egg: "رشد فوری!",
    };
    const colors: Record<FoodKind, string> = {
      worm: "#ff9ec4", beetle: "#ffb3ad", butterfly: "#ffcf8a",
      egg: "#ffd75e", apple: "#ff8a80", chili: "#ff8a3c",
      mushroom: "#8ef0c3", corn: "#ffe08a", note: "#f0a1ff",
      star: "#fffacd", magnet: "#c0c0c0", shield: "#4da6ff",
      rainbow: "#ff69b4", pepper: "#8b0000", honey: "#ffb347",
      diamond: "#00ffff", feather: "#e6e6fa", clover: "#32cd32",
      acorn: "#8b4513", berry: "#9370db", grain: "#f5deb3",
      fish: "#87ceeb", cheese: "#ffd700", carrot: "#ff8c00",
      golden_egg: "#ffd700",
    };
    switch (kind) {
      case "worm": this.addScore(150); this.audio.eat(); break;
      case "beetle": this.addScore(100); this.audio.eat(); break;
      case "butterfly": this.addScore(200); this.audio.eat(); break;
      case "grain": this.addScore(80); this.audio.eat(); break;
      case "egg":
        this.addScore(500); this.audio.coin();
        this.burst(x, y, 10, "#ffe9a3", "star", 190);
        break;
      case "diamond":
        this.addScore(1000); this.audio.coin();
        this.burst(x, y, 15, "#00ffff", "star", 220);
        break;
      case "apple":
        if (this.lives < 3) {
          this.lives++; this.audio.heart();
          this.floater(x, y - 20 * u, "جانِ اضافه!", "#ff8a80", 30);
        } else {
          this.addScore(300); this.audio.heart();
          labels.apple = "+۳۰۰";
        }
        break;
      case "berry":
        if (this.lives < 3) {
          this.lives++; this.audio.heart();
          this.floater(x, y - 20 * u, "سلامتی!", "#9370db", 28);
        } else {
          this.addScore(250); this.audio.eat();
          labels.berry = "+۲۵۰";
        }
        break;
      case "chili":
        this.effects.chili.t = this.effects.chili.dur;
        this.audio.power();
        break;
      case "pepper":
        this.effects.chili.t = this.effects.chili.dur * 1.5;
        this.audio.power();
        break;
      case "mushroom":
        this.effects.fly.t = this.effects.fly.dur;
        this.audio.power();
        break;
      case "corn":
        this.effects.corn.t = this.effects.corn.dur;
        this.audio.power();
        break;
      case "note":
        this.effects.disco.t = this.effects.disco.dur;
        this.audio.dance();
        break;
      case "star":
        this.player.invincibleT = 6;
        this.audio.power();
        this.burst(x, y, 12, "#fffacd", "star", 180);
        break;
      case "shield":
        this.player.shieldT = 8;
        this.audio.power();
        break;
      case "magnet":
        this.player.magnetT = 10;
        this.audio.power();
        break;
      case "rainbow":
        this.effects.chili.t = this.effects.chili.dur;
        this.effects.fly.t = this.effects.fly.dur;
        this.effects.disco.t = this.effects.disco.dur;
        this.player.invincibleT = 5;
        this.audio.power();
        this.burst(x, y, 20, `hsl(${Math.random() * 360},95%,62%)`, "confetti", 200);
        break;
      case "honey":
        this.scoreMultiplier = 3;
        this.scoreMultiplierT = 8;
        this.audio.power();
        break;
      case "feather":
        this.player.jumpBoostT = 10;
        this.audio.power();
        break;
      case "clover":
        this.luckBoost = true;
        this.luckBoostT = 15;
        this.audio.power();
        break;
      case "fish":
        this.player.fishT = 8;
        this.audio.power();
        break;
      case "cheese":
        this.player.bigT = 10;
        this.audio.power();
        break;
      case "carrot":
        this.player.visionT = 12;
        this.audio.power();
        break;
      case "acorn":
        this.xp += 1;
        this.checkEvolution();
        this.audio.power();
        this.burst(x, y, 10, "#8b4513", "star", 160);
        break;
      case "golden_egg":
        this.xp += 3;
        this.checkEvolution();
        this.audio.coin();
        this.burst(x, y, 15, "#ffd700", "star", 200);
        break;
    }
    if (labels[kind]) this.floater(x, y - 24 * u, labels[kind], colors[kind], kind === "egg" || kind === "diamond" || kind === "golden_egg" ? 34 : 26);
  }

  private checkEvolution() {
    const u = this.u;
    const idx = CHAR_STAGES.indexOf(this.charStage);
    if (idx < CHAR_STAGES.length - 1) {
      const nextNeed = CHAR_XP_NEED[idx + 1];
      if (this.xp >= nextNeed) {
        this.charStage = CHAR_STAGES[idx + 1];
        this.audio.power();
        this.burst(this.player.x, this.player.y - 40 * u, 20, "#ffd700", "star", 250);
        this.floater(this.player.x, this.player.y - 80 * u, `${CHAR_NAMES[this.charStage]} شد!`, "#ffd700", 36);
      }
    }
  }

  private smash(o: Obstacle) {
    const u = this.u;
    o.dead = true;
    this.addScore(75);
    this.shake = Math.max(this.shake, 9);
    this.audio.smash();
    this.floater(o.x + o.w / 2, o.y - 16 * u, "خُرد شد! +۷۵", "#ffb347", 26);
    const colors = ["#ff9f1c", "#ff5722", "#ffd23f", "#c8b08a"];
    for (let i = 0; i < 16; i++) {
      this.particle({
        x: o.x + o.w / 2, y: o.y + o.h / 2,
        vx: rand(-320, 320), vy: rand(-380, 60),
        life: rand(0.35, 0.7), size: rand(3, 6),
        color: colors[i % 4], type: Math.random() > 0.4 ? "dot" : "smoke", grav: 700,
      });
    }
  }

  private hurt() {
    const u = this.u;
    this.lives--;
    this.player.hurtT = 1.7;
    this.flashT = 0.4;
    this.shake = 13;
    this.audio.hurt();
    this.floater(this.player.x, this.player.y - 120 * u, "آخ!", "#ff6b5e", 34);
    for (let i = 0; i < 12; i++) {
      this.particle({
        x: this.player.x, y: this.player.y - 50 * u,
        vx: rand(-260, 260), vy: rand(-340, -40),
        life: rand(0.5, 1), size: rand(4, 7),
        color: pick([["#fdf4dd", 2], ["#f3ddab", 1], ["#e5342b", 1]]),
        type: "feather", grav: 420,
      });
    }
    if (this.lives <= 0) this.gameOver();
    else this.pushHud();
  }

  private gameOver() {
    this.phase = "over";
    this.overT = 0;
    this.audio.stopMusic();
    const sc = Math.floor(this.score);
    if (sc > this.best) {
      this.best = sc;
      this.newRecord = true;
      localStorage.setItem(BEST_KEY, String(sc));
      this.audio.record();
      for (let i = 0; i < 60; i++) {
        this.particle({
          x: rand(0, this.W), y: rand(-80, -10),
          vx: rand(-60, 60), vy: rand(60, 220),
          life: rand(1.2, 2.4), size: rand(3, 6),
          color: `hsl(${Math.random() * 360},95%,60%)`, type: "confetti", grav: 160,
        });
      }
    } else {
      this.audio.over();
    }
    this.pushHud();
  }

  /* ── helpers ─────────────────────────────────── */
  private particle(o: {
    x: number; y: number; vx: number; vy: number; life: number; size: number;
    color: string; type: Particle["type"]; grav: number;
  }) {
    if (this.particles.length > 320) this.particles.shift();
    this.particles.push({
      ...o,
      vx: o.vx, vy: o.vy,
      maxLife: o.life,
      rot: rand(0, 6), vr: rand(-9, 9),
    });
  }
  private burst(x: number, y: number, n: number, color: string, type: Particle["type"], speed: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.4, speed);
      this.particle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3,
        life: rand(0.3, 0.65), size: rand(2.5, 5), color, type, grav: type === "star" ? 60 : 300,
      });
    }
  }
  private floater(x: number, y: number, txt: string, color: string, size: number) {
    this.floaters.push({ x, y, txt, life: 1.1, color, size });
  }

  private pushHud() {
    const eff: HudEffect[] = [];
    const meta: { k: EffectKey; id: string; label: string; color: string }[] = [
      { k: "chili", id: "chili", label: "فلفل تند", color: "#ff8a3c" },
      { k: "fly", id: "fly", label: "بال‌زدن", color: "#8ef0c3" },
      { k: "corn", id: "corn", label: "اسلوموشن", color: "#ffe08a" },
      { k: "disco", id: "disco", label: "دیسکو ×۲", color: "#f0a1ff" },
    ];
    for (const m of meta) {
      if (this.effects[m.k].t > 0)
        eff.push({ id: m.id, label: m.label, t: this.effects[m.k].t, dur: this.effects[m.k].dur, color: m.color });
    }
    this.onHud({
      phase: this.phase,
      score: Math.floor(this.score),
      best: this.best,
      lives: this.lives,
      dist: Math.floor(this.dist),
      effects: eff,
      newRecord: this.newRecord,
      muted: this.audio.muted,
      xp: this.xp,
      charStage: this.charStage,
    });
  }

  /* ── render ──────────────────────────────────── */
  private draw() {
    const ctx = this.ctx;
    const u = this.u;
    this.dusk = (Math.sin(this.scrollX * 0.00016 - Math.PI / 2) + 1) / 2;
    ctx.fillStyle = "#0a2c18";
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * u * 0.7, (Math.random() - 0.5) * this.shake * u * 0.7);
    }
    drawBackground(ctx, this);
    drawGround(ctx, this);
    for (const f of this.foods) drawFood(ctx, f, this);
    for (const o of this.obstacles) drawObstacle(ctx, o, this);
    drawPlayer(ctx, this);
    for (const pt of this.particles) drawParticle(ctx, pt, this);
    drawFloaters(ctx, this);
    ctx.restore();
    drawFX(ctx, this);
  }
}
