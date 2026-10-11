import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase settings. Both values are safe to publish: the "anon" key only
 * allows what the project's own security rules allow. Without them the HQ
 * runs in preview mode.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(URL && KEY);

let client: Promise<SupabaseClient> | null = null;
/** Loads the Supabase library only when it is actually needed. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) return Promise.reject(new Error("Supabase is not configured"));
  client ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(URL!, KEY!));
  return client;
}
