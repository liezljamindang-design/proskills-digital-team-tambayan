import { useEffect, useState } from "react";

/** Day and night follow the clock in the Philippines, for everyone, wherever they are. */
export type Sky = "dawn" | "day" | "dusk" | "night";

/** Minutes since midnight in Manila. */
export function phMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

const DAWN = 5 * 60, SUNRISE = 6 * 60 + 15, SUNSET = 17 * 60 + 45, DARK = 18 * 60 + 45;

export function skyAt(now = new Date()): Sky {
  const m = phMinutes(now);
  if (m >= DAWN && m < SUNRISE) return "dawn";
  if (m >= SUNRISE && m < SUNSET) return "day";
  if (m >= SUNSET && m < DARK) return "dusk";
  return "night";
}

/** How light it is outside, from 0 (night) to 1 (full day), easing through dawn and dusk. */
export function daylight(now = new Date()): number {
  const m = phMinutes(now);
  if (m >= SUNRISE && m < SUNSET) return 1;
  if (m >= DAWN && m < SUNRISE) return (m - DAWN) / (SUNRISE - DAWN);
  if (m >= SUNSET && m < DARK) return 1 - (m - SUNSET) / (DARK - SUNSET);
  return 0;
}

const LABEL: Record<Sky, string> = { dawn: "🌅", day: "☀️", dusk: "🌇", night: "🌙" };

/** Keeps <html data-sky="…"> up to date (the flat view and backgrounds use it) and returns the sky. */
export function useSky(): Sky {
  const [sky, setSky] = useState(skyAt);
  useEffect(() => {
    const tick = () => { const s = skyAt(); document.documentElement.dataset.sky = s; setSky(s); };
    tick();
    const timer = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return sky;
}

/** A small corner label: the time of day and the time in the Philippines. */
export function skyLabel(sky: Sky, now = new Date()) {
  const time = now.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
  return `${LABEL[sky]} ${time} PH`;
}
