import { useEffect } from "react";
import { BottomNav } from "./components/BottomNav";
import { Composer } from "./components/Composer";
import { Arcade } from "./components/Arcade";
import { celebrants } from "./birthday";
import { earnForChat } from "./economy";
import { Shop } from "./components/Shop";
import { EmoteBar } from "./components/EmoteBar";
import { SitPrompt } from "./components/SitPrompt";
import { Party } from "./components/Party";
import { PeerCard } from "./components/PeerCard";
import { Pong, PongPrompt } from "./components/Pong";
import { RoomCard } from "./components/RoomCard";
import { HelpDialog } from "./components/HelpDialog";
import { Hud } from "./components/Hud";
import { SidePanel } from "./components/SidePanel";
import { Welcome } from "./components/Welcome";
import { HQ } from "./config";
import { say } from "./net/session";
import { FloorMap } from "./office/FloorMap";
import { Floor3D } from "./office3d/Floor3D";
import { useHq } from "./store";

/** The whole space: the office in the middle, chat and people beside it. */
export function Headquarters() {
  const gameOpen = useHq((s) => s.gameOpen);
  const sheetOpen = useHq((s) => s.sheetOpen);
  const view3d = useHq((s) => s.view3d);
  const me = useHq((s) => s.me);
  const peers = useHq((s) => s.peers);
  const joined = useHq((s) => s.joined);
  const party = joined ? celebrants(me, peers) : [];
  const unreadTotal = useHq((s) => Object.values(s.unread).reduce((a, b) => a + b, 0));
  useEffect(() => { document.title = unreadTotal > 0 ? `(${unreadTotal}) ${HQ.name}` : HQ.name; }, [unreadTotal]);
  const partyOn = Boolean(me?.act?.party) || Object.values(peers).some((p) => p.act?.party);

  return (
    <div className={`hq${sheetOpen ? " sheet-open" : ""}${gameOpen ? " in-arcade" : ""}${partyOn ? " party" : ""}`}>
      <Hud />
      <main className="hq-main">
        <section className="hq-stage" aria-labelledby="hq-title">
          <header className="hq-intro">
            <div className="hq-intro-copy">
              <p className="eyebrow">Just for fun</p>
              <h1 id="hq-title">{HQ.name}</h1>
              {party.length > 0 && <p className="birthday-ribbon" role="status">🎂 Happy birthday, {party.map((c) => c.name).join(" and ")}! 🎉</p>}
              <p className="hq-lede">
                <span className="only-desktop">Walk with WASD or the arrow keys, or click the floor. Click a teammate to chat privately.</span>
                <span className="only-mobile">Tap the floor to walk. Tap a teammate to chat privately.</span>
              </p>
            </div>
          </header>
          <div className="stage-body">
            {view3d ? <Floor3D /> : <FloorMap />}
            {!gameOpen && <Party />}
            {gameOpen && <Arcade />}
            {!gameOpen && <RoomCard />}
            {!gameOpen && <SitPrompt />}
            {!gameOpen && <PeerCard />}
          </div>
          <div className="quick-say">
            <EmoteBar />
            <Composer id="quick-composer" placeholder="Say something to everyone" onSend={(text) => { say(text); earnForChat(); }} />
          </div>
        </section>
        <SidePanel />
      </main>
      <BottomNav />
      <Welcome />
      <HelpDialog />
      <Shop />
      <PongPrompt />
      <Pong />
    </div>
  );
}
