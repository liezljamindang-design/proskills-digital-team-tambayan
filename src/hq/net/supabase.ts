import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase settings. Both values are safe to publish: the "anon" key only
 * allows what the project's own security rules allow. Without them the HQ
 * runs in preview mode.
 */
const env = import.meta.env as Record<string, string | undefined>;
// Vercel's Supabase integration names these NEXT_PUBLIC_…; a manual setup uses VITE_….
const URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(URL && KEY);

let client: Promise<SupabaseClient> | null = null;
/** The one Supabase client for this page. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) return Promise.reject(new Error("Supabase is not configured"));
  // Bundled with the page on purpose: a piece loaded later can go missing when a new version is published mid-visit.
  client ??= Promise.resolve(createClient(URL!, KEY!));
  return client;
}
