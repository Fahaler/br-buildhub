import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "./bars.css";

export const metadata: Metadata = {
  title: "BARS",
  description: "BARS и дискотека крыс",
  robots: { index: false, follow: false },
};

/* ───────────── крыса (рисуется кодом, анимируется CSS) ───────────── */

type Outfit = "shades" | "hat" | "chain" | "phones" | "crown";
type Move = "bounce" | "sway" | "spin" | "jump";

type RatProps = {
  fur: string;
  belly: string;
  outfit: Outfit[];
  move: Move;
  /** задержка анимации в секундах (лучше отрицательная) */
  delay: number;
  /** ширина крысы на десктопе, px */
  size: number;
  flip?: boolean;
};

const PINK = "#ff8fb4";
const INK = "#16121c";

function Rat({ fur, belly, outfit, move, delay, size, flip }: RatProps) {
  const style = { "--d": `${delay}s`, "--s": `${size}px` } as CSSProperties;
  const has = (o: Outfit) => outfit.includes(o);

  return (
    <div className={`bars-rat bars-move-${move}${flip ? " bars-flip" : ""}`} style={style} aria-hidden>
      <svg viewBox="0 0 120 170" className="bars-rat-svg">
        {/* хвост */}
        <g className="bars-tail">
          <path
            d="M58 138 C 92 152, 114 130, 105 107 C 99 91, 109 80, 117 84"
            fill="none"
            stroke={PINK}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* ноги */}
        <g className="bars-leg bars-leg-l">
          <path d="M49 136 L45 157" stroke={fur} strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="41" cy="160" rx="10" ry="5" fill={PINK} />
        </g>
        <g className="bars-leg bars-leg-r">
          <path d="M71 136 L75 157" stroke={fur} strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="79" cy="160" rx="10" ry="5" fill={PINK} />
        </g>

        {/* тело */}
        <ellipse cx="60" cy="112" rx="27" ry="33" fill={fur} />
        <ellipse cx="60" cy="119" rx="16" ry="22" fill={belly} />

        {has("chain") && (
          <g>
            <path d="M42 90 Q60 114 78 90" fill="none" stroke="#ffcf3a" strokeWidth="3" strokeDasharray="3 2" />
            <circle cx="60" cy="104" r="6.5" fill="#ffcf3a" stroke="#b8860b" strokeWidth="1" />
            <text x="60" y="107.5" fontSize="9" fontWeight="900" textAnchor="middle" fill="#7a5600">
              $
            </text>
          </g>
        )}

        {/* руки */}
        <g className="bars-arm bars-arm-l">
          <path d="M40 98 L19 70" stroke={fur} strokeWidth="8" strokeLinecap="round" />
          <circle cx="17" cy="67" r="6" fill={PINK} />
        </g>
        <g className="bars-arm bars-arm-r">
          <path d="M80 98 L101 70" stroke={fur} strokeWidth="8" strokeLinecap="round" />
          <circle cx="103" cy="67" r="6" fill={PINK} />
        </g>

        {/* голова */}
        <g className="bars-head">
          <circle cx="37" cy="40" r="15" fill={fur} />
          <circle cx="37" cy="40" r="9" fill={PINK} />
          <circle cx="83" cy="40" r="15" fill={fur} />
          <circle cx="83" cy="40" r="9" fill={PINK} />

          <ellipse cx="60" cy="60" rx="25" ry="23" fill={fur} />
          <ellipse cx="60" cy="72" rx="13" ry="10" fill={belly} />

          <circle cx="50" cy="55" r="4" fill={INK} />
          <circle cx="51.4" cy="53.6" r="1.3" fill="#fff" />
          <circle cx="70" cy="55" r="4" fill={INK} />
          <circle cx="71.4" cy="53.6" r="1.3" fill="#fff" />

          <ellipse cx="60" cy="66" rx="4.5" ry="3.5" fill="#ff5c93" />
          <path d="M55.5 73.5 Q60 77.5 64.5 73.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="57.5" y="75" width="5" height="5.5" rx="1" fill="#fff" stroke="#cfc8bd" strokeWidth="0.6" />

          <g stroke={INK} strokeWidth="1" opacity="0.55" strokeLinecap="round">
            <line x1="48" y1="70" x2="27" y2="65" />
            <line x1="48" y1="72" x2="27" y2="74" />
            <line x1="72" y1="70" x2="93" y2="65" />
            <line x1="72" y1="72" x2="93" y2="74" />
          </g>

          {has("shades") && (
            <g>
              <rect x="40" y="48" width="17" height="11" rx="4" fill={INK} />
              <rect x="63" y="48" width="17" height="11" rx="4" fill={INK} />
              <line x1="56" y1="52" x2="64" y2="52" stroke={INK} strokeWidth="2.2" />
              <line x1="43" y1="51" x2="49" y2="51" stroke="#9be7ff" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="66" y1="51" x2="72" y2="51" stroke="#9be7ff" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          )}

          {has("hat") && (
            <g>
              <polygon points="60,6 47,39 73,39" fill="#ff3cac" />
              <polygon points="55,19 65,19 67.5,25 52.5,25" fill="#ffd23c" />
              <polygon points="51,31 69,31 71,36 49,36" fill="#3cf0ff" />
              <circle cx="60" cy="6" r="4.5" fill="#ffd23c" />
            </g>
          )}

          {has("crown") && (
            <g>
              <polygon points="44,40 46,22 53,32 60,18 67,32 74,22 76,40" fill="#ffcf3a" stroke="#b8860b" strokeWidth="1" />
              <circle cx="60" cy="33" r="2.6" fill="#ff3cac" />
            </g>
          )}

          {has("phones") && (
            <g>
              <path d="M35 54 Q60 12 85 54" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <rect x="29" y="45" width="11" height="17" rx="4" fill="#3cf0ff" stroke={INK} strokeWidth="2" />
              <rect x="80" y="45" width="11" height="17" rx="4" fill="#3cf0ff" stroke={INK} strokeWidth="2" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

/* ───────────── декор ───────────── */

function Speaker({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bars-speaker" style={{ "--d": `${delay}s` } as CSSProperties} aria-hidden>
      <span className="bars-tweeter" />
      <span className="bars-woofer" />
    </div>
  );
}

function Notes({ side }: { side: "l" | "r" }) {
  const notes = ["♪", "♫", "♬", "♪", "♫"];
  return (
    <div className={`bars-notes bars-notes-${side}`} aria-hidden>
      {notes.map((n, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties}>
          {n}
        </span>
      ))}
    </div>
  );
}

const FLOOR_COLS = 14;
const FLOOR_ROWS = 5;

function DanceFloor() {
  const tiles = Array.from({ length: FLOOR_COLS * FLOOR_ROWS }, (_, i) => {
    const d = -(((i * 7 + Math.floor(i / FLOOR_COLS) * 3) % 8) * 0.25);
    return <span key={i} style={{ "--d": `${d}s` } as CSSProperties} />;
  });
  return (
    <div className="bars-floor" aria-hidden>
      <div className="bars-floor-grid">{tiles}</div>
    </div>
  );
}

/* ───────────── состав танцпола ───────────── */

const LEFT_CREW: RatProps[] = [
  { fur: "#9b9aa3", belly: "#d9d6de", outfit: ["shades", "chain"], move: "bounce", delay: 0, size: 150 },
  { fur: "#8a6a52", belly: "#d8c0a8", outfit: ["hat"], move: "spin", delay: -0.6, size: 118 },
  { fur: "#e9e4dc", belly: "#fff8f0", outfit: ["phones"], move: "sway", delay: -0.25, size: 128, flip: true },
];

const RIGHT_CREW: RatProps[] = [
  { fur: "#4d4a55", belly: "#9a96a3", outfit: ["crown", "shades"], move: "jump", delay: -0.5, size: 150, flip: true },
  { fur: "#b9a58e", belly: "#efe2cf", outfit: ["shades"], move: "sway", delay: 0, size: 118 },
  { fur: "#9b9aa3", belly: "#d9d6de", outfit: ["hat", "chain"], move: "bounce", delay: -0.25, size: 128, flip: true },
];

function Crew({ side, crew }: { side: "l" | "r"; crew: RatProps[] }) {
  return (
    <section className={`bars-side bars-side-${side}`} aria-hidden>
      <Notes side={side} />
      <div className="bars-crew">
        {crew.map((rat, i) => (
          <Rat key={i} {...rat} />
        ))}
      </div>
      <div className="bars-speakers">
        <Speaker delay={side === "l" ? 0 : -0.25} />
      </div>
    </section>
  );
}

/* ───────────── страница ───────────── */

export default function BarsPage() {
  return (
    <div className="bars-root">
      {/* свет */}
      <div className="bars-lights" aria-hidden>
        <span className="bars-beam" style={{ "--x": "8%", "--c": "#ff3cac", "--d": "0s" } as CSSProperties} />
        <span className="bars-beam" style={{ "--x": "30%", "--c": "#3cf0ff", "--d": "-1.3s" } as CSSProperties} />
        <span className="bars-beam" style={{ "--x": "70%", "--c": "#ffb000", "--d": "-2.1s" } as CSSProperties} />
        <span className="bars-beam" style={{ "--x": "92%", "--c": "#7bff6f", "--d": "-0.7s" } as CSSProperties} />
        <span className="bars-specks" />
        <span className="bars-strobe" />
      </div>

      <div className="bars-ball-wrap" aria-hidden>
        <span className="bars-ball" />
      </div>

      <DanceFloor />

      <div className="bars-stage">
        <header className="bars-top">
          <Link href="/" className="bars-back">
            ← К заказам
          </Link>
          <h1 className="bars-title">BARS</h1>
          <span className="bars-bpm">
            <i /> 120 BPM
          </span>
        </header>

        <main className="bars-main">
          <Crew side="l" crew={LEFT_CREW} />

          <figure className="bars-photo">
            <img
              src="/bars/photo.webp"
              alt="BARS"
              width={911}
              height={1200}
              decoding="async"
              fetchPriority="high"
              className="bars-img"
            />
          </figure>

          <Crew side="r" crew={RIGHT_CREW} />
        </main>

        <p className="bars-marquee" aria-hidden>
          <span>
            ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★&nbsp;
          </span>
          <span>
            ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★ ДИСКОТЕКА КРЫС ★ BARS ★&nbsp;
          </span>
        </p>
      </div>
    </div>
  );
}
