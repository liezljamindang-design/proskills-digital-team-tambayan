import { useState } from "react";
import { classOngoing, HQ } from "../config";
import { ZONES } from "../data/office";
import { openMeeting, setAct, shoot } from "../net/session";
import { ChibiPortrait } from "../office/Chibi";
import { zoneAt } from "../office/engine";
import { useHq } from "../store";
import { FOODS, type Drink } from "../types";

const MENU: { id: Drink; label: string }[] = [
  { id: "coffee", label: "☕ Hot coffee" },
  { id: "iced", label: "🧊 Iced coffee" },
  { id: "tea", label: "🧋 Milk tea" },
];

/** A small card for the room you are standing in, with the things you can do there. */
export function RoomCard() {
  const zone = useHq((s) => s.myZone);
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const blocked = useHq((s) => s.meetingBlocked);
  const requestPose = useHq((s) => s.requestPose);
  const hoopScore = useHq((s) => s.hoopScore);
  const [menuOpen, setMenuOpen] = useState(false);
  const bandMuted = useHq((s) => s.bandMuted);
  if (!me || !zone || !["cafe", "lounge", "nap", "huddle", "focus", "court", "gym", "canteen", "music"].includes(zone)) return null;
  const act = me.act ?? {};
  const name = ZONES.find((z) => z.id === zone)!.name;

  return (
    <div className="room-card" role="region" aria-label={name}>
      <p className="eyebrow">{name}</p>

      {zone === "cafe" && (
        <>
          <p>{act.drink ? "Enjoy! Your chibi is sipping it." : "What can we get you?"}</p>
          <div className="room-actions">
            {MENU.map((d) => (
              <button key={d.id} type="button" className="service-chip" aria-pressed={act.drink === d.id} onClick={() => setAct({ drink: d.id })}>{d.label}</button>
            ))}
            {act.drink && <button type="button" className="btn-secondary" onClick={() => setAct({ drink: undefined })}>Finish drink</button>}
          </div>
        </>
      )}

      {zone === "canteen" && (
        <>
          <p>{act.food && FOODS[act.food] ? `${act.food} Enjoy your ${FOODS[act.food].toLowerCase()}!` : "What would you like to eat?"}</p>
          {(!act.food || menuOpen) && (
            <div className="room-actions food-menu">
              {Object.entries(FOODS).map(([emoji, label]) => (
                <button key={emoji} type="button" className="service-chip" aria-pressed={act.food === emoji} onClick={() => { setAct({ food: emoji }); setMenuOpen(false); }}>{emoji} {label}</button>
              ))}
            </div>
          )}
          {act.food && !menuOpen && <div className="room-actions"><button type="button" className="btn-primary" onClick={() => setMenuOpen(true)}>Order something else</button><button type="button" className="btn-secondary" onClick={() => setAct({ food: undefined })}>Finish eating</button></div>}
        </>
      )}

      {zone === "music" && (
        <>
          <p>{act.band ? `🎵 You're on ${act.band === "mic" ? "vocals" : act.band}! Move to stop.` : "Tap an instrument to play it, or pick one here."}</p>
          <button type="button" className="text-btn band-mute" aria-pressed={bandMuted} onClick={() => useHq.setState({ bandMuted: !bandMuted })}>{bandMuted ? "🔇 Instrument sound is off · turn on" : "🔊 Instrument sound is on · mute"}</button>
          {act.band
            ? <button type="button" className="btn-secondary" onClick={() => requestPose("stand")}>Stop playing</button>
            : <div className="room-actions">
                {([["drums", "🥁 Drums"], ["guitar", "🎸 Guitar"], ["bass", "🎸 Bass"], ["band-mic", "🎤 Sing"], ["piano-stool", "🎹 Piano"]] as const).map(([id, label]) => (
                  <button key={id} type="button" className="service-chip" onClick={() => requestPose("sit", id)}>{label}</button>
                ))}
              </div>}
        </>
      )}

      {zone === "lounge" && (
        <>
          <p>{act.pose === "sit" ? "Comfy. Move to stand up." : "Take a seat on the sofa."}</p>
          <div className="room-actions">
            <button type="button" className="btn-secondary" onClick={() => requestPose(act.pose === "sit" ? "stand" : "sit")}>{act.pose === "sit" ? "Stand up" : "Sit on the sofa"}</button>
            <button type="button" className="btn-secondary" onClick={() => setAct({ phone: !act.phone })}>{act.phone ? "Put phone away" : "Use phone"}</button>
          </div>
        </>
      )}

      {zone === "court" && (
        <>
          <p>{act.ball ? "Tap a hoop, or press Shoot. The closer you stand, the easier the shot." : "Tap the basketballs on the court, or press the button, to pick one up."}</p>
          <p className="hoop-score">🏀 <strong>{hoopScore.made}</strong> made of {hoopScore.tried}</p>
          {act.ball
            ? <div className="room-actions"><button type="button" className="btn-primary" onClick={shoot}>Shoot</button><button type="button" className="btn-secondary" onClick={() => setAct({ ball: undefined })}>Put the ball down</button></div>
            : <button type="button" className="btn-primary" onClick={() => requestPose("sit", "ball")}>Pick up a ball</button>}
        </>
      )}

      {zone === "gym" && (
        <>
          <p>{act.gym === "run" ? "Running! Move to step off." : act.gym === "lift" ? "Lifting! Move to stop." : "Tap a treadmill to run, or the weights to lift."}</p>
          {act.gym
            ? <button type="button" className="btn-secondary" onClick={() => requestPose("stand")}>Stop</button>
            : <div className="room-actions"><button type="button" className="btn-primary" onClick={() => requestPose("sit", "treadmill-" + Math.floor(Math.random() * 4))}>Run on a treadmill</button><button type="button" className="btn-secondary" onClick={() => requestPose("sit", Math.random() < 0.5 ? "weights-1" : "weights-2")}>Lift weights</button></div>}
        </>
      )}

      {zone === "nap" && <p>{act.pose === "sleep" ? "Zzz… you are asleep. Move to wake up." : "Stop walking and your chibi lies down on the nearest bed."}</p>}

      {zone === "huddle" && (
        HQ.meetingUrl ? (
          <>
            <p>{blocked ? "Your browser stopped Zoom from opening by itself. Use the button instead." : "The team Zoom opens when you walk in. Use the button if it did not."}</p>
            <button type="button" className="btn-primary" onClick={() => openMeeting(HQ.meetingUrl)}>Join the Zoom meeting</button>
          </>
        ) : <p>The Zoom link has not been added yet.</p>
      )}
      {zone === "huddle" && (() => {
        const inside = Object.values(peers).filter((p) => zoneAt(p.x, p.y) === "huddle").sort((a, b) => a.name.localeCompare(b.name));
        return (
          <>
            <p className="roster-title">In the meeting room · {inside.length + 1}</p>
            <ul className="roster">
              <li><ChibiPortrait look={me.look} size={28} /> {me.name} (you)</li>
              {inside.map((p) => <li key={p.id}><ChibiPortrait look={p.look} size={28} /> {p.name}</li>)}
            </ul>
          </>
        );
      })()}

      {zone === "focus" && <p className="class-info"><strong>{HQ.classTitle}</strong><span>Monday to Friday</span><span>{HQ.classSchedule} - <b className={classOngoing() ? "class-on" : "class-off"}>{classOngoing() ? "Class Ongoing" : "No Class Ongoing"}</b></span></p>}
      {zone === "focus" && (
        HQ.classroomUrl ? (
          <>
            <p>{blocked ? "Your browser stopped Zoom from opening by itself. Use the button instead." : "🎓 Live training. The class Zoom opens when you walk in. Use the button if it did not."}</p>
            <button type="button" className="btn-primary" onClick={() => openMeeting(HQ.classroomUrl)}>Join the live training</button>
            {!HQ.classroomOwnLink && <p className="muted">No separate training link is set yet, so this opens the team Zoom.</p>}
          </>
        ) : <p>🎓 This is the Classroom. The training Zoom link has not been added yet.</p>
      )}
      {zone === "focus" && (() => {
        const inside = Object.values(peers).filter((p) => zoneAt(p.x, p.y) === "focus").sort((a, b) => a.name.localeCompare(b.name));
        return (
          <>
            <p className="roster-title">In class · {inside.length + 1}</p>
            <ul className="roster">
              <li><ChibiPortrait look={me.look} size={28} /> {me.name} (you)</li>
              {inside.map((p) => <li key={p.id}><ChibiPortrait look={p.look} size={28} /> {p.name}</li>)}
            </ul>
          </>
        );
      })()}
    </div>
  );
}
