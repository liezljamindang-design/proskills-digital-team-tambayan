import type { Act, Accessory, HairStyle, Look } from "../types";

/**
 * The HQ's chibi characters, drawn in SVG from a Look: skin, hair, outfit,
 * hairstyle and one accessory. Everyone builds their own, so no two need match.
 * The art is drawn with the feet at (0, 0) and is about 38 units tall.
 */
const GOLD = "#e9b949";
const INK = "#2b2233";

export const SKINS = ["#f8dcc9", "#f3cfb4", "#e6b995", "#c98f6a", "#8d5b3e"];
export const HAIRS = ["#2a2230", "#4a342a", "#7a4a36", "#b07f45", "#9a5440", "#6b4f93", "#d9d4cf"];
export const OUTFITS = ["#3b5bdb", "#e8590c", "#2f9e77", "#c2255c", "#7048e8", "#f2b705", "#1f2a44", "#e9ecef"];
export const STYLES: { id: HairStyle; label: string }[] = [
  { id: "short", label: "Short" }, { id: "swept", label: "Swept" }, { id: "bob", label: "Bob" },
  { id: "long-straight", label: "Long" }, { id: "long-wavy", label: "Wavy" }, { id: "bun", label: "Bun" },
  { id: "ponytail", label: "Ponytail" }, { id: "pigtails", label: "Pigtails" },
];
export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "None" }, { id: "glasses", label: "Glasses" }, { id: "headset", label: "Headset" },
  { id: "headphones", label: "Headphones" }, { id: "bow", label: "Bow" }, { id: "clip", label: "Hair clip" },
];

export const DEFAULT_LOOK: Look = { skin: SKINS[1], hair: HAIRS[1], outfit: OUTFITS[0], style: "short", accessory: "none", bottoms: "pants" };

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
export const randomLook = (): Look => ({
  skin: pick(SKINS), hair: pick(HAIRS), outfit: pick(OUTFITS), style: pick(STYLES).id, accessory: pick(ACCESSORIES).id,
  bottoms: pick(["pants", "skirt"] as const),
});

const CAP = "M-9.9 -25 C-11.6 -38.6 11.6 -38.6 9.9 -25 C8 -29.6 4 -31.2 0 -31.2 C-4 -31.2 -8 -29.6 -9.9 -25 Z";
const BLUNT = "M-9.9 -25 C-9.6 -35.4 9.6 -35.4 9.9 -25 C6 -28.6 -6 -28.6 -9.9 -25 Z";
const PARTED = ["M-9.9 -25 C-9.6 -32.2 -3 -33.2 -0.3 -31.4 C-3 -29.8 -7 -27.6 -9.9 -25 Z", "M9.9 -25 C9.6 -32.2 3 -33.2 0.3 -31.4 C3 -29.8 7 -27.6 9.9 -25 Z"];

function BackHair({ look }: { look: Look }) {
  const f = look.hair;
  switch (look.style) {
    case "long-wavy": return <path fill={f} d="M-10.4 -27 C-13.6 -20 -12.6 -13 -9.6 -10 C-8 -12.6 -8.6 -16 -8.8 -20 L8.8 -20 C8.6 -16 8 -12.6 9.6 -10 C12.6 -13 13.6 -20 10.4 -27 Z" />;
    case "bob": return <path fill={f} d="M-10.7 -27 C-12 -21 -11 -17.4 -8.6 -16.4 L8.6 -16.4 C11 -17.4 12 -21 10.7 -27 Z" />;
    case "bun": return <circle fill={f} cx={0} cy={-36.6} r={3.9} />;
    case "ponytail": return <path fill={f} d="M8.4 -30.5 C15.6 -30.5 16 -20 12.8 -14 C12 -18 11.2 -22 9.4 -24.6 Z" />;
    case "long-straight": return <path fill={f} d="M-10.4 -27 C-12.2 -18 -11.6 -9 -10 -6.4 L-7.8 -6.4 L-8.2 -19 L8.2 -19 L7.8 -6.4 L10 -6.4 C11.6 -9 12.2 -18 10.4 -27 Z" />;
    case "pigtails": return (
      <g fill={f}>
        <ellipse cx={-11.8} cy={-21.4} rx={3.1} ry={5.6} transform="rotate(14 -11.8 -21.4)" />
        <ellipse cx={11.8} cy={-21.4} rx={3.1} ry={5.6} transform="rotate(-14 11.8 -21.4)" />
      </g>
    );
    default: return null;
  }
}

