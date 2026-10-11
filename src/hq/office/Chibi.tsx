import type { Act, Accessory, Fit, HairStyle, Look, Mood } from "../types";

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

export const FITS: { id: Fit; label: string }[] = [
  { id: "basic", label: "Basic" }, { id: "nerd", label: "Nerd" }, { id: "funk", label: "Funk" }, { id: "cool", label: "Cool" },
  { id: "sporty", label: "Sporty" }, { id: "formal", label: "Formal" }, { id: "hoodie", label: "Hoodie" }, { id: "punk", label: "Punk" }, { id: "royal", label: "Royal" },
];
export const DEFAULT_LOOK: Look = { skin: SKINS[1], hair: HAIRS[1], outfit: OUTFITS[0], style: "short", accessory: "none", bottoms: "pants", fit: "basic" };

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
export const randomLook = (): Look => ({
  skin: pick(SKINS), hair: pick(HAIRS), outfit: pick(OUTFITS), style: pick(STYLES).id, accessory: pick(ACCESSORIES).id,
  bottoms: pick(["pants", "skirt"] as const), fit: pick(FITS).id,
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


const MOUTH = "#9a4b55";
const line = { fill: "none", stroke: INK, strokeWidth: 0.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Eyes, mouth and any extras (tears, hearts, anger mark) for the current reaction. */
function Face({ mood, asleep }: { mood?: Mood; asleep: boolean }) {
  const openEyes = (
    <g className="chibi-eyes">
      <ellipse cx={-3.7} cy={-24} rx={1.35} ry={2} fill={INK} /><ellipse cx={3.7} cy={-24} rx={1.35} ry={2} fill={INK} />
      <circle cx={-3.2} cy={-24.8} r={0.55} fill="#ffffff" /><circle cx={4.2} cy={-24.8} r={0.55} fill="#ffffff" />
    </g>
  );
  let eyes = openEyes;
  let mouth = <path d="M-1.5 -20.5 Q0 -19.1 1.5 -20.5" fill="none" stroke={MOUTH} strokeWidth={0.75} strokeLinecap="round" />;
  let extra: React.ReactNode = null;
  const bigSmile = <path d="M-2.2 -20.9 Q0 -17.4 2.2 -20.9 Z" fill={MOUTH} stroke="none" />;

  if (asleep) eyes = <path d="M-5.2 -23.6 Q-3.7 -22.4 -2.2 -23.6 M2.2 -23.6 Q3.7 -22.4 5.2 -23.6" {...line} strokeWidth={0.8} />;
  else switch (mood) {
    case "happy": case "dance":
      eyes = <path d="M-5.3 -23.4 Q-3.7 -26 -2.1 -23.4 M2.1 -23.4 Q3.7 -26 5.3 -23.4" {...line} />; mouth = bigSmile; break;
    case "laugh":
      eyes = <path d="M-5.4 -25.4 L-2.4 -24 L-5.4 -22.6 M5.4 -25.4 L2.4 -24 L5.4 -22.6" {...line} />;
      mouth = <path d="M-3 -21.2 Q0 -16 3 -21.2 Z" fill={MOUTH} stroke="none" />; break;
    case "love":
      eyes = (
        <g className="pulse" fill="#e64980" stroke="none">
          {[-3.7, 3.7].map((cx) => <path key={cx} d={`M${cx} -22.2 l-2.1 -2.1 a1.15 1.15 0 0 1 2.1 -1.1 a1.15 1.15 0 0 1 2.1 1.1 Z`} />)}
        </g>
      );
      mouth = bigSmile;
      extra = <path className="float-up" d="M11 -34 l-1.7 -1.7 a0.95 0.95 0 0 1 1.7 -0.9 a0.95 0.95 0 0 1 1.7 0.9 Z" fill="#e64980" stroke="none" />; break;
    case "wow":
      eyes = (
        <g>
          <circle cx={-3.7} cy={-24} r={2.1} fill="#ffffff" stroke={INK} strokeWidth={0.5} /><circle cx={3.7} cy={-24} r={2.1} fill="#ffffff" stroke={INK} strokeWidth={0.5} />
          <circle cx={-3.7} cy={-24} r={0.9} fill={INK} /><circle cx={3.7} cy={-24} r={0.9} fill={INK} />
        </g>
      );
      mouth = <ellipse cx={0} cy={-19.6} rx={1.2} ry={1.6} fill={MOUTH} stroke="none" />; break;
    case "cool":
      mouth = <path d="M-1 -20.2 Q1 -19.3 2.6 -21" fill="none" stroke={MOUTH} strokeWidth={0.8} strokeLinecap="round" />; break;
    case "shy":
      mouth = <path d="M-1.4 -20.2 q0.7 0.7 1.4 0 q0.7 -0.7 1.4 0" fill="none" stroke={MOUTH} strokeWidth={0.7} strokeLinecap="round" />;
      extra = <g fill="#f06595" opacity={0.75} stroke="none"><ellipse cx={-6.1} cy={-21.3} rx={2.5} ry={1.5} /><ellipse cx={6.1} cy={-21.3} rx={2.5} ry={1.5} /></g>; break;
    case "think":
      eyes = <g transform="translate(0.7 -0.6)">{openEyes}</g>;
      mouth = <path d="M0 -20 H2.4" fill="none" stroke={MOUTH} strokeWidth={0.8} strokeLinecap="round" />;
      extra = (
        <>
          <path d="M1.6 -28.2 L5.8 -28.6" {...line} />
          <g className="dots" fill={INK} stroke="none"><circle cx={10.5} cy={-33} r={0.8} /><circle cx={13} cy={-35.5} r={1} /><circle cx={16} cy={-38.5} r={1.3} /></g>
        </>
      ); break;
    case "sleepy":
      eyes = <path d="M-5.2 -23.8 H-2.2 M2.2 -23.8 H5.2" {...line} />;
      mouth = <ellipse cx={0} cy={-19.8} rx={0.9} ry={1.1} fill={MOUTH} stroke="none" />;
      extra = <text className="float-up" x={10} y={-33} fontSize={5} fontWeight={700} fill="#1565c0" stroke="none">z</text>; break;
    case "cry":
      eyes = <path d="M-5.3 -24.6 Q-3.7 -22.6 -2.1 -24.6 M2.1 -24.6 Q3.7 -22.6 5.3 -24.6" {...line} />;
      mouth = <path d="M-1.9 -19 Q0 -21 1.9 -19" fill="none" stroke={MOUTH} strokeWidth={0.8} strokeLinecap="round" />;
      extra = <g className="tears" fill="#4dabf7" stroke="none"><path d="M-3.7 -22.6 q-1.2 2 0 2.8 q1.2 -0.8 0 -2.8Z" /><path d="M3.7 -22.6 q-1.2 2 0 2.8 q1.2 -0.8 0 -2.8Z" /></g>; break;
    case "angry":
      mouth = <path d="M-1.7 -19.4 Q0 -20.8 1.7 -19.4" fill="none" stroke={MOUTH} strokeWidth={0.8} strokeLinecap="round" />;
      extra = (
        <>
          <path d="M-6 -28 L-2 -26.4 M6 -28 L2 -26.4" {...line} strokeWidth={0.95} />
          <path className="anger" d="M6.4 -33 l1.6 1.2 M9.4 -33 l-1.6 1.2 M6.4 -29.6 l1.6 -1.2 M9.4 -29.6 l-1.6 -1.2" fill="none" stroke="#e03131" strokeWidth={0.8} strokeLinecap="round" />
        </>
      ); break;
    default: break;
  }
  return <>{eyes}{mouth}{extra}</>;
}

const SHADES = "M-6.6 -25.8 H-0.9 V-23.8 Q-3.7 -21.4 -6.6 -23.8 Z M0.9 -25.8 H6.6 V-23.8 Q3.7 -21.4 0.9 -23.8 Z M-0.9 -25.3 H0.9";

/** What the clothing style adds on top of the plain top: vest, jacket, stripes and so on. */
function OutfitArt({ fit, color }: { fit: Fit; color: string }) {
  const shade = "rgba(0,0,0,0.2)";
  switch (fit) {
    case "nerd": return (
      <g stroke="none">
        <path d="M-2.4 -16.6 L0 -12.4 L2.4 -16.6 Z" fill="#ffffff" />
        <path d="M-4.7 -16.2 L-2.4 -16.6 L0 -11.6 L2.4 -16.6 L4.7 -16.2 L6 -7.4 Q0 -6 -6 -7.4 Z" fill="#7a4a36" />
        <path d="M-3.2 -10.6 l1 -1.5 l1 1.5 l-1 1.5 Z M1.2 -10.6 l1 -1.5 l1 1.5 l-1 1.5 Z" fill={GOLD} />
        <path d="M-2.3 -17.5 L0 -16.3 L-2.3 -15.1 Z M2.3 -17.5 L0 -16.3 L2.3 -15.1 Z" fill="#e03131" />
      </g>
    );
    case "funk": return (
      <g stroke="none">
        <path d="M-5 -14.4 H5 L5.3 -12.2 H-5.3 Z" fill="#ff4fa3" /><path d="M-5.4 -11.4 H5.4 L5.7 -9.2 H-5.7 Z" fill="#ffd43b" /><path d="M-5.8 -8.4 H5.8 L6.1 -6.2 H-6.1 Z" fill="#35c9ff" />
        <path d="M-2.8 -16.5 Q0 -11.8 2.8 -16.5" fill="none" stroke={GOLD} strokeWidth={0.7} />
        <path d="M0 -13.6 l0.5 1.1 l1.2 0.1 l-0.9 0.8 l0.3 1.2 l-1.1 -0.6 l-1.1 0.6 l0.3 -1.2 l-0.9 -0.8 l1.2 -0.1 Z" fill={GOLD} />
      </g>
    );
    case "cool": return (
      <g stroke="none">
        <path d="M-4.7 -16.2 L-1.5 -16.6 L-2.3 -4.9 Q-4.6 -4.9 -6.3 -5.3 Z M4.7 -16.2 L1.5 -16.6 L2.3 -4.9 Q4.6 -4.9 6.3 -5.3 Z" fill="#1b1d26" />
        <path d="M-4.6 -16.3 L-1.5 -16.6 L-2.6 -12.6 Z M4.6 -16.3 L1.5 -16.6 L2.6 -12.6 Z" fill="#3a3d4d" />
        <path d="M-3.9 -9.4 h1.2 M2.7 -9.4 h1.2" stroke="#c9ccd6" strokeWidth={0.5} />
      </g>
    );
    case "sporty": return (
      <g stroke="none">
        <path d="M-4.7 -16.2 L-3.7 -16.5 L-5.1 -5.1 L-6.3 -5.3 Z M4.7 -16.2 L3.7 -16.5 L5.1 -5.1 L6.3 -5.3 Z" fill="#ffffff" />
        <path d="M-2.2 -16.6 Q0 -14 2.2 -16.6 L2.9 -16.5 Q0 -12.8 -2.9 -16.5 Z" fill="#ffffff" />
        <text x={0} y={-8.2} textAnchor="middle" fontSize={5.4} fontWeight={800} fill="#ffffff">7</text>
      </g>
    );
    case "formal": return (
      <g stroke="none">
        <path d="M-4.7 -16.2 L-1.9 -16.6 L-0.9 -9 L-1.6 -4.8 Q-4.4 -4.9 -6.3 -5.3 Z M4.7 -16.2 L1.9 -16.6 L0.9 -9 L1.6 -4.8 Q4.4 -4.9 6.3 -5.3 Z" fill="#1f2a44" />
        <path d="M-4.6 -16.3 L-1.9 -16.6 L-1.2 -11 Z M4.6 -16.3 L1.9 -16.6 L1.2 -11 Z" fill="#33426b" />
        <path d="M-0.8 -16.4 L0.8 -16.4 L1.1 -10.2 L0 -8.6 L-1.1 -10.2 Z" fill={color} />
      </g>
    );
    case "hoodie": return (
      <g stroke="none">
        <path d="M-5.4 -16.3 Q0 -11.6 5.4 -16.3 Q0 -19.4 -5.4 -16.3 Z" fill={shade} />
        <path d="M-3.4 -9.2 H3.4 L4.1 -5.9 Q0 -5 -4.1 -5.9 Z" fill={shade} />
        <path d="M-1.2 -14.6 V-11.2 M1.2 -14.6 V-11.2" stroke="#ffffff" strokeWidth={0.6} strokeLinecap="round" />
      </g>
    );
    case "punk": return (
      <g>
        <path d="M-2.2 -13.4 L2.2 -9 M2.2 -13.4 L-2.2 -9" fill="none" stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
        <path d="M-6 -7.2 Q0 -5.8 6 -7.2 L6.2 -5.9 Q0 -4.4 -6.2 -5.9 Z" fill="#e03131" stroke="none" />
        <g fill="#c9ccd6" stroke="none">{[-3, -1, 1, 3].map((x) => <circle key={x} cx={x} cy={-16.3} r={0.55} />)}</g>
        <path d="M-4.2 -15 L-3 -13.6 M4.2 -15 L3 -13.6" stroke={color} strokeWidth={0.8} strokeLinecap="round" />
      </g>
    );
    case "royal": return (
      <g stroke="none">
        <path d="M-4.7 -16.2 L-2.9 -16.5 L6.3 -6.6 L6.3 -5.3 L5 -5 Z" fill={GOLD} />
        <path d="M-5.2 -16.6 Q0 -13.4 5.2 -16.6 L5 -15.2 Q0 -12 -5 -15.2 Z" fill="#ffffff" />
        <circle cx={0} cy={-13.2} r={1} fill="#e03131" />
      </g>
    );
    default: return null;
  }
}

/** Things a style (or the "cool" reaction) puts on the head. */
function HeadGear({ fit, cool }: { fit: Fit; cool: boolean }) {
  return (
    <>
      {fit === "nerd" && !cool && (
        <g fill="rgba(255,255,255,0.35)" stroke={INK} strokeWidth={0.9}>
          <rect x={-6.3} y={-26.2} width={5} height={4.4} rx={0.8} /><rect x={1.3} y={-26.2} width={5} height={4.4} rx={0.8} /><path d="M-1.3 -24.4 H1.3" fill="none" />
        </g>
      )}
      {(fit === "cool" || cool) && <path d={SHADES} fill="#111318" stroke="#111318" strokeWidth={0.5} />}
      {fit === "funk" && !cool && (
        <g fill="rgba(255,79,163,0.55)" stroke="#c2255c" strokeWidth={0.6}><circle cx={-3.7} cy={-24} r={2.7} /><circle cx={3.7} cy={-24} r={2.7} /><path d="M-1 -24 H1" fill="none" /></g>
      )}
      {fit === "sporty" && <path d="M-9.6 -29.4 Q0 -33 9.6 -29.4 L9.5 -27.4 Q0 -31 -9.5 -27.4 Z" fill="#e03131" stroke="none" />}
      {fit === "punk" && <path d="M-1.6 -33.4 L-2.4 -40.5 L0 -37.4 L1.2 -42 L2.6 -37 L4.6 -39.4 L3.4 -33.2 Z" fill="#e64980" stroke="none" />}
      {fit === "royal" && (
        <g stroke="none"><path d="M-5.2 -33.2 L-5.9 -38.6 L-2.7 -35.8 L0 -40 L2.7 -35.8 L5.9 -38.6 L5.2 -33.2 Z" fill={GOLD} /><circle cx={0} cy={-35} r={0.8} fill="#e03131" /></g>
      )}
    </>
  );
}

/** Hats from the shop. Drawn last, on top of the hair. */
function Hat({ id }: { id?: string }) {
  switch (id) {
    case "party": return <g stroke="none"><path d="M-4.6 -33.4 L0.6 -46 L5.4 -33.2 Z" fill="#ff4fa3" /><circle cx={0.6} cy={-46} r={1.3} fill="#ffd43b" /><circle cx={-0.6} cy={-37} r={0.8} fill="#ffffff" /><circle cx={2.2} cy={-40} r={0.7} fill="#35c9ff" /></g>;
    case "cap": return <g stroke="none"><path d="M-9.6 -29.2 Q0 -41 9.6 -29.2 Q0 -32 -9.6 -29.2 Z" fill="#1565c0" /><path d="M1.5 -30.4 Q9.5 -31.6 14.6 -27.6 Q8 -27.4 1.5 -28.8 Z" fill="#0d4a94" /><circle cx={0} cy={-36.6} r={0.9} fill="#ffffff" /></g>;
    case "beanie": return <g stroke="none"><path d="M-9.8 -28.6 Q0 -42 9.8 -28.6 Q0 -31.6 -9.8 -28.6 Z" fill="#e03131" /><path d="M-9.8 -28.6 Q0 -31.6 9.8 -28.6 L9.6 -26.6 Q0 -29.8 -9.6 -26.6 Z" fill="#ffffff" /><circle cx={0} cy={-39.6} r={2} fill="#ffffff" /></g>;
    case "ears": return <g stroke="none"><path d="M-8.8 -31.4 L-7.4 -40 L-2.8 -34.6 Z M8.8 -31.4 L7.4 -40 L2.8 -34.6 Z" fill="#2a2230" /><path d="M-7.6 -33 L-7 -37.4 L-4.6 -34.6 Z M7.6 -33 L7 -37.4 L4.6 -34.6 Z" fill="#f29bb0" /></g>;
    case "flowers": return <g stroke="none">{[[-7.4, -30.6, "#ff4fa3"], [-3.8, -32.8, "#ffd43b"], [0, -33.6, "#ffffff"], [3.8, -32.8, "#b197fc"], [7.4, -30.6, "#ff922b"]].map(([x, y, c]) => <g key={String(x)}><circle cx={Number(x)} cy={Number(y)} r={1.9} fill={String(c)} /><circle cx={Number(x)} cy={Number(y)} r={0.7} fill="#f08c00" /></g>)}</g>;
    case "wizard": return <g stroke="none"><path d="M-7.6 -31.6 L1.4 -51 L8.4 -31.6 Z" fill="#6741d9" /><ellipse cx={0} cy={-31.4} rx={12.4} ry={2.6} fill="#5f3dc4" /><path d="M0.8 -41 l0.6 1.3 l1.4 0.1 l-1.1 0.9 l0.4 1.4 l-1.3 -0.8 l-1.3 0.8 l0.4 -1.4 l-1.1 -0.9 l1.4 -0.1 Z" fill="#ffd43b" /></g>;
    case "halo": return <ellipse className="halo" cx={0} cy={-39.6} rx={6.4} ry={1.9} fill="none" stroke="#ffd43b" strokeWidth={1.3} />;
    default: return null;
  }
}

/** Pets from the shop. Small, and drawn standing beside the chibi. */
export function PetArt({ id }: { id?: string }) {
  switch (id) {
    case "duck": return <g className="pet" stroke="rgba(43,34,51,0.3)" strokeWidth={0.35}><ellipse cx={0} cy={-3.4} rx={4.4} ry={3.4} fill="#ffd43b" /><circle cx={3.4} cy={-7.6} r={2.6} fill="#ffd43b" /><path d="M5.6 -7.8 L8.4 -7 L5.6 -6.2 Z" fill="#f08c00" /><circle cx={4.2} cy={-8.2} r={0.5} fill="#1b1d26" stroke="none" /></g>;
    case "cat": return <g className="pet" stroke="rgba(43,34,51,0.3)" strokeWidth={0.35}><path d="M-4.6 -3 Q-8.6 -5 -7 -9" fill="none" stroke="#f08c00" strokeWidth={1.3} strokeLinecap="round" /><ellipse cx={0} cy={-3.2} rx={4.6} ry={3.2} fill="#f59f00" /><circle cx={3.2} cy={-7.6} r={3} fill="#f59f00" /><path d="M1 -9.6 L1.4 -12.6 L3.2 -10.4 Z M5.4 -9.6 L5.2 -12.6 L3.4 -10.4 Z" fill="#f59f00" /><circle cx={2.3} cy={-7.8} r={0.5} fill="#1b1d26" stroke="none" /><circle cx={4.4} cy={-7.8} r={0.5} fill="#1b1d26" stroke="none" /></g>;
    case "dog": return <g className="pet" stroke="rgba(43,34,51,0.3)" strokeWidth={0.35}><path d="M-4.4 -4 Q-7.6 -7 -6.4 -9.4" fill="none" stroke="#8d5b3e" strokeWidth={1.4} strokeLinecap="round" /><ellipse cx={0} cy={-3.4} rx={4.8} ry={3.4} fill="#c98f6a" /><circle cx={3.4} cy={-7.8} r={3.1} fill="#c98f6a" /><ellipse cx={0.8} cy={-7.4} rx={1.2} ry={2.4} fill="#8d5b3e" /><ellipse cx={6} cy={-7.4} rx={1.2} ry={2.4} fill="#8d5b3e" /><circle cx={2.6} cy={-8.2} r={0.5} fill="#1b1d26" stroke="none" /><circle cx={4.4} cy={-8.2} r={0.5} fill="#1b1d26" stroke="none" /><circle cx={3.5} cy={-6.6} r={0.6} fill="#1b1d26" stroke="none" /></g>;
    case "robot": return <g className="pet" stroke="rgba(43,34,51,0.3)" strokeWidth={0.35}><rect x={-3.6} y={-6.4} width={7.2} height={6} rx={1.2} fill="#adb5bd" /><rect x={-3} y={-12} width={6} height={5} rx={1.2} fill="#ced4da" /><path d="M0 -12 V-14.4" stroke="#868e96" strokeWidth={0.7} /><circle cx={0} cy={-14.8} r={0.9} fill="#e03131" stroke="none" /><circle cx={-1.3} cy={-9.6} r={0.8} fill="#35c9ff" stroke="none" /><circle cx={1.3} cy={-9.6} r={0.8} fill="#35c9ff" stroke="none" /></g>;
    default: return null;
  }
}

const DRINKS = { coffee: ["#ffffff", "#6b4226"], iced: ["#cfeaff", "#8a5a3a"], tea: ["#f1d9b5", "#c79a63"] } as const;

/** One character, full body. `act` changes the face, what is in the hands, and the pose. */
export function ChibiArt({ look, act }: { look: Look; act?: Act }) {
  const legs = look.bottoms === "pants" ? "#2a2f45" : look.skin;
  const mood = act?.mood, asleep = act?.pose === "sleep", sitting = act?.pose === "sit";
  const fit = look.fit ?? "basic";
  const sleeve = fit === "cool" ? "#1b1d26" : fit === "formal" ? "#1f2a44" : fit === "punk" ? "#16161d" : look.outfit;
  const body = fit === "formal" ? "#ffffff" : fit === "punk" ? "#16161d" : look.outfit;
  return (
    <g className={`chibi${mood ? ` mood-${mood}` : ""}${look.fx ? ` fx-${look.fx}` : ""}`} transform={sitting ? "translate(0 2.4)" : undefined}>
      <BackHair look={look} />
      <rect x={-3.7} y={-5.4} width={2.9} height={sitting ? 2.4 : 4.6} rx={1.2} fill={legs} />
      <rect x={0.8} y={-5.4} width={2.9} height={sitting ? 2.4 : 4.6} rx={1.2} fill={legs} />
      <ellipse cx={-2.4} cy={sitting ? -3.1 : -0.7} rx={2.5} ry={1.3} fill={INK} /><ellipse cx={2.4} cy={sitting ? -3.1 : -0.7} rx={2.5} ry={1.3} fill={INK} />
      <ellipse cx={-6.1} cy={-11.6} rx={1.8} ry={3.8} fill={sleeve} transform="rotate(12 -6.1 -11.6)" />
      <ellipse cx={6.1} cy={-11.6} rx={1.8} ry={3.8} fill={sleeve} transform="rotate(-12 6.1 -11.6)" />
      <circle cx={-6.9} cy={-7.7} r={1.45} fill={look.skin} /><circle cx={6.9} cy={-7.7} r={1.45} fill={look.skin} />
      <path d="M-4.7 -16.2 Q0 -17.4 4.7 -16.2 L6.3 -5.3 Q0 -3.8 -6.3 -5.3 Z" fill={body} />
      {fit === "basic" && <path d="M-2.5 -16.6 L0 -12.6 L2.5 -16.6 Z" fill="#ffffff" opacity={0.85} />}
      <OutfitArt fit={fit} color={look.outfit} />
      <rect x={-1.7} y={-17.8} width={3.4} height={2.6} fill={look.skin} />
      <circle cx={-9.3} cy={-24.4} r={1.6} fill={look.skin} /><circle cx={9.3} cy={-24.4} r={1.6} fill={look.skin} />
      <ellipse cx={0} cy={-25} rx={9.7} ry={8.9} fill={look.skin} />
      <FrontHair look={look} />
      <ellipse cx={-6.1} cy={-21.3} rx={1.9} ry={1.1} fill="#f29bb0" opacity={0.55} /><ellipse cx={6.1} cy={-21.3} rx={1.9} ry={1.1} fill="#f29bb0" opacity={0.55} />
      <Face mood={mood} asleep={asleep} />
      <AccessoryArt kind={look.accessory} />
      <HeadGear fit={fit} cool={mood === "cool"} />
      <Hat id={look.hat} />
      {act?.drink && !asleep && (
        <g className="sip">
          <rect x={5.2} y={-12} width={3.6} height={4.4} rx={0.7} fill={DRINKS[act.drink][0]} />
          <rect x={5.2} y={-12} width={3.6} height={1.2} rx={0.5} fill={DRINKS[act.drink][1]} />
          {act.drink === "coffee"
            ? <path className="steam" d="M6.2 -13 q-0.8 -1.2 0 -2.2 M7.8 -13 q0.8 -1.2 0 -2.2" fill="none" stroke="#9aa3b2" strokeWidth={0.45} strokeLinecap="round" />
            : <path d="M7.4 -12 L8.4 -15.4" fill="none" stroke="#e03131" strokeWidth={0.6} strokeLinecap="round" />}
        </g>
      )}
      {act?.food && !asleep && <text className="sip" x={7} y={-7.5} fontSize={7} textAnchor="middle" stroke="none">{act.food}</text>}
      {act?.ball && !asleep && <circle cx={7.5} cy={-10} r={3.6} fill="#ff922b" stroke="#b85c00" strokeWidth={0.7} />}
      {act?.gym === "lift" && <g className="float-up" stroke="none"><rect x={-13} y={-43} width={26} height={1.6} rx={0.8} fill="#3a4150" /><rect x={-15} y={-46} width={3} height={7.6} rx={1} fill="#e03131" /><rect x={12} y={-46} width={3} height={7.6} rx={1} fill="#e03131" /></g>}
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
