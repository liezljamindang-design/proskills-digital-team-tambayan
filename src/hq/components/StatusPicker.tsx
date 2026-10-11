import { updateMyProfile } from "../net/session";
import { MANUAL, statusOf } from "../status";
import { useHq } from "../store";
import type { ManualStatus } from "../types";

/** Your status: automatic (it follows the room you are in) or one you pin yourself. */
export function StatusPicker() {
  const me = useHq((s) => s.me);
  const myZone = useHq((s) => s.myZone);
  if (!me) return null;
  const auto = statusOf({}, myZone);

  return (
    <label className="status-picker">
      <span>Your status</span>
      <select
        value={me.status ?? "auto"}
        onChange={(e) => updateMyProfile({ ...me, status: e.target.value === "auto" ? undefined : (e.target.value as ManualStatus) })}
      >
        <option value="auto">Automatic: {auto.emoji} {auto.label}</option>
        {(Object.keys(MANUAL) as ManualStatus[]).map((id) => (
          <option key={id} value={id}>{MANUAL[id].emoji} {MANUAL[id].label}</option>
        ))}
      </select>
    </label>
  );
}