function FrontHair({ look }: { look: Look }) {
  const s = look.style;
  return (
    <g fill={look.hair} stroke="none">
      <path d={CAP} />
      {s === "long-wavy" && <path d="M-9.9 -25 C-9.2 -31.6 -2 -33.4 4.6 -30.4 C0 -29 -5 -27.2 -9.9 -25 Z" />}
      {(s === "bob" || s === "long-straight") && <path d={BLUNT} />}
      {(s === "bun" || s === "pigtails") && PARTED.map((d) => <path key={d} d={d} />)}
      {s === "ponytail" && <path d="M-9.9 -25 C-9.2 -32.6 3 -33.6 9.9 -26 C5 -29.8 -3 -29.2 -9.9 -25 Z" />}
      {s === "short" && <path d="M-9.9 -25 C-9.4 -35 6 -36 9.9 -26.4 C5 -29.2 -4 -28.4 -9.9 -25 Z" />}
      {s === "swept" && (<><path d="M-9.9 -25 C-9.6 -35 3 -37 9.9 -27.4 C6 -30.6 0 -30.2 -4 -27.8 C-6 -26.8 -8 -25.8 -9.9 -25 Z" /><path d="M-3 -35.6 Q1 -40.4 6.4 -36 Q2 -36.8 -3 -35.6 Z" /></>)}
    </g>
  );
}

function AccessoryArt({ kind }: { kind: Accessory }) {
  switch (kind) {
    case "glasses": return (<g fill="none" stroke={INK} strokeWidth={0.65}><circle cx={-3.7} cy={-24} r={2.9} /><circle cx={3.7} cy={-24} r={2.9} /><path d="M-0.8 -24 H0.8" /></g>);
    case "headset": return (
      <g>
        <path d="M-9.9 -26 C-10.6 -39.6 10.6 -39.6 9.9 -26" fill="none" stroke={GOLD} strokeWidth={1.1} strokeLinecap="round" />
        <rect x={-11.6} y={-27.6} width={2.4} height={4.6} rx={1.2} fill={INK} />
        <path d="M-10.4 -23.2 Q-9.6 -19.2 -5.4 -19.4" fill="none" stroke={INK} strokeWidth={0.7} strokeLinecap="round" />
        <circle cx={-5.2} cy={-19.4} r={0.9} fill={INK} />
      </g>
    );
    case "headphones": return (
      <g>
        <path d="M-5 -17 Q0 -12.6 5 -17" fill="none" stroke={GOLD} strokeWidth={1.3} strokeLinecap="round" />
        <rect x={-6.3} y={-18.6} width={2.4} height={3.4} rx={1.1} fill={INK} /><rect x={3.9} y={-18.6} width={2.4} height={3.4} rx={1.1} fill={INK} />
      </g>
    );
    case "bow": return <path d="M-4.2 -35.2 L0 -33.4 L4.2 -35.2 L3.6 -31.6 L0 -33 L-3.6 -31.6 Z" fill={GOLD} />;
    case "clip": return <rect x={4.6} y={-30.6} width={3} height={1.2} rx={0.6} fill={GOLD} transform="rotate(18 6 -30)" />;
    default: return null;
  }
}

const DRINKS = { coffee: ["#ffffff", "#6b4226"], iced: ["#cfeaff", "#8a5a3a"], tea: ["#f1d9b5", "#c79a63"] } as const;

