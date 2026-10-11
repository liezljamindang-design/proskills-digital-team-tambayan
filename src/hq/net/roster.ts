import { DEFAULT_LOOK } from "../office/Chibi";
import { useHq, type Away } from "../store";
import { batchesOf, type Profile } from "../types";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * The team list. Signed-in members are kept in the "tambayan_members" table, so the
 * People tab can show everyone, including members who are offline. If the table has
 * not been created this does nothing and the list falls back to people seen on this device.
 */
const TABLE = "tambayan_members";
let available = supabaseConfigured;
let timer = 0;

interface Row { id: string; name: string; first_name: string | null; role: string | null; look: Profile["look"] | null; batches: number[] | null; admin: boolean | null; last_seen: string }

async function saveMember(me: Profile) {
  if (!available || me.id.startsWith("guest-")) return;
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from(TABLE).upsert({
      id: me.id, name: me.name, first_name: me.firstName ?? null, role: me.role, look: me.look, batches: batchesOf(me), admin: Boolean(me.admin) && !me.hideAdmin, last_seen: new Date().toISOString(),
    });
    if (error) available = false;
  } catch { available = false; }
}

async function loadMembers() {
  if (!available) return;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from(TABLE).select("*").order("last_seen", { ascending: false }).limit(300);
    if (error) { available = false; return; }
    const members: Away[] = ((data ?? []) as Row[]).map((r) => ({
      id: r.id, name: r.name, firstName: r.first_name ?? undefined, role: r.role ?? "", look: { ...DEFAULT_LOOK, ...r.look },
      leftAt: Date.parse(r.last_seen) || 0, batches: r.batches ?? undefined, admin: r.admin ?? undefined,
    }));
    useHq.getState().mergeAway(members);
  } catch { available = false; }
}

/** Records that I am here, loads everyone else, and keeps my "last seen" fresh while the page is open. */
export function startRoster(me: Profile) {
  window.clearInterval(timer);
  void saveMember(me).then(loadMembers);
  timer = window.setInterval(() => {
    const current = useHq.getState().me;
    if (current) void saveMember(current).then(loadMembers);
  }, 3 * 60 * 1000);
}
