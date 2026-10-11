import { liveMode } from "../net/session";
import { useHq } from "../store";
import { Dialog } from "./Dialog";

export function HelpDialog() {
  const open = useHq((s) => s.helpOpen);
  const close = () => useHq.getState().setHelpOpen(false);
  return (
    <Dialog open={open} onClose={close} labelledBy="help-title">
      <h2 id="help-title">How it works</h2>
      <dl className="how-to">
        <div><dt>Move</dt><dd><span className="only-desktop">WASD or arrow keys, or click the floor.</span><span className="only-mobile">Tap the floor and your chibi walks there.</span></dd></div>
        <div><dt>Look around</dt><dd>Drag the office with a finger or the mouse to look around, in any view. Pinch with two fingers to zoom.</dd></div>
        <div><dt>Talk</dt><dd>Type under the office or in the Chat tab. Your words pop up in a bubble over your head.</dd></div>
        <div><dt>Private chat</dt><dd>Click a person, or use Message in the People tab. Only the two of you see it.</dd></div>
        <div><dt>Play</dt><dd>Walk into the Recreation Room and the arcade opens, with everyone who is inside. Chat stays open beside it.</dd></div>
        <div><dt>Your look</dt><dd>My avatar changes your name and chibi any time.</dd></div>
        <div><dt>Rooms do things</dt><dd>Order a drink in the Café, sit and scroll in the Lounge, stop in the Sleeping Quarters to nap, walk into the Classroom to join live training on Zoom, and walk into the Collaboration Room to open the team Zoom. Run on a treadmill or lift weights in the Gym, pick up a ball and shoot hoops on the Basketball Court, and dance on the light-up floor in the Dance Studio. There is also a Library, Cinema, Swimming Pool, Canteen and Music Room. The Rooms tab takes you to any of them.</dd></div>
        <div><dt>Voice</dt><dd>Press "Join voice" under the reactions to talk with everyone else who has joined. Your browser will ask to use the microphone. You can mute or leave at any time.</dd></div>
        <div><dt>Views</dt><dd>The View menu at the top left of the office switches between Overhead, Free look, 3rd person, Facing you, 1st person and the simple flat drawing. In 1st and 3rd person, left and right turn you.</dd></div>
        <div><dt>Install as an app</dt><dd>Open the Get app tab for steps to download it on a PC or a phone.</dd></div>
        <div><dt>Say hi</dt><dd>Click a teammate on the floor to wave, high-five, hug, cheer, message them or challenge them to ping-pong. Type @ and their name in chat to get their attention.</dd></div>
        <div><dt>Coins and the shop</dt><dd>You earn coins for coming in each day, chatting and playing. Click the coin counter in the top bar to spend them on hats and pets.</dd></div>
        <div><dt>Music</dt><dd>The Music button in the top bar opens a list of ad-free radio stations. Everyone on the same station hears the same live stream.</dd></div>
        <div><dt>Zoom</dt><dd>Use the + and − buttons at the bottom right of the office, pinch with two fingers, or scroll the mouse wheel over it. "Whole floor" shows everything at once.</dd></div>
        <div><dt>Sit</dt><dd>Tap any chair, stool, bean bag or sofa to walk over and sit on it. Move to stand up.</dd></div>
        <div><dt>React</dt><dd>Use the row of faces above the message box: happy, laugh, love, wow, cool, shy, thinking, sleepy, cry, angry, dance and blink.</dd></div>
      </dl>
      <p className="muted">
        {liveMode
          ? "Chat messages are kept, so you can scroll back to earlier ones. Voice is never recorded."
          : "Preview mode: people appear only from other tabs of this same browser, and messages aren't saved."}
      </p>
      <div className="dialog-actions"><button type="button" className="btn-primary" onClick={close} autoFocus>Close</button></div>
    </Dialog>
  );
}
