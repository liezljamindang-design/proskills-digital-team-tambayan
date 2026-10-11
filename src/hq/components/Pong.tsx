import { useEffect, useRef, useState } from "react";
import { earn } from "../economy";
import { answerPong, BOT, invitePong, leavePong, onPong, playRobot, sendPong } from "../net/session";
import { displayName } from "../types";
import type { PongMsg } from "../net/transport";
import { useHq } from "../store";

const W = 640, H = 380, PX = 0.06, PADDLE = 0.24, R = 0.02;
/** Ping-pong is first to 5. Pickleball is to 11, and you must win by 2. */
const rules = (game?: "pong" | "pickle") => (game === "pickle" ? { win: 11, lead: 2, name: "Pickleball", icon: "🥒", goal: "first to 11, win by 2" } : { win: 5, lead: 1, name: "Ping-pong", icon: "🏓", goal: "first to 5 wins" });
type Ball = { x: number; y: number; vx: number; vy: number };
/** The other player sees the table from the opposite end, so positions are flipped left to right on the way out and in. */
const flip = (b: Ball): Ball => ({ x: 1 - b.x, y: b.y, vx: -b.vx, vy: b.vy });

/** Opened by tapping the ping-pong table: pick a teammate to challenge, or practise against the robot. */
export function PongMenu() {
  const open = useHq((s) => s.pongMenu);
  const peers = useHq((s) => s.peers);
  const busy = useHq((s) => Boolean(s.pong));
  const game = useHq((s) => s.pongGame);
  if (!open || busy) return null;
  const list = Object.values(peers).filter((p) => p.status !== "offline" && p.status !== "dnd");
  return (
    <div className="pong-prompt pong-menu" role="dialog" aria-label={`Play ${rules(game).name}`}>
      <p>{rules(game).icon} <strong>{rules(game).name}</strong> · {rules(game).goal}</p>
      <button type="button" className="btn-primary" onClick={playRobot}>🤖 Practise against the robot</button>
      {list.length > 0 ? (
        <ul className="pong-list">
          {list.map((p) => <li key={p.id}><span>{displayName(p)}</span><button type="button" className="btn-secondary" onClick={() => invitePong(p.id)}>Challenge</button></li>)}
        </ul>
      ) : <p className="muted">Nobody else is free to play right now.</p>}
      <div className="room-actions"><button type="button" className="btn-secondary" onClick={() => useHq.setState({ pongMenu: false })}>Close</button></div>
    </div>
  );
}

/** Invitations: the card you see when someone challenges you, or while you wait for an answer. */
export function PongPrompt() {
  const pong = useHq((s) => s.pong);
  if (!pong || pong.stage === "playing") return null;
  return (
    <div className="pong-prompt" role="alertdialog" aria-label="Ping-pong challenge">
      {pong.stage === "invited" ? (
        <>
          <p>{rules(pong.game).icon} <strong>{pong.name}</strong> challenges you to {rules(pong.game).name.toLowerCase()}!</p>
          <div className="room-actions">
            <button type="button" className="btn-primary" onClick={() => answerPong(true)}>Play</button>
            <button type="button" className="btn-secondary" onClick={() => answerPong(false)}>Not now</button>
          </div>
        </>
      ) : (
        <>
          <p>{rules(pong.game).icon} Waiting for <strong>{pong.name}</strong> to accept…</p>
          <div className="room-actions"><button type="button" className="btn-secondary" onClick={leavePong}>Cancel</button></div>
        </>
      )}
    </div>
  );
}

/**
 * Ping-pong for two. Each player decides hits and misses on their own side of the
 * table and tells the other, so a slow connection never makes you miss a ball you reached.
 */
