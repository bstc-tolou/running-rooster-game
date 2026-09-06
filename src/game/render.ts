/* All procedural canvas drawing — no image assets. */
import type { Engine, Obstacle, Food, Particle } from "./engine";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a: string, b: string, t: number, alpha = 1): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgba(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(
    lerp(ca[2], cb[2], t)
  )},${alpha})`;
}

/* ── sky / parallax world ─────────────────────────────────────── */
export function drawBackground(ctx: CanvasRenderingContext2D, e: Engine) {
  const { W, H, u, dusk, groundY, scrollX, time } = e;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, mix("#2f8fd4", "#33245e", dusk));
  sky.addColorStop(0.62, mix("#8ed0e8", "#8f4f86", dusk));
  sky.addColorStop(1, mix("#ffe29a", "#ff8f56", dusk));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY + 4);

  // stars at dusk
  if (dusk > 0.35) {
    ctx.fillStyle = `rgba(255,250,220,${(dusk - 0.35) * 1.2})`;
    for (const s of e.stars) {
      const tw = 0.6 + 0.4 * Math.sin(time * 2.4 + s.p);
      ctx.globalAlpha = tw * ((dusk - 0.35) * 1.3);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * groundY, s.r * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sun
  const sunX = W * 0.76;
  const sunY = lerp(H * 0.16, H * 0.4, dusk);
  const sunR = 46 * u;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  glow.addColorStop(0, mix("#fff3b0", "#ffc46b", dusk, 0.9));
  glow.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 3.2, sunY - sunR * 3.2, sunR * 6.4, sunR * 6.4);
  ctx.fillStyle = mix("#ffdf6b", "#ffb14d", dusk);
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // clouds
  for (const c of e.clouds) {
    const cx = ((c.x - scrollX * 0.12) % (W + 300 * u) + W + 300 * u) % (W + 300 * u) - 150 * u;
    ctx.fillStyle = mix("#ffffff", "#f3d9e2", dusk, 0.85);
    const s = c.s * u;
    ctx.beginPath();
    ctx.ellipse(cx, c.y * groundY, 46 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 30 * s, c.y * groundY - 12 * s, 30 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 32 * s, c.y * groundY - 8 * s, 26 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // far mountains
  drawRidge(ctx, e, 0.18, groundY - 96 * u, 150 * u, 110 * u, mix("#3f7fa6", "#41377c", dusk));
  // mid hills
  drawRidge(ctx, e, 0.34, groundY - 40 * u, 190 * u, 74 * u, mix("#47a35f", "#33616e", dusk));

  // barns + fence line
  const spacing = 560 * u;
  const off = ((scrollX * 0.55) % spacing + spacing) % spacing;
  for (let x = -off; x < W + spacing; x += spacing) {
    drawBarn(ctx, x + 200 * u, groundY - 34 * u, u, dusk);
  }
  const fs = 92 * u;
  const foff = ((scrollX * 0.55) % fs + fs) % fs;
  ctx.fillStyle = mix("#8a5a33", "#5e4030", dusk);
  for (let x = -foff; x < W + fs; x += fs) {
    ctx.fillRect(x, groundY - 46 * u, 7 * u, 46 * u);
  }
  ctx.fillRect(0, groundY - 40 * u, W, 5 * u);
  ctx.fillRect(0, groundY - 24 * u, W, 5 * u);
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  e: Engine,
  par: number,
  baseY: number,
  w: number,
  h: number,
  color: string
) {
  const { W, groundY } = e;
  const off = ((e.scrollX * par) % w + w) % w;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w, groundY + 10);
  for (let x = -off - w; x < W + w; x += w) {
    ctx.quadraticCurveTo(x + w * 0.25, baseY - h, x + w * 0.5, baseY);
    ctx.quadraticCurveTo(x + w * 0.75, baseY - h * 0.55, x + w, baseY);
  }
  ctx.lineTo(W + w, groundY + 10);
  ctx.closePath();
  ctx.fill();
}

function drawBarn(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, dusk: number) {
  const w = 120 * u;
  const h = 78 * u;
  ctx.fillStyle = mix("#b23a31", "#6e2b3c", dusk);
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = mix("#8c2b24", "#571f30", dusk);
  ctx.beginPath();
  ctx.moveTo(x - 10 * u, y - h);
  ctx.lineTo(x + w / 2, y - h - 34 * u);
  ctx.lineTo(x + w + 10 * u, y - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix("#fff2d8", "#e8c9a8", dusk, 0.9);
  ctx.fillRect(x + w / 2 - 14 * u, y - 40 * u, 28 * u, 40 * u);
  ctx.strokeStyle = mix("#7c241d", "#4a1a28", dusk);
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(x + w / 2 - 14 * u, y - 40 * u, 28 * u, 40 * u);
}

/* ── ground ───────────────────────────────────────────────────── */
export function drawGround(ctx: CanvasRenderingContext2D, e: Engine) {
  const { W, H, u, groundY, dusk, scrollX } = e;
  ctx.fillStyle = mix("#4cb944", "#2e7d56", dusk);
  ctx.fillRect(0, groundY, W, 16 * u);
  ctx.fillStyle = mix("#8a5a2b", "#5e4632", dusk);
  ctx.fillRect(0, groundY + 16 * u, W, H - groundY);
  ctx.fillStyle = mix("#6f451f", "#4a3626", dusk);
  ctx.fillRect(0, groundY + 16 * u, W, 4 * u);

  // pebbles / specks scrolling
  const sp = 64 * u;
  const off = ((scrollX) % sp + sp) % sp;
  ctx.fillStyle = mix("#75491f", "#51382a", dusk, 0.8);
  let i = 0;
  for (let x = -off; x < W + sp; x += sp, i++) {
    const yy = groundY + 30 * u + ((i * 37) % 5) * 14 * u;
    ctx.beginPath();
    ctx.ellipse(x + (i % 3) * 12 * u, yy > H - 8 ? H - 8 : yy, 6 * u, 3.4 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // grass tufts on the strip
  const gs = 84 * u;
  const goff = ((scrollX) % gs + gs) % gs;
  ctx.strokeStyle = mix("#2f8f33", "#1e5f43", dusk);
  ctx.lineWidth = 3 * u;
  ctx.lineCap = "round";
  let j = 0;
  for (let x = -goff; x < W + gs; x += gs, j++) {
    const gx = x + (j % 2) * 30 * u;
    const sway = Math.sin(e.time * 3 + j) * 2 * u;
    ctx.beginPath();
    ctx.moveTo(gx, groundY + 2 * u);
    ctx.quadraticCurveTo(gx + sway, groundY - 8 * u, gx + sway + 3 * u, groundY - 13 * u);
    ctx.moveTo(gx + 5 * u, groundY + 2 * u);
    ctx.quadraticCurveTo(gx + 8 * u + sway, groundY - 6 * u, gx + 10 * u + sway, groundY - 10 * u);
    ctx.stroke();
  }
}

/* ── obstacles ────────────────────────────────────────────────── */
export function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, e: Engine) {
  const u = e.u;
  const dusk = e.dusk;
  ctx.lineWidth = 3 * u;
  if (o.kind === "rock") {
    ctx.fillStyle = mix("#a7b0ba", "#6f7894", dusk);
    ctx.strokeStyle = "#39414f";
    ctx.beginPath();
    ctx.moveTo(o.x + 4 * u, o.y + o.h);
    ctx.lineTo(o.x, o.y + o.h * 0.45);
    ctx.lineTo(o.x + o.w * 0.3, o.y + 2 * u);
    ctx.lineTo(o.x + o.w * 0.72, o.y);
    ctx.lineTo(o.x + o.w, o.y + o.h * 0.5);
    ctx.lineTo(o.x + o.w - 3 * u, o.y + o.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(57,65,79,0.55)";
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.35, o.y + o.h * 0.25);
    ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.85);
    ctx.stroke();
  } else if (o.kind === "fence") {
    ctx.fillStyle = mix("#b07a44", "#7d5636", dusk);
    ctx.strokeStyle = "#55371c";
    const pw = 9 * u;
    for (let i = 0; i < 2; i++) {
      const px = o.x + i * (o.w - pw);
      ctx.fillRect(px, o.y, pw, o.h);
      ctx.strokeRect(px, o.y, pw, o.h);
    }
    ctx.fillRect(o.x - 4 * u, o.y + o.h * 0.22, o.w + 8 * u, 8 * u);
    ctx.strokeRect(o.x - 4 * u, o.y + o.h * 0.22, o.w + 8 * u, 8 * u);
    ctx.fillRect(o.x - 4 * u, o.y + o.h * 0.62, o.w + 8 * u, 8 * u);
    ctx.strokeRect(o.x - 4 * u, o.y + o.h * 0.62, o.w + 8 * u, 8 * u);
  } else if (o.kind === "hay") {
    ctx.fillStyle = mix("#e8b64c", "#a97f3e", dusk);
    ctx.strokeStyle = "#7a5518";
    const r = 10 * u;
    ctx.beginPath();
    ctx.roundRect(o.x, o.y, o.w, o.h, r);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(122,85,24,0.65)";
    ctx.lineWidth = 2.5 * u;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(o.x + 6 * u, o.y + (o.h / 4) * i);
      ctx.bezierCurveTo(
        o.x + o.w * 0.3,
        o.y + (o.h / 4) * i - 6 * u,
        o.x + o.w * 0.7,
        o.y + (o.h / 4) * i + 6 * u,
        o.x + o.w - 6 * u,
        o.y + (o.h / 4) * i
      );
      ctx.stroke();
    }
  } else {
    // crow
    const flap = Math.sin(e.time * 22 + o.phase) * 0.9;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2 + Math.sin(e.time * 6 + o.phase) * 4 * u;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#23252d";
    ctx.strokeStyle = "#0d0e12";
    ctx.lineWidth = 2.5 * u;
    // wings
    ctx.save();
    ctx.rotate(flap * 0.6);
    ctx.beginPath();
    ctx.ellipse(-4 * u, -8 * u, 17 * u, 7 * u, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // body
    ctx.beginPath();
    ctx.ellipse(0, 0, 15 * u, 10 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // head + beak (facing left, toward player)
    ctx.beginPath();
    ctx.arc(-13 * u, -6 * u, 7 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.moveTo(-20 * u, -7 * u);
    ctx.lineTo(-27 * u, -4.5 * u);
    ctx.lineTo(-20 * u, -2.5 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-14.5 * u, -7.5 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-15 * u, -7.5 * u, 1 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ── foods ────────────────────────────────────────────────────── */
export function drawFood(ctx: CanvasRenderingContext2D, f: Food, e: Engine) {
  const u = e.u;
  const bob = Math.sin(e.time * 4 + f.phase) * 4 * u;
  const cx = f.x;
  const cy = f.y + bob;
  const s = u;

  const glowColors: Partial<Record<Food["kind"], string>> = {
    chili: "255,110,40",
    mushroom: "120,240,180",
    corn: "255,214,90",
    note: "240,90,255",
    apple: "255,90,90",
    egg: "255,215,80",
  };
  const gc = glowColors[f.kind];
  if (gc) {
    const pulse = 0.5 + 0.5 * Math.sin(e.time * 5 + f.phase);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34 * s * (0.9 + pulse * 0.25));
    g.addColorStop(0, `rgba(${gc},${0.4 + pulse * 0.2})`);
    g.addColorStop(1, `rgba(${gc},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 36 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = "round";

  switch (f.kind) {
    case "worm": {
      const wig = Math.sin(e.time * 8 + f.phase) * 3 * s;
      ctx.strokeStyle = "#ff7bac";
      ctx.lineWidth = 7 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, 4 * s);
      ctx.quadraticCurveTo(-6 * s, -6 * s + wig, 0, 2 * s);
      ctx.quadraticCurveTo(6 * s, 9 * s + wig, 12 * s, -2 * s);
      ctx.stroke();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(12 * s, -3 * s, 1.6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "beetle": {
      ctx.fillStyle = "#3c2415";
      ctx.beginPath();
      ctx.arc(-9 * s, 0, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d1342f";
      ctx.strokeStyle = "#5c1410";
      ctx.beginPath();
      ctx.ellipse(3 * s, 0, 11 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2b0d0a";
      for (const [dx, dy] of [
        [-1, -3],
        [4, -4],
        [7, 1],
        [1, 3],
      ]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#2b1608";
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo((-2 + i * 5) * s, 7 * s);
        ctx.lineTo((-4 + i * 5) * s, 12 * s);
        ctx.stroke();
      }
      break;
    }
    case "butterfly": {
      const fl = Math.abs(Math.sin(e.time * 14 + f.phase));
      ctx.fillStyle = "#ff8500";
      ctx.strokeStyle = "#8a4500";
      ctx.save();
      ctx.scale(1, 0.5 + fl * 0.6);
      ctx.beginPath();
      ctx.ellipse(-7 * s, -3 * s, 8 * s, 10 * s, -0.35, 0, Math.PI * 2);
      ctx.ellipse(7 * s, -3 * s, 8 * s, 10 * s, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#29b6f6";
      ctx.beginPath();
      ctx.ellipse(-6 * s, 6 * s, 5 * s, 6 * s, -0.3, 0, Math.PI * 2);
      ctx.ellipse(6 * s, 6 * s, 5 * s, 6 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a12";
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "chili": {
      ctx.rotate(0.5);
      ctx.fillStyle = "#e8261b";
      ctx.strokeStyle = "#7e0f08";
      ctx.beginPath();
      ctx.moveTo(-4 * s, -12 * s);
      ctx.quadraticCurveTo(12 * s, -6 * s, 8 * s, 8 * s);
      ctx.quadraticCurveTo(5 * s, 15 * s, -1 * s, 12 * s);
      ctx.quadraticCurveTo(6 * s, 4 * s, -8 * s, -8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2f9e44";
      ctx.beginPath();
      ctx.ellipse(-4 * s, -13 * s, 4.5 * s, 2.6 * s, 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "mushroom": {
      ctx.fillStyle = "#ffe8c9";
      ctx.strokeStyle = "#a9743f";
      ctx.beginPath();
      ctx.roundRect(-6 * s, -2 * s, 12 * s, 14 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e5342b";
      ctx.strokeStyle = "#8c1712";
      ctx.beginPath();
      ctx.moveTo(-15 * s, -1 * s);
      ctx.quadraticCurveTo(0, -20 * s, 15 * s, -1 * s);
      ctx.quadraticCurveTo(0, -7 * s, -15 * s, -1 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      for (const [dx, dy, r] of [
        [-7, -8, 2.4],
        [1, -12, 2.8],
        [8, -7, 2.2],
      ]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "corn": {
      ctx.rotate(-0.3);
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = "#a9743f";
      ctx.beginPath();
      ctx.ellipse(0, -2 * s, 8 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(169,116,63,0.7)";
      ctx.lineWidth = 1.6 * s;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3 * s, -13 * s);
        ctx.lineTo(i * 3 * s, 9 * s);
        ctx.stroke();
      }
      ctx.fillStyle = "#2f9e44";
      ctx.beginPath();
      ctx.ellipse(-7 * s, 8 * s, 4 * s, 9 * s, 0.5, 0, Math.PI * 2);
      ctx.ellipse(7 * s, 8 * s, 4 * s, 9 * s, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "note": {
      ctx.fillStyle = "#e040fb";
      ctx.strokeStyle = "#6a1b9a";
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.ellipse(-5 * s, 8 * s, 5.4 * s, 4.2 * s, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#e040fb";
      ctx.lineWidth = 3.4 * s;
      ctx.beginPath();
      ctx.moveTo(-0.4 * s, 7 * s);
      ctx.lineTo(-0.4 * s, -10 * s);
      ctx.quadraticCurveTo(8 * s, -8 * s, 9 * s, -1 * s);
      ctx.stroke();
      break;
    }
    case "apple": {
      ctx.fillStyle = "#e5342b";
      ctx.strokeStyle = "#7e140e";
      ctx.beginPath();
      ctx.arc(-4 * s, 2 * s, 9 * s, 0, Math.PI * 2);
      ctx.arc(4 * s, 2 * s, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2f9e44";
      ctx.beginPath();
      ctx.ellipse(3 * s, -9 * s, 5 * s, 2.6 * s, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5c3a12";
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, -6 * s);
      ctx.quadraticCurveTo(1 * s, -11 * s, 3 * s, -12 * s);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(-6 * s, -1 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "egg": {
      ctx.fillStyle = "#ffd75e";
      ctx.strokeStyle = "#b07d10";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(-3 * s, -4 * s, 2.6 * s, 4.4 * s, 0.4, 0, Math.PI * 2);
      ctx.fill();
      const tw = 0.5 + 0.5 * Math.sin(e.time * 6 + f.phase);
      ctx.strokeStyle = `rgba(255,255,255,${tw})`;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(6 * s, -12 * s);
      ctx.lineTo(6 * s, -5 * s);
      ctx.moveTo(2.5 * s, -8.5 * s);
      ctx.lineTo(9.5 * s, -8.5 * s);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/* ── the hero rooster ─────────────────────────────────────────── */
export function drawPlayer(ctx: CanvasRenderingContext2D, e: Engine) {
  const u = e.u;
  const p = e.player;
  const x = p.x;
  const y = p.y;
  // invincible blink
  if (p.hurtT > 0 && Math.sin(e.time * 42) > 0.2) return;

  const dancing = e.effects.disco.t > 0;
  const flying = e.effects.fly.t > 0;
  const chili = e.effects.chili.t > 0;

  // aura glows
  if (flying || chili || dancing) {
    const [c1, c2] = flying
      ? ["rgba(140,255,200,0.4)", "rgba(140,255,200,0)"]
      : dancing
        ? [`hsla(${(e.time * 260) % 360},100%,65%,0.42)`, `hsla(${(e.time * 260) % 360},100%,65%,0)`]
        : ["rgba(255,140,40,0.42)", "rgba(255,140,40,0)"];
    const g = ctx.createRadialGradient(x, y - 44 * u, 4, x, y - 44 * u, 74 * u);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 44 * u, 74 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  const duck = p.ducking && p.onGround;
  const danceHop = dancing ? Math.abs(Math.sin(e.time * 9)) * 10 * u : 0;
  const tilt = dancing ? Math.sin(e.time * 12) * 0.32 : chili ? -0.08 : 0;
  ctx.translate(x, y - danceHop);
  ctx.rotate(tilt);
  if (duck) ctx.scale(1.18, 0.66);

  const run = p.runPhase;
  const airborne = !p.onGround;
  const outline = "#43250f";
  ctx.lineWidth = 3 * u;
  ctx.lineJoin = "round";
  ctx.strokeStyle = outline;

  // legs
  ctx.lineWidth = 4.4 * u;
  ctx.strokeStyle = "#f4a300";
  const legA = airborne ? 0.5 : Math.sin(run) * 0.85;
  const legB = airborne ? -0.3 : Math.sin(run + Math.PI) * 0.85;
  for (const la of [legA, legB]) {
    const kx = Math.sin(la) * 10 * u;
    const ky = -14 * u + Math.cos(la) * 6 * u * (airborne ? 0.4 : 1);
    ctx.beginPath();
    ctx.moveTo(-2 * u, -24 * u);
    ctx.lineTo(kx, ky);
    ctx.lineTo(kx + 8 * u, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * u;

  // tail feathers (sweeping back-left)
  const tailColors = ["#128a52", "#0d5e3a", "#23b06b"];
  for (let i = 0; i < 3; i++) {
    const sw = Math.sin(e.time * 7 + i) * 3 * u;
    ctx.fillStyle = tailColors[i];
    ctx.beginPath();
    ctx.moveTo(-16 * u, -44 * u);
    ctx.quadraticCurveTo(-46 * u - i * 7 * u, -66 * u - i * 9 * u + sw, -52 * u - i * 9 * u, -30 * u - i * 12 * u + sw);
    ctx.quadraticCurveTo(-40 * u, -34 * u - i * 4 * u, -14 * u, -30 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // body
  ctx.fillStyle = "#fdf4dd";
  ctx.beginPath();
  ctx.ellipse(0, -44 * u, 27 * u, 24 * u, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // breast shading
  ctx.fillStyle = "rgba(240,190,120,0.5)";
  ctx.beginPath();
  ctx.ellipse(10 * u, -38 * u, 14 * u, 12 * u, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // wing
  let wingA = Math.sin(run * 0.5) * 0.15 - 0.15;
  if (flying) wingA = Math.sin(e.time * 34) * 1.05 - 0.4;
  else if (airborne) wingA = -0.75 + Math.sin(e.time * 16) * 0.2;
  else if (dancing) wingA = Math.sin(e.time * 12) * 0.9 - 0.5;
  ctx.save();
  ctx.translate(-4 * u, -46 * u);
  ctx.rotate(wingA);
  ctx.fillStyle = "#f3ddab";
  ctx.beginPath();
  ctx.ellipse(0, 8 * u, 11 * u, 17 * u, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // head
  const hx = duck ? 24 * u : 20 * u;
  const hy = duck ? -40 * u : -70 * u;
  ctx.fillStyle = "#fdf4dd";
  ctx.beginPath();
  ctx.arc(hx, hy, 13.5 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // comb
  ctx.fillStyle = "#e5342b";
  ctx.beginPath();
  ctx.arc(hx - 7 * u, hy - 12 * u, 5 * u, 0, Math.PI * 2);
  ctx.arc(hx - 1 * u, hy - 15 * u, 5.6 * u, 0, Math.PI * 2);
  ctx.arc(hx + 5.5 * u, hy - 12 * u, 4.6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // beak
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath();
  ctx.moveTo(hx + 12 * u, hy - 4 * u);
  ctx.lineTo(hx + 23 * u, hy);
  ctx.lineTo(hx + 12 * u, hy + 4.5 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // wattle
  ctx.fillStyle = "#e5342b";
  ctx.beginPath();
  ctx.ellipse(hx + 8 * u, hy + 10 * u, 4 * u, 6.5 * u, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(hx + 4 * u, hy - 3.5 * u, 4.6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(hx + 5.6 * u, hy - 3.5 * u, 2.3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(hx + 6.4 * u, hy - 4.4 * u, 0.9 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // hurt red tint ring
  if (p.hurtT > 1.2) {
    ctx.strokeStyle = "rgba(229,52,43,0.6)";
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(x, y - 44 * u, 52 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ── particles / floaters ─────────────────────────────────────── */
export function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle, e: Engine) {
  const u = e.u;
  const lifeRatio = pt.life / pt.maxLife;
  ctx.globalAlpha = Math.max(0, lifeRatio);
  if (pt.type === "dot" || pt.type === "smoke") {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * u * (pt.type === "smoke" ? 1 + (1 - lifeRatio) * 1.6 : lifeRatio), 0, Math.PI * 2);
    ctx.fill();
  } else if (pt.type === "feather") {
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.size * u, pt.size * u * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (pt.type === "confetti") {
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.fillStyle = pt.color;
    ctx.fillRect(-pt.size * u, -pt.size * u * 0.55, pt.size * 2 * u, pt.size * 1.1 * u);
    ctx.restore();
  } else if (pt.type === "note") {
    ctx.fillStyle = pt.color;
    ctx.font = `${Math.round(pt.size * 2.4 * u)}px Lalezar, Vazirmatn, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("♪", pt.x, pt.y);
  } else {
    // star
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? pt.size * u : pt.size * 0.4 * u;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx: CanvasRenderingContext2D, e: Engine) {
  const u = e.u;
  ctx.textAlign = "center";
  for (const f of e.floaters) {
    const a = Math.min(1, f.life * 2.4);
    ctx.globalAlpha = a;
    ctx.font = `${Math.round(f.size * u)}px Lalezar, Vazirmatn, sans-serif`;
    ctx.lineWidth = 5 * u;
    ctx.strokeStyle = "rgba(30,15,0,0.85)";
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/* ── full-screen fx ───────────────────────────────────────────── */
export function drawFX(ctx: CanvasRenderingContext2D, e: Engine) {
  const { W, H, u } = e;
  // chili speed lines
  if (e.effects.chili.t > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 3 * u;
    for (let i = 0; i < 9; i++) {
      const yy = ((i * 173.3 + e.time * 1400) % (H - 60)) + 30;
      const len = 90 * u + ((i * 53) % 60) * u;
      const xx = W - ((e.time * 2200 + i * 331) % (W + len));
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + len, yy);
      ctx.stroke();
    }
  }
  // corn slow-mo golden tint
  if (e.effects.corn.t > 0) {
    ctx.fillStyle = "rgba(255,213,110,0.13)";
    ctx.fillRect(0, 0, W, H);
  }
  // disco spotlights
  if (e.effects.disco.t > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 2; i++) {
      const hue = (e.time * 160 + i * 140) % 360;
      const ang = Math.sin(e.time * 2.2 + i * 2.4) * 0.55;
      const ox = i === 0 ? W * 0.15 : W * 0.85;
      ctx.save();
      ctx.translate(ox, -20);
      ctx.rotate((i === 0 ? 0.5 : -0.5) + ang);
      const g = ctx.createLinearGradient(0, 0, 0, H * 1.1);
      g.addColorStop(0, `hsla(${hue},100%,60%,0.30)`);
      g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-W * 0.13, H * 1.1);
      ctx.lineTo(W * 0.13, H * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // hurt flash
  if (e.flashT > 0) {
    ctx.fillStyle = `rgba(255,60,40,${Math.min(0.4, e.flashT * 0.55)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, "rgba(4,20,10,0)");
  v.addColorStop(1, "rgba(4,20,10,0.34)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
