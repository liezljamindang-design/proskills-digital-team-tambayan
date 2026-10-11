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
        <div><dt>Talk</dt><dd>Type under the office or in the Chat tab. Your words pop up in a bubble over your head.</dd></div>
        <div><dt>Private chat</dt><dd>Click a person, or use Message in the People tab. Only the two of you see it.</dd></div>
        <div><dt>Play</dt><dd>Walk into the Recreation Room and the arcade opens, with everyone who is inside. Chat stays open beside it.</dd></div>
        <div><dt>Your look</dt><dd>My avatar changes your name and chibi any time.</dd></div>
        <div><dt>Rooms do things</dt><dd>Order a drink in the Café, sit and scroll in the Lounge, stop in the Sleeping Quarters to nap, set what you are working on in the Work Room, and walk into the Collaboration Room to open the team Zoom.</dd></div>
        <div><dt>React</dt><dd>Use the Happy, Angry, Dance and Blink buttons above the message box.</dd></div>
      </dl>
      <p className="muted">
        {liveMode
          ? "Messages aren't saved: they disappear when you close the page."
          : "Preview mode: people appear only from other tabs of this same browser, and messages aren't saved."}
      </p>
      <div className="dialog-actions"><button type="button" className="btn-primary" onClick={close} autoFocus>Close</button></div>
    </Dialog>
  );
}
