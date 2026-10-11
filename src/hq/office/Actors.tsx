import { memo } from "react";
import type { Bubble } from "../store";
import type { Status } from "../status";
import type { Act, Look } from "../types";
import { ChibiArt, PetArt } from "./Chibi";

/** Breaks a message into short lines for a speech bubble, trimming long ones. */
function wrap(text: string): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const w = word.length > 20 ? `${word.slice(0, 19)}…` : word;
    if (line && `${line} ${w}`.length > 20) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
    if (lines.length === 3) break;
  }
  if (lines.length < 3 && line) lines.push(line);
  else if (lines.length === 3 && line) lines[2] = `${lines[2].slice(0, 18)}…`;
  return lines;
}

/** A speech bubble above someone's head. Private messages get a different colour and a lock. */
export function SpeechBubble({ bubble }: { bubble: Bubble }) {
  const lines = wrap(bubble.text);
  const width = Math.max(30, Math.max(...lines.map((l) => l.length)) * 4.5 + 16);
  const height = lines.length * 9.5 + 9;
  return (
    <g className={`say${bubble.private ? " is-private" : ""}`} transform={`translate(0 ${-76 - height})`}>
      <rect className="say-box" x={-width / 2} y={0} width={width} height={height} rx={7} />
      <path className="say-tail" d={`M-5 ${height - 0.5} L0 ${height + 6} L5 ${height - 0.5} Z`} />
      {lines.map((l, i) => (
        <text key={i} className="say-text" x={0} y={11 + i * 9.5} textAnchor="middle">{l}</text>
      ))}
      {bubble.private && <text className="say-lock" x={width / 2 - 2} y={-2} textAnchor="end">private</text>}
    </g>
  );
}

interface FigureProps {
  look: Look;
  name: string;
  bubble?: Bubble;
  self?: boolean;
  status?: Status;
  act?: Act;
  /** It is this person's birthday: they get a party hat. */
  party?: boolean;
}

/** A person in the office: chibi, name tag and, when they are talking, a speech bubble. */
// Remembered between redraws: when one person moves, the other hundred are not drawn again.
export const Figure = memo(function Figure({ look, name, bubble, self, status, act, party }: FigureProps) {
  const pose = act?.pose;
  // Asleep: laid along the bed, head on the pillow. Sitting: raised onto the sofa seat.
  const body = pose === "sleep" ? "translate(-3 -12) rotate(63) scale(1.02)" : pose === "sit" ? `translate(${act?.at?.dx ?? 0} ${act?.at?.dy ?? -8}) scale(1.3)` : "scale(1.3)";
  const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const tagW = Math.max(26, label.length * 4.6 + 12);
  return (
    <>
      {self && !pose && <ellipse className="av-ring" cx={0} cy={0} rx={13} ry={6.5} />}
      {!pose && <ellipse className="av-shadow" cx={0} cy={0} rx={9} ry={4.4} />}
      <g className={`av-body${pose ? ` is-${pose}` : ""}`}>
        <g transform={body}>
          <ChibiArt look={look} act={act} />
          {party && <path className="party-hat" d="M-4.6 -33.4 L0.6 -45 L5.4 -33.2 Z" />}
        </g>
        {pose === "sleep" && <text className="zzz" x={40} y={-44}>z Z z</text>}
        {look.pet && pose !== "sleep" && <g transform="translate(17 1) scale(1.25)"><PetArt id={look.pet} /></g>}
        <g transform="translate(0 -61)">
          <rect className={`ag-tag-bg${self ? " is-self" : ""}`} x={-tagW / 2} y={-8} width={tagW} height={12} rx={6} />
          <text className="ag-name" x={0} y={1} textAnchor="middle">{label}</text>
          {status && status.id !== "available" && (
            <g className={`ag-status tone-${status.tone}`} transform={`translate(${tagW / 2 + 8} -2)`}>
              <title>{status.label}</title>
              <circle r={7.5} />
              <text y={3} textAnchor="middle">{status.emoji}</text>
            </g>
          )}
        </g>
      </g>
      {bubble && <SpeechBubble bubble={bubble} />}
    </>
  );
});
