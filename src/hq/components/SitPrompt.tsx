import { useHq } from "../store";

/** A button that appears when you are next to something you can sit on, and while you are sitting. */
export function SitPrompt() {
  const near = useHq((s) => s.nearSeat);
  const pose = useHq((s) => s.me?.act?.pose);
  const requestPose = useHq((s) => s.requestPose);
  if (pose === "sleep" || (!near && pose !== "sit")) return null;
  return pose === "sit"
    ? <button type="button" className="sit-prompt" onClick={() => requestPose("stand")}>Stand up</button>
    : <button type="button" className="sit-prompt" onClick={() => requestPose("sit", near!)}>🪑 Sit here</button>;
}