/** One character, full body. `act` changes the face, what is in the hands, and the pose. */
export function ChibiArt({ look, act }: { look: Look; act?: Act }) {
  const legs = look.bottoms === "pants" ? "#2a2f45" : look.skin;
  const mood = act?.mood, asleep = act?.pose === "sleep", sitting = act?.pose === "sit";
  return (
    <g className={`chibi${mood ? ` mood-${mood}` : ""}`} transform={sitting ? "translate(0 2.4)" : undefined}>
      <BackHair look={look} />
      <rect x={-3.7} y={-5.4} width={2.9} height={sitting ? 2.4 : 4.6} rx={1.2} fill={legs} />
      <rect x={0.8} y={-5.4} width={2.9} height={sitting ? 2.4 : 4.6} rx={1.2} fill={legs} />
      <ellipse cx={-2.4} cy={sitting ? -3.1 : -0.7} rx={2.5} ry={1.3} fill={INK} /><ellipse cx={2.4} cy={sitting ? -3.1 : -0.7} rx={2.5} ry={1.3} fill={INK} />
      <ellipse cx={-6.1} cy={-11.6} rx={1.8} ry={3.8} fill={look.outfit} transform="rotate(12 -6.1 -11.6)" />
      <ellipse cx={6.1} cy={-11.6} rx={1.8} ry={3.8} fill={look.outfit} transform="rotate(-12 6.1 -11.6)" />
      <circle cx={-6.9} cy={-7.7} r={1.45} fill={look.skin} /><circle cx={6.9} cy={-7.7} r={1.45} fill={look.skin} />
      <path d="M-4.7 -16.2 Q0 -17.4 4.7 -16.2 L6.3 -5.3 Q0 -3.8 -6.3 -5.3 Z" fill={look.outfit} />
      <path d="M-2.5 -16.6 L0 -12.6 L2.5 -16.6 Z" fill="#ffffff" opacity={0.85} />
      <rect x={-1.7} y={-17.8} width={3.4} height={2.6} fill={look.skin} />
      <circle cx={-9.3} cy={-24.4} r={1.6} fill={look.skin} /><circle cx={9.3} cy={-24.4} r={1.6} fill={look.skin} />
      <ellipse cx={0} cy={-25} rx={9.7} ry={8.9} fill={look.skin} />
      <FrontHair look={look} />
      <ellipse cx={-6.1} cy={-21.3} rx={1.9} ry={1.1} fill="#f29bb0" opacity={0.55} /><ellipse cx={6.1} cy={-21.3} rx={1.9} ry={1.1} fill="#f29bb0" opacity={0.55} />
      {asleep ? (
        <path d="M-5.2 -23.6 Q-3.7 -22.4 -2.2 -23.6 M2.2 -23.6 Q3.7 -22.4 5.2 -23.6" fill="none" stroke={INK} strokeWidth={0.8} strokeLinecap="round" />
      ) : mood === "happy" || mood === "dance" ? (
        <path d="M-5.3 -23.4 Q-3.7 -26 -2.1 -23.4 M2.1 -23.4 Q3.7 -26 5.3 -23.4" fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
      ) : (
        <g className="chibi-eyes">
          <ellipse cx={-3.7} cy={-24} rx={1.35} ry={2} fill={INK} /><ellipse cx={3.7} cy={-24} rx={1.35} ry={2} fill={INK} />
          <circle cx={-3.2} cy={-24.8} r={0.55} fill="#ffffff" /><circle cx={4.2} cy={-24.8} r={0.55} fill="#ffffff" />
        </g>
      )}
      {mood === "angry" && (
        <>
          <path d="M-6 -28 L-2 -26.4 M6 -28 L2 -26.4" fill="none" stroke={INK} strokeWidth={0.95} strokeLinecap="round" />
          <path className="anger" d="M6.4 -33 l1.6 1.2 M9.4 -33 l-1.6 1.2 M6.4 -29.6 l1.6 -1.2 M9.4 -29.6 l-1.6 -1.2" fill="none" stroke="#e03131" strokeWidth={0.8} strokeLinecap="round" />
        </>
      )}
      {mood === "happy" || mood === "dance" ? (
        <path d="M-2.2 -20.9 Q0 -17.4 2.2 -20.9 Z" fill="#9a4b55" stroke="none" />
      ) : mood === "angry" ? (
        <path d="M-1.7 -19.4 Q0 -20.8 1.7 -19.4" fill="none" stroke="#9a4b55" strokeWidth={0.8} strokeLinecap="round" />
      ) : (
        <path d="M-1.5 -20.5 Q0 -19.1 1.5 -20.5" fill="none" stroke="#9a4b55" strokeWidth={0.75} strokeLinecap="round" />
      )}
      <AccessoryArt kind={look.accessory} />
      {act?.drink && !asleep && (
        <g className="sip">
          <rect x={5.2} y={-12} width={3.6} height={4.4} rx={0.7} fill={DRINKS[act.drink][0]} />
          <rect x={5.2} y={-12} width={3.6} height={1.2} rx={0.5} fill={DRINKS[act.drink][1]} />
          {act.drink === "coffee"
            ? <path className="steam" d="M6.2 -13 q-0.8 -1.2 0 -2.2 M7.8 -13 q0.8 -1.2 0 -2.2" fill="none" stroke="#9aa3b2" strokeWidth={0.45} strokeLinecap="round" />
            : <path d="M7.4 -12 L8.4 -15.4" fill="none" stroke="#e03131" strokeWidth={0.6} strokeLinecap="round" />}
        </g>
      )}
      {act?.phone && !asleep && (
        <g className="phone">
          <rect x={-8.6} y={-13.2} width={3.4} height={5.6} rx={0.7} fill={INK} />
          <rect x={-8.1} y={-12.6} width={2.4} height={4} rx={0.3} fill="#6fb4ff" stroke="none" />
        </g>
      )}
    </g>
  );
}

/** Head-and-shoulders portrait, for lists and the avatar builder. */
export function ChibiPortrait({ look, size = 40 }: { look: Look; size?: number }) {
  return (
    <svg className="chibi-portrait" viewBox="-14 -42 28 28" width={size} height={size} aria-hidden="true">
      <ChibiArt look={look} />
    </svg>
  );
}

/** Whole character, standing. Used large in the avatar builder. */
export function ChibiFull({ look, size = 150 }: { look: Look; size?: number }) {
  return (
    <svg className="chibi-full" viewBox="-17 -44 34 47" width={size * (34 / 47)} height={size} aria-hidden="true">
      <ellipse cx={0} cy={0} rx={9} ry={2.6} fill="rgba(0,0,0,0.12)" />
      <ChibiArt look={look} />
    </svg>
  );
}