export function Pong() {
  const pong = useHq((s) => s.pong);
  const stillHere = useHq((s) => (pong && pong.opp !== BOT ? Boolean(s.peers[pong.opp]) : true));
  const playing = pong?.stage === "playing";
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("Get ready…");
  const svgRef = useRef<SVGSVGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const mineRef = useRef<SVGRectElement>(null);
  const theirsRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (!playing || !pong) return;
    const opp = pong.opp;
    const g = { my: 0.5, their: 0.5, theirGoal: 0.5, ball: { x: 0.5, y: 0.5, vx: 0, vy: 0 } as Ball, live: false, waiting: false, score: [0, 0] as [number, number], over: false, sent: 0.5, lastSend: 0 };
    const held = new Set<string>();
    let raf = 0, last = performance.now(), serveTimer = 0;
    setScore([0, 0]); setResult(""); setStatus(pong.host ? "You serve first" : `${pong.name} serves first`);

    function finish(text: string, coins: number, why: string) {
      if (g.over) return;
      g.over = true; g.live = false;
      setResult(text);
      if (coins) earn(coins, why);
    }
    function checkOver() {
      const bot = opp === BOT, r = rules(pong!.game), sport = r.name.toLowerCase();
      if (g.score[0] >= r.win && g.score[0] - g.score[1] >= r.lead) finish("You win! 🏆", bot ? 3 : 15, bot ? "beating the robot" : `winning at ${sport}`);
      else if (g.score[1] >= r.win && g.score[1] - g.score[0] >= r.lead) finish(`${pong!.name} wins. Good game!`, bot ? 0 : 5, `playing ${sport}`);
      return g.over;
    }
    function serve() {
      if (g.over) return;
      g.ball = { x: 0.5, y: 0.5, vx: 0.55, vy: (Math.random() - 0.5) * 0.6 };
      g.live = true; g.waiting = false;
      setStatus("");
      sendPong(opp, { k: "serve", ...flip(g.ball) });
    }
    onPong((msg: PongMsg) => {
      if (msg.k === "paddle") g.theirGoal = Math.min(1, Math.max(0, msg.y));
      else if (msg.k === "hit" || msg.k === "serve") { g.ball = { x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy }; // already flipped by the sender
        g.live = true; g.waiting = false; setStatus(""); }
      else if (msg.k === "miss") { g.score = [g.score[0] + 1, g.score[1]]; setScore(g.score); g.live = false; g.waiting = false; if (!checkOver()) setStatus(`${pong.name} serves`); }
      else if (msg.k === "quit") finish(`${pong.name} left the game.`, 0, "");
    });
    if (pong.host) serveTimer = window.setTimeout(serve, 1600);

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (held.has("up")) g.my -= dt * 1.3;
      if (held.has("down")) g.my += dt * 1.3;
      g.my = Math.min(1 - PADDLE / 2, Math.max(PADDLE / 2, g.my));
      g.their += (g.theirGoal - g.their) * Math.min(1, dt * 14);
      if (Math.abs(g.my - g.sent) > 0.004 && now - g.lastSend > 60) { g.sent = g.my; g.lastSend = now; sendPong(opp, { k: "paddle", y: g.my }); }

      if (g.live && !g.waiting) {
        const b = g.ball;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
        if (b.y > 1 - R) { b.y = 1 - R; b.vy = -Math.abs(b.vy); }
        if (b.vx < 0 && b.x <= PX + R) {
          if (Math.abs(b.y - g.my) <= PADDLE / 2 + R) {
            b.x = PX + R;
            b.vx = Math.min(Math.abs(b.vx) * 1.06, 1.35);
            b.vy = Math.max(-0.95, Math.min(0.95, b.vy + (b.y - g.my) * 1.7));
            sendPong(opp, { k: "hit", ...flip(b) });
          } else if (b.x < -0.03) {
            g.live = false;
            g.score = [g.score[0], g.score[1] + 1]; setScore(g.score);
            sendPong(opp, { k: "miss" });
            if (!checkOver()) { setStatus("You serve"); serveTimer = window.setTimeout(serve, 1300); }
          }
        } else if (b.vx > 0 && b.x >= 1 - PX - R) {
          b.x = 1 - PX - R;
          if (opp !== BOT) g.waiting = true; // their side decides what happens next
          else if (Math.abs(b.y - g.their) <= PADDLE / 2 + R) { b.vx = -Math.min(Math.abs(b.vx) * 1.06, 1.35); b.vy = Math.max(-0.95, Math.min(0.95, b.vy + (b.y - g.their) * 1.7)); }
          else { g.live = false; g.score = [g.score[0] + 1, g.score[1]]; setScore(g.score); if (!checkOver()) { setStatus("Robot serves"); serveTimer = window.setTimeout(() => { serve(); g.ball.vx = -0.55; }, 1300); } }
        }
        // The robot follows the ball, but only so fast, so a sharp angle gets past it.
        if (opp === BOT) { const want = b.vx > 0 ? b.y : 0.5, step = dt * 0.62; g.theirGoal = g.their + Math.max(-step, Math.min(step, want - g.their)); g.their = g.theirGoal; }
      }
      ballRef.current?.setAttribute("cx", String(g.ball.x * W));
      ballRef.current?.setAttribute("cy", String(g.ball.y * H));
      mineRef.current?.setAttribute("y", String((g.my - PADDLE / 2) * H));
      theirsRef.current?.setAttribute("y", String((g.their - PADDLE / 2) * H));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const key = (down: boolean) => (e: KeyboardEvent) => {
      const dir = e.key === "ArrowUp" || e.key === "w" || e.key === "W" ? "up" : e.key === "ArrowDown" || e.key === "s" || e.key === "S" ? "down" : null;
      if (!dir) return;
      e.preventDefault();
      if (down) held.add(dir); else held.delete(dir);
    };
    const down = key(true), up = key(false);
    const svg = svgRef.current;
    const point = (e: PointerEvent) => { const r = svg!.getBoundingClientRect(); g.my = (e.clientY - r.top) / r.height; };
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true);
    svg?.addEventListener("pointermove", point); svg?.addEventListener("pointerdown", point);
    return () => {
      cancelAnimationFrame(raf); window.clearTimeout(serveTimer); onPong(null);
      window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true);
      svg?.removeEventListener("pointermove", point); svg?.removeEventListener("pointerdown", point);
    };
    // One game per opponent: restarting mid-game would reset the score.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, pong?.opp]);

  if (!playing || !pong) return null;
  const left = !stillHere && !result ? `${pong.name} went offline.` : result;

  return (
    <div className="pong" role="dialog" aria-modal="true" aria-label={`${rules(pong.game).name} against ${pong.name}`}>
      <div className={`pong-box${pong.game === "pickle" ? " is-pickle" : ""}`}>
        <header className="pong-head">
          <p className="pong-score"><span>You <strong>{score[0]}</strong></span><span className="pong-dash">:</span><span><strong>{score[1]}</strong> {pong.name}</span></p>
          <button type="button" className="arcade-btn" onClick={leavePong}>{left ? "Close" : "Leave game"}</button>
        </header>
        <svg ref={svgRef} className="pong-table" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <rect className="pong-felt" x={0} y={0} width={W} height={H} rx={14} />
          {pong.game === "pickle" && <>
            <rect className="pickle-kitchen" x={W / 2 - 90} y={0} width={180} height={H} />
            <line className="pickle-line" x1={W / 2 - 90} y1={0} x2={W / 2 - 90} y2={H} /><line className="pickle-line" x1={W / 2 + 90} y1={0} x2={W / 2 + 90} y2={H} />
            <line className="pickle-line" x1={0} y1={H / 2} x2={W / 2 - 90} y2={H / 2} /><line className="pickle-line" x1={W / 2 + 90} y1={H / 2} x2={W} y2={H / 2} />
          </>}
          <line className="pong-net" x1={W / 2} y1={8} x2={W / 2} y2={H - 8} />
          <rect ref={mineRef} className="pong-paddle is-mine" x={PX * W - 10} y={(0.5 - PADDLE / 2) * H} width={10} height={PADDLE * H} rx={5} />
          <rect ref={theirsRef} className="pong-paddle" x={(1 - PX) * W} y={(0.5 - PADDLE / 2) * H} width={10} height={PADDLE * H} rx={5} />
          <circle ref={ballRef} className="pong-ball" cx={W / 2} cy={H / 2} r={R * H} />
        </svg>
        <p className="pong-status" role="status">{left || status || rules(pong.game).goal}</p>
        <p className="pong-help">You are on the left. Move your mouse or finger over the table, or use the arrow keys or W and S.</p>
      </div>
    </div>
  );
}
