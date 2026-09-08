import { useEffect, useRef, useState } from "react";
import { Engine, faNum, CHAR_NAMES, CHAR_XP_NEED, CHAR_STAGES } from "./game/engine";
import type { HudData, FoodKind, CharStage } from "./game/engine";

/* ── tiny inline SVG icon set (no emoji, no assets) ───────────── */
function FoodIcon({ kind, size = 34 }: { kind: FoodKind; size?: number }) {
  const s = { width: size, height: size };
  switch (kind) {
    case "worm":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <path d="M7 26 Q13 14 20 22 Q27 30 33 18" stroke="#ff7bac" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="33" cy="17" r="2.4" fill="#3a2a12" />
        </svg>
      );
    case "beetle":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <circle cx="11" cy="21" r="6" fill="#3c2415" />
          <ellipse cx="23" cy="21" rx="12" ry="9" fill="#d1342f" stroke="#5c1410" strokeWidth="2.5" />
          <circle cx="19" cy="17" r="2" fill="#2b0d0a" />
          <circle cx="27" cy="18" r="2" fill="#2b0d0a" />
          <circle cx="23" cy="25" r="2" fill="#2b0d0a" />
          <path d="M16 30 l-3 6 M23 31 l0 6 M30 30 l3 6" stroke="#2b1608" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "butterfly":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <ellipse cx="12" cy="15" rx="9" ry="11" fill="#ff8500" stroke="#8a4500" strokeWidth="2" />
          <ellipse cx="28" cy="15" rx="9" ry="11" fill="#ff8500" stroke="#8a4500" strokeWidth="2" />
          <ellipse cx="13" cy="28" rx="6" ry="7" fill="#29b6f6" />
          <ellipse cx="27" cy="28" rx="6" ry="7" fill="#29b6f6" />
          <ellipse cx="20" cy="21" rx="3" ry="10" fill="#3a2a12" />
        </svg>
      );
    case "chili":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <path d="M14 8 Q32 14 28 28 Q25 36 17 33 Q24 24 11 12 Z" fill="#e8261b" stroke="#7e0f08" strokeWidth="2.4" />
          <ellipse cx="13" cy="9" rx="6" ry="3.4" fill="#2f9e44" transform="rotate(35 13 9)" />
        </svg>
      );
    case "mushroom":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <rect x="14" y="19" width="12" height="15" rx="5" fill="#ffe8c9" stroke="#a9743f" strokeWidth="2.4" />
          <path d="M5 21 Q20 1 35 21 Q20 15 5 21 Z" fill="#e5342b" stroke="#8c1712" strokeWidth="2.4" />
          <circle cx="13" cy="15" r="2.6" fill="#fff" />
          <circle cx="21" cy="10" r="3" fill="#fff" />
          <circle cx="28" cy="16" r="2.4" fill="#fff" />
        </svg>
      );
    case "corn":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="17" rx="9" ry="14" fill="#ffd23f" stroke="#a9743f" strokeWidth="2.4" />
          <path d="M14 6 v20 M20 4 v25 M26 6 v20" stroke="#c78f2e" strokeWidth="1.6" />
          <ellipse cx="11" cy="30" rx="5" ry="9" fill="#2f9e44" transform="rotate(28 11 30)" />
          <ellipse cx="29" cy="30" rx="5" ry="9" fill="#2f9e44" transform="rotate(-28 29 30)" />
        </svg>
      );
    case "note":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <ellipse cx="14" cy="29" rx="6.5" ry="5" fill="#e040fb" transform="rotate(-20 14 29)" />
          <path d="M19.5 28 V8 Q28 10 30 18" stroke="#e040fb" strokeWidth="4.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "apple":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <circle cx="15" cy="23" r="10" fill="#e5342b" stroke="#7e140e" strokeWidth="2.4" />
          <circle cx="25" cy="23" r="10" fill="#e5342b" stroke="#7e140e" strokeWidth="2.4" />
          <ellipse cx="25" cy="10" rx="6" ry="3" fill="#2f9e44" transform="rotate(-30 25 10)" />
          <path d="M20 14 Q21 8 24 6" stroke="#5c3a12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="13" cy="20" r="2.8" fill="rgba(255,255,255,0.55)" />
        </svg>
      );
    case "egg":
      return (
        <svg {...s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="21" rx="11" ry="14" fill="#ffd75e" stroke="#b07d10" strokeWidth="2.6" />
          <ellipse cx="16" cy="16" rx="3" ry="5" fill="rgba(255,255,255,0.75)" transform="rotate(20 16 16)" />
          <path d="M29 6 v6 M26 9 h6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}

const LEGEND: { kind: FoodKind; name: string; desc: string; color: string; power: boolean }[] = [
  { kind: "chili", name: "فلفل تند", desc: "سرعت وحشتناک + له‌کردن موانع", color: "#ff8a3c", power: true },
  { kind: "mushroom", name: "قارچ جادویی", desc: "قدرت بال‌زدن — در هوا بپر!", color: "#8ef0c3", power: true },
  { kind: "corn", name: "ذرت", desc: "اسلوموشن — دنیا آهسته می‌شود", color: "#ffe08a", power: true },
  { kind: "note", name: "نوت موسیقی", desc: "خروس می‌رقصد — امتیاز ×۲", color: "#f0a1ff", power: true },
  { kind: "apple", name: "سیب", desc: "یک جانِ اضافه (حداکثر ۳)", color: "#ff8a80", power: true },
  { kind: "egg", name: "تخم طلایی", desc: "۵۰۰ امتیاز — کمیاب و درخشان", color: "#ffd75e", power: false },
  { kind: "worm", name: "کرم خاکی", desc: "۱۵۰ امتیاز خوشمزه", color: "#ff9ec4", power: false },
  { kind: "beetle", name: "سوسک", desc: "۱۰۰ امتیاز", color: "#ffb3ad", power: false },
  { kind: "butterfly", name: "پروانه", desc: "۲۰۰ امتیاز — در هوا شکارش کن", color: "#ffcf8a", power: false },
];

function RoosterMark({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="bob">
      <path d="M42 66 Q8 52 14 30 Q30 44 46 50 Z" fill="#128a52" stroke="#43250f" strokeWidth="3" />
      <path d="M42 62 Q2 42 12 18 Q28 36 48 46 Z" fill="#23b06b" stroke="#43250f" strokeWidth="3" />
      <ellipse cx="58" cy="72" rx="26" ry="23" fill="#fdf4dd" stroke="#43250f" strokeWidth="3.4" />
      <ellipse cx="50" cy="74" rx="11" ry="16" fill="#f3ddab" stroke="#43250f" strokeWidth="3" />
      <path d="M52 94 l-4 14 m10 -12 l2 13" stroke="#f4a300" strokeWidth="5" strokeLinecap="round" />
      <circle cx="78" cy="42" r="14" fill="#fdf4dd" stroke="#43250f" strokeWidth="3.4" />
      <circle cx="70" cy="28" r="5.4" fill="#e5342b" stroke="#43250f" strokeWidth="2.6" />
      <circle cx="78" cy="24" r="6" fill="#e5342b" stroke="#43250f" strokeWidth="2.6" />
      <circle cx="86" cy="28" r="5" fill="#e5342b" stroke="#43250f" strokeWidth="2.6" />
      <path d="M91 40 l12 4 -12 5 Z" fill="#ff9f1c" stroke="#43250f" strokeWidth="2.6" />
      <ellipse cx="88" cy="54" rx="4.4" ry="7" fill="#e5342b" stroke="#43250f" strokeWidth="2.6" />
      <circle cx="82" cy="39" r="4.6" fill="#fff" />
      <circle cx="84" cy="39" r="2.3" fill="#1c1c1c" />
    </svg>
  );
}

function Heart({ on }: { on: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path
        d="M12 21 C4 14 1.5 9.5 4.2 6.2 C6.6 3.4 10.4 4.2 12 7 C13.6 4.2 17.4 3.4 19.8 6.2 C22.5 9.5 20 14 12 21 Z"
        fill={on ? "#e5342b" : "rgba(255,255,255,0.14)"}
        stroke={on ? "#7e140e" : "rgba(255,255,255,0.3)"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 L6 9 H3 v6 h3 l5 4 Z" fill="currentColor" stroke="none" />
      {muted ? <path d="M16 9 l6 6 M22 9 l-6 6" /> : <path d="M15.5 8.5 a5 5 0 0 1 0 7 M18.5 6 a9 9 0 0 1 0 12" />}
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="4" width="5" height="16" rx="1.5" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" />
    </svg>
  );
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] px-2 rounded-lg bg-[#123c26] border-2 border-[#ffc93c66] text-gold font-display text-sm shadow-[0_3px_0_rgba(0,0,0,0.4)]">
      {children}
    </span>
  );
}

/* ── main app ─────────────────────────────────────────────────── */
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudData | null>(null);
  const [touch] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false));

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new Engine(canvasRef.current, setHud);
    engineRef.current = eng;
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
  }, []);

  const eng = () => engineRef.current;
  const phase = hud?.phase ?? "menu";
  const playing = phase === "playing";

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: "#072314" }}
      onPointerDown={() => eng()?.pressJump()}
      onPointerUp={() => eng()?.releaseJump()}
      onPointerCancel={() => eng()?.releaseJump()}
    >
      <canvas ref={canvasRef} className="block" />

      {/* ═══ HUD (visible in play/pause) ═══ */}
      {(playing || phase === "paused") && hud && (
        <div className="absolute inset-0 pointer-events-none" onPointerDown={(e) => e.stopPropagation()}>
          {/* top bar */}
          <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-3">
            <div className="hud-panel px-3 sm:px-4 py-2 flex items-center gap-2.5 sm:gap-4">
              <div>
                <div className="text-[11px] text-[#ffd23f]/80 font-bold leading-none mb-1">امتیاز</div>
                <div className="font-display text-[27px] sm:text-[34px] leading-none text-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
                  {faNum(hud.score)}
                </div>
              </div>
              <div className="w-px h-9 bg-[#ffc93c33]" />
              <div>
                <div className="text-[11px] text-[#8ef0c3]/80 font-bold leading-none mb-1">رکورد</div>
                <div className="font-display text-[22px] leading-none text-[#8ef0c3]">{faNum(hud.best)}</div>
              </div>
              <div className="w-px h-9 bg-[#ffc93c33] hidden min-[440px]:block" />
              <div className="hidden min-[440px]:block">
                <div className="text-[11px] text-[#ffcf8a]/80 font-bold leading-none mb-1">مسافت</div>
                <div className="font-display text-[22px] leading-none text-[#ffcf8a]">
                  {faNum(hud.dist)}
                  <span className="text-[13px]"> متر</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="hud-panel px-3 py-2.5 flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <Heart key={i} on={i < hud.lives} />
                ))}
              </div>
              {/* Character stage + XP bar */}
              <div className="hud-panel px-3 py-2 min-w-[140px]">
                <div className="text-[11px] text-[#ffd700]/80 font-bold leading-none mb-1.5">
                  {CHAR_NAMES[hud.charStage]}
                </div>
                <div className="w-full h-2 bg-[#2a1a0a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffd700] to-[#ff8c00] transition-all duration-300"
                    style={{
                      width: (() => {
                        const idx = CHAR_STAGES.indexOf(hud.charStage);
                        if (idx >= CHAR_STAGES.length - 1) return "100%";
                        const cur = hud.xp - CHAR_XP_NEED[idx];
                        const need = CHAR_XP_NEED[idx + 1] - CHAR_XP_NEED[idx];
                        return `${Math.min(100, (cur / need) * 100)}%`;
                      })(),
                    }}
                  />
                </div>
                <div className="text-[9px] text-[#ffd700]/60 mt-1 text-center">
                  {(() => {
                    const idx = CHAR_STAGES.indexOf(hud.charStage);
                    if (idx >= CHAR_STAGES.length - 1) return faNum(hud.xp) + " XP";
                    return faNum(hud.xp) + " / " + faNum(CHAR_XP_NEED[idx + 1]) + " XP";
                  })()}
                </div>
              </div>
              <button
                aria-label="صدا"
                onClick={() => eng()?.toggleMute()}
                className="hud-panel w-11 h-11 flex items-center justify-center text-gold cursor-pointer hover:brightness-125"
              >
                <SpeakerIcon muted={hud.muted} />
              </button>
              <button
                aria-label="توقف"
                onClick={() => eng()?.togglePause()}
                className="hud-panel w-11 h-11 flex items-center justify-center text-gold cursor-pointer hover:brightness-125"
              >
                <PauseIcon />
              </button>
            </div>
          </div>

          {/* active effects */}
          {hud.effects.length > 0 && (
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 flex-wrap px-4">
              {hud.effects.map((ef) => (
                <div
                  key={ef.id}
                  className="hud-panel px-3 py-1.5 w-[136px]"
                  style={{ borderColor: ef.color }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-[15px] leading-none" style={{ color: ef.color }}>
                      {ef.label}
                    </span>
                    <span className="text-[10px] font-bold text-white/60">{faNum(Math.ceil(ef.t))}ث</span>
                  </div>
                  <div className="h-[7px] rounded-full bg-black/45 overflow-hidden">
                    <div
                      className="effect-bar h-full rounded-full"
                      style={{ width: `${(ef.t / ef.dur) * 100}%`, background: ef.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* touch duck button */}
          {touch && playing && (
            <button
              className="absolute bottom-5 left-5 w-20 h-20 rounded-full font-display text-xl text-cream btn-game pointer-events-auto"
              style={{ background: "linear-gradient(180deg,#2f9e44,#1e6b30)" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                eng()?.setDuck(true);
              }}
              onPointerUp={() => eng()?.setDuck(false)}
              onPointerLeave={() => eng()?.setDuck(false)}
            >
              خم‌شو
            </button>
          )}

          {/* desktop hint */}
          {!touch && hud.effects.length === 0 && (
            <div className="absolute bottom-3 inset-x-0 text-center text-[12px] text-white/45 font-medium">
              Space پرش · ↓ خم شدن · P توقف · M صدا
            </div>
          )}
        </div>
      )}

      {/* ═══ START MENU ═══ */}
      {phase === "menu" && (
        <div className="absolute inset-0 overflow-y-auto" onPointerDown={(e) => e.stopPropagation()}>
          <div className="min-h-full flex items-center justify-center p-4 py-8" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(12,51,32,0.62), rgba(5,22,13,0.9))" }}>
            <div className="w-full max-w-3xl pop-in">
              {/* title block */}
              <div className="flex items-center justify-center gap-4 sm:gap-7 flex-wrap">
                <RoosterMark size={128} />
                <div className="text-center sm:text-right">
                  <div className="inline-block font-display text-[13px] text-[#0c3320] bg-gold rounded-full px-4 py-1 mb-2 shadow-[0_3px_0_rgba(0,0,0,0.35)]">
                    بازی دوندگی مزرعه
                  </div>
                  <h1 className="font-display text-[64px] sm:text-[86px] leading-[0.95] text-[#ffc93c] title-glow">
                    خروس دونده
                  </h1>
                  <p className="text-[#fff6e0]/85 text-sm sm:text-base font-medium mt-2">
                    بدو، غذا بخور، قدرت بگیر و رکورد مزرعه را بشکن!
                  </p>
                </div>
              </div>

              {/* record strip */}
              {hud && hud.best > 0 && (
                <div className="mt-4 flex justify-center">
                  <div className="hud-panel px-6 py-2 flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffc93c">
                      <path d="M6 3 h12 v3 a6 6 0 0 1 -4 5.6 V15 h2 a2 2 0 0 1 2 2 v2 H6 v-2 a2 2 0 0 1 2 -2 h2 v-3.4 A6 6 0 0 1 6 6 Z" />
                      <path d="M18 4 h3 v2 a4 4 0 0 1 -3 3.9 Z M6 4 H3 v2 a4 4 0 0 0 3 3.9 Z" opacity="0.7" />
                    </svg>
                    <span className="font-display text-xl text-gold">
                      بهترین رکورد: {faNum(hud.best)}
                    </span>
                  </div>
                </div>
              )}

              {/* food legend */}
              <div className="mt-6 hud-panel p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-[3px] w-8 bg-gold rounded-full" />
                  <h2 className="font-display text-2xl text-cream">راهنمای غذاها و قدرت‌ها</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LEGEND.map((it) => (
                    <div
                      key={it.kind}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 border-2 transition-transform hover:scale-[1.04] hover:-rotate-1"
                      style={{ borderColor: `${it.color}55`, background: `${it.color}14` }}
                    >
                      <div className="shrink-0" style={{ filter: `drop-shadow(0 0 6px ${it.color}88)` }}>
                        <FoodIcon kind={it.kind} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-[17px] leading-tight" style={{ color: it.color }}>
                          {it.name}
                          {it.power && (
                            <span className="mr-1.5 text-[10px] align-middle bg-black/35 rounded-full px-1.5 py-0.5 text-white/80 font-body font-bold">
                              قدرت
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-white/70 font-medium leading-snug">{it.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* controls */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12.5px] text-white/80 font-medium">
                <div className="hud-panel px-3 py-2.5 flex items-center gap-2">
                  <KeyCap>Space</KeyCap> پرش و بال‌زدن
                </div>
                <div className="hud-panel px-3 py-2.5 flex items-center gap-2">
                  <KeyCap>↓</KeyCap> خم شدن زیر کلاغ‌ها
                </div>
                <div className="hud-panel px-3 py-2.5 flex items-center gap-2">
                  <KeyCap>P</KeyCap> توقف بازی
                </div>
                <div className="hud-panel px-3 py-2.5 flex items-center gap-2">
                  <KeyCap>M</KeyCap> قطع و وصل صدا
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col items-center gap-3 pb-6">
                <button
                  onClick={() => eng()?.begin()}
                  className="btn-game stripes text-[30px] text-[#3a2200] px-14 py-3.5"
                  style={{ background: "linear-gradient(180deg,#ffd75e,#f5a623)" }}
                >
                  شروع بازی
                </button>
                <div className="text-[12px] text-white/50 font-medium">
                  یا {touch ? "روی صفحه بزن" : "Space بزن"} — با خوردن به مانع یک جان از دست می‌دهی (۳ جان داری)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAUSE ═══ */}
      {phase === "paused" && hud && (
        <div className="absolute inset-0 flex items-center justify-center p-4" onPointerDown={(e) => e.stopPropagation()} style={{ background: "rgba(5,22,13,0.72)" }}>
          <div className="hud-panel px-10 py-8 text-center pop-in max-w-sm w-full">
            <h2 className="font-display text-5xl text-gold mb-1">توقف!</h2>
            <p className="text-white/70 text-sm mb-6 font-medium">خروس نفسی تازه کرد…</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => eng()?.togglePause()}
                className="btn-game text-2xl text-[#0c3320] px-8 py-2.5"
                style={{ background: "linear-gradient(180deg,#8ef0c3,#3bb273)" }}
              >
                ادامه بازی
              </button>
              <button
                onClick={() => eng()?.begin()}
                className="btn-game text-xl text-cream px-8 py-2"
                style={{ background: "linear-gradient(180deg,#3d7a4e,#245434)" }}
              >
                شروع از اول
              </button>
              <button
                onClick={() => eng()?.toMenu()}
                className="btn-game text-xl text-cream px-8 py-2"
                style={{ background: "linear-gradient(180deg,#5a4632,#3a2c1e)" }}
              >
                منوی اصلی
              </button>
            </div>
            <div className="mt-5 text-[12px] text-white/50 font-medium">
              امتیاز فعلی: <span className="font-display text-gold text-base">{faNum(hud.score)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GAME OVER ═══ */}
      {phase === "over" && hud && (
        <div className="absolute inset-0 flex items-center justify-center p-4" onPointerDown={(e) => e.stopPropagation()} style={{ background: "radial-gradient(ellipse at center, rgba(60,16,10,0.55), rgba(5,22,13,0.9))" }}>
          <div className="hud-panel px-8 sm:px-12 py-8 text-center pop-in max-w-md w-full" style={{ borderColor: hud.newRecord ? "#ffd75e" : undefined }}>
            {hud.newRecord ? (
              <div className="record-flash inline-block font-display text-[26px] text-[#3a2200] bg-gold rounded-full px-6 py-1.5 mb-3 shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                رکورد جدید مزرعه!
              </div>
            ) : (
              <h2 className="font-display text-5xl text-[#ff8a80] mb-1">پایان بازی!</h2>
            )}
            {hud.newRecord && <h2 className="font-display text-4xl text-gold mb-2">قهرمان شدی!</h2>}
            <p className="text-white/70 text-sm font-medium mb-6">
              {hud.newRecord ? "همه مرغ و خروس‌ها دارند برایت کف می‌زنند!" : "یک دونه کرم دیگه بخور و دوباره تلاش کن!"}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-7">
              <div className="rounded-xl bg-black/30 border-2 border-[#ffc93c44] px-2 py-3">
                <div className="text-[11px] text-white/60 font-bold mb-1">امتیاز</div>
                <div className="font-display text-[26px] text-gold leading-none">{faNum(hud.score)}</div>
              </div>
              <div className="rounded-xl bg-black/30 border-2 border-[#8ef0c344] px-2 py-3">
                <div className="text-[11px] text-white/60 font-bold mb-1">رکورد</div>
                <div className="font-display text-[26px] text-[#8ef0c3] leading-none">{faNum(hud.best)}</div>
              </div>
              <div className="rounded-xl bg-black/30 border-2 border-[#ffcf8a44] px-2 py-3">
                <div className="text-[11px] text-white/60 font-bold mb-1">مسافت</div>
                <div className="font-display text-[26px] text-[#ffcf8a] leading-none">
                  {faNum(hud.dist)}
                  <span className="text-[12px]"> م</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => eng()?.begin()}
                className="btn-game stripes text-2xl text-[#3a2200] px-8 py-2.5"
                style={{ background: "linear-gradient(180deg,#ffd75e,#f5a623)" }}
              >
                دوباره بدو!
              </button>
              <button
                onClick={() => eng()?.toMenu()}
                className="btn-game text-lg text-cream px-8 py-2"
                style={{ background: "linear-gradient(180deg,#3d7a4e,#245434)" }}
              >
                منوی اصلی
              </button>
            </div>
            <div className="mt-4 text-[12px] text-white/50 font-medium">یا Enter بزن تا دوباره شروع شود</div>
          </div>
        </div>
      )}
    </div>
  );
}
