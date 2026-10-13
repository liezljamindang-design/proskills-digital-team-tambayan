import { useEffect, useState } from "react";
import { classOngoing, HQ } from "../config";
import { ZONES } from "../data/office";
import { openMeeting, orderDrink, setAct, shoot } from "../net/session";
import { PersonFace } from "../office/Chibi";
import { zoneAt } from "../office/engine";
import { useHq } from "../store";
import { DRINKS, drinkOf, FOODS } from "../types";

const menu = (place: "cafe" | "canteen", adult: boolean) => Object.entries(DRINKS).filter(([, d]) => d.place === place && Boolean(d.adult) === adult);

/** A small card for the room you are standing in, with the things you can do there. */
export function RoomCard() {
  const zone = useHq((s) => s.myZone);
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const blocked = useHq((s) => s.meetingBlocked);
  const requestPose = useHq((s) => s.requestPose);
  const hoopScore = useHq((s) => s.hoopScore);
  const [tab, setTab] = useState<"food" | "drinks" | "inuman">("food");
  // Closed with ×, it stays closed until you leave the room; it comes back next time you walk in.
  const [closed, setClosed] = useState<string | null>(null);
  useEffect(() => { if (zone !== closed) setClosed(null); }, [zone, closed]);
  const bandMuted = useHq((s) => s.bandMuted);
  if (!me || !zone || !["cafe", "lounge", "nap", "huddle", "focus", "court", "gym", "canteen", "music", "pool", "play"].includes(zone) || closed === zone) return null;
  const act = me.act ?? {};
  const name = ZONES.find((z) => z.id === zone)!.name;

  return (
    <div className="room-card" role="region" aria-label={name}>
      <button type="button" className="room-card-close" aria-label={`Close the ${name} card`} title="Close" onClick={() => setClosed(zone)}>×</button>
      <p className="eyebrow">{name}</p>

      {zone === "cafe" && (
        <>
          <p className="free-coffee">☕ Libreng kape ni Arnold!</p>
          <p>{act.drink ? `Enjoy your ${drinkOf(act.drink)!.label.toLowerCase()}!` : "What can we get you?"}</p>
          <div className="room-actions">
            {menu("cafe", false).map(([id, d]) => (
              <button key={id} type="button" className="service-chip" aria-pressed={act.drink === id} onClick={() => orderDrink(id)}>{d.emoji} {d.label}</button>
            ))}
            {act.drink && <button type="button" className="btn-secondary" onClick={() => setAct({ drink: undefined })}>Finish drink</button>}
          </div>
        </>
      )}

      {zone === "canteen" && (
        <>
          <p>{[act.food && FOODS[act.food] ? `${act.food} ${FOODS[act.food]}` : "", act.drink ? `${drinkOf(act.drink)!.emoji} ${drinkOf(act.drink)!.label}` : ""].filter(Boolean).join(" + ") || "Kain tayo! What would you like?"}</p>
          <div className="menu-tabs" role="tablist">
            {([["food", "🍛 Pagkain"], ["drinks", "🥤 Inumin"], ["inuman", "🍻 Inuman"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === "inuman" && <p className="field-hint">18+ only, and just for fun: nobody actually drinks. 😄</p>}
          <div className="room-actions food-menu">
            {tab === "food"
              ? Object.entries(FOODS).map(([emoji, label]) => (
                <button key={emoji} type="button" className="service-chip" aria-pressed={act.food === emoji} onClick={() => setAct({ food: emoji })}>{emoji} {label}</button>
              ))
              : menu("canteen", tab === "inuman").map(([id, d]) => (
                <button key={id} type="button" className="service-chip" aria-pressed={act.drink === id} onClick={() => orderDrink(id)}>{d.emoji} {d.label}</button>
              ))}
          </div>
          {(act.food || act.drink) && (
            <div className="room-actions">
              {act.food && <button type="button" className="btn-secondary" onClick={() => setAct({ food: undefined })}>Finish eating</button>}
              {act.drink && <button type="button" className="btn-secondary" onClick={() => setAct({ drink: undefined })}>Finish drink</button>}
            </div>
          )}
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

      {zone === "pool" && (
        <>
          <p>Pickleball: first to 11, win by 2. Play a teammate, or practise against the robot.</p>
          <button type="button" className="btn-primary" onClick={() => useHq.setState({ pongGame: "pickle", pongMenu: true })}>🥒 Play pickleball</button>
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

      {zone === "play" && (
        <>
          <p>🛝 Climb up, slide down and land in the ball pit! Tap the slide, or use the button.</p>
          <button type="button" className="btn-primary" onClick={() => requestPose("sit", "slide")}>Go down the slide</button>
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
              <li><PersonFace look={me.look} photo={me.photo} size={28} /> {me.name} (you)</li>
              {inside.map((p) => <li key={p.id}><PersonFace look={p.look} photo={p.photo} size={28} /> {p.name}</li>)}
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
              <li><PersonFace look={me.look} photo={me.photo} size={28} /> {me.name} (you)</li>
              {inside.map((p) => <li key={p.id}><PersonFace look={p.look} photo={p.photo} size={28} /> {p.name}</li>)}
            </ul>
          </>
        );
      })()}
    </div>
  );
}
