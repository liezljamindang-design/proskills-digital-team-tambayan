import { useEffect } from "react";
import { setBand, type Instrument } from "../audio/band";
import { FURNITURE } from "../data/office";
import { useHq } from "../store";
import { voiceOf } from "../types";

const stool = FURNITURE.find((f) => f.id === "piano-stool");
const atPiano = (p: { x: number; y: number; act?: { pose?: string } }) => Boolean(stool && p.act?.pose === "sit" && Math.hypot(p.x - (stool.x + stool.w / 2), p.y - (stool.y + stool.h)) < 0.5);

/** Plays the instruments people are on. You only hear them while you are in the Music Room and have not muted them. */
export function BandSound({ myAt }: { myAt: () => { x: number; y: number } }) {
  const inRoom = useHq((s) => s.myZone === "music");
  const muted = useHq((s) => s.bandMuted);
  const key = useHq((s) => {
    const mine = myAt(), list: Instrument[] = [];
    const people = [...(s.me ? [{ ...s.me, x: mine.x, y: mine.y }] : []), ...Object.values(s.peers)];
    for (const p of people) { const b = p.act?.band; if (b === "mic") list.push(`voice-${voiceOf(p.look)}`); else if (b) list.push(b); else if (atPiano(p)) list.push("piano"); }
    return [...new Set(list)].sort().join(",");
  });
  useEffect(() => {
    setBand(inRoom && !muted && key ? (key.split(",") as Instrument[]) : []);
    return () => setBand([]);
  }, [inRoom, muted, key]);
  return null;
}
