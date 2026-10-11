import type { Look } from "../types";
import { getSupabase, supabaseConfigured } from "./supabase";

/** What is stored on a person's account, so their name and chibi follow them between devices. */
export interface SavedProfile { name?: string; role?: string; look?: Look; best?: number; birthday?: string }
export interface Account { id: string; email: string; saved: SavedProfile }

/** Accounts exist only in live mode. In preview mode everyone is a guest on their own device. */
export const accountsEnabled = supabaseConfigured;

export async function currentAccount(): Promise<Account | null> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? "", saved: (user.user_metadata ?? {}) as SavedProfile } : null;
}

/** Signs in with an email and password created for this person in the Supabase dashboard. */
export async function signIn(email: string, password: string): Promise<Account> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "Sign-in failed");
  return { id: data.user.id, email: data.user.email ?? email, saved: (data.user.user_metadata ?? {}) as SavedProfile };
}

export async function saveToAccount(saved: SavedProfile): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.updateUser({ data: saved });
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}
