import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Batch assignments made by admins, kept in the "tambayan_assignments" table.
 * Only an admin's account is allowed to write there (checked by the database, not the page).
 * In preview mode there is no database, so they are kept in this browser to try the feature.
 */
const TABLE = "tambayan_assignments", LOCAL = "playground.assign";
const local = (): Record<string, number[]> => { try { return JSON.parse(localStorage.getItem(LOCAL) ?? "{}"); } catch { return {}; } };

export async function loadAssignment(id: string): Promise<number[] | null> {
  if (!supabaseConfigured) return local()[id] ?? null;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from(TABLE).select("batches").eq("member_id", id).maybeSingle();
    if (error || !data) return null;
    const list = (data.batches as number[] | null) ?? [];
    return list.length ? list : null;
  } catch { return null; }
}

/** Sets (or, with 0, clears) a member's batch. Returns a message when it did not work. */
export async function saveAssignment(id: string, batch: number): Promise<string | null> {
  if (!supabaseConfigured) {
    const all = local(); if (batch) all[id] = [batch]; else delete all[id];
    try { localStorage.setItem(LOCAL, JSON.stringify(all)); } catch { /* private mode */ }
    return null;
  }
  try {
    const supabase = await getSupabase();
    const { error } = batch
      ? await supabase.from(TABLE).upsert({ member_id: id, batches: [batch], updated_at: new Date().toISOString() })
      : await supabase.from(TABLE).delete().eq("member_id", id);
    if (!error) return null;
    return /does not exist|schema cache|not find/i.test(error.message) ? "The assignments table isn't set up in Supabase yet." : /row-level|policy|permission/i.test(error.message) ? "Only admins can assign batches. Sign out and back in if you were just made an admin." : error.message;
  } catch (err) { return err instanceof Error ? err.message : "Couldn't save."; }
}
