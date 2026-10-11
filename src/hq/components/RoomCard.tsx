import { HQ } from "../config";
import { ZONES } from "../data/office";
import { openMeeting, setAct, updateMyProfile } from "../net/session";
import { zoneAt } from "../office/engine";
import { MANUAL, statusOf, WORK_STATUSES } from "../status";
import { useHq } from "../store";
import type { Drink } from "../types";

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
  if (!me || !zone || !["cafe", "lounge", "nap", "huddle", "focus"].includes(zone)) return null;
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

      {zone === "lounge" && (
        <>
          <p>{act.pose === "sit" ? "Comfy. Move to stand up." : "Take a seat on the sofa."}</p>
          <div className="room-actions">
            <button type="button" className="btn-secondary" onClick={() => requestPose(act.pose === "sit" ? "stand" : "sit")}>{act.pose === "sit" ? "Stand up" : "Sit on the sofa"}</button>
            <button type="button" className="btn-secondary" onClick={() => setAct({ phone: !act.phone })}>{act.phone ? "Put phone away" : "Use phone"}</button>
          </div>
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

      {zone === "focus" && (
        <>
          <p>What are you on right now?</p>
          <div className="room-actions">
            {WORK_STATUSES.map((id) => (
              <button key={id} type="button" className="service-chip" aria-pressed={(me.status ?? "working") === id}
                onClick={() => updateMyProfile({ ...me, status: id === "working" ? undefined : id })}>
                {MANUAL[id].emoji} {MANUAL[id].label}
              </button>
            ))}
          </div>
          <ul className="room-people">
            {Object.values(peers).filter((p) => zoneAt(p.x, p.y) === "focus").map((p) => (
              <li key={p.id}><strong>{p.name}</strong> {statusOf(p, "focus").emoji} {statusOf(p, "focus").label}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
