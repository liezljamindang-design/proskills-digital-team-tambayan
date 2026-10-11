import type { Look } from "../types";
import { getSupabase, supabaseConfigured } from "./supabase";

/** What is stored on a person's account, so their name and chibi follow them between devices. */
export interface SavedProfile { name?: string; role?: string; look?: Look; best?: number; birthday?: string; birthYear?: number | null; firstName?: string; batch?: number | null; batches?: number[] }
export interface Account { id: string; email: string; saved: SavedProfile; admin: boolean }
/** Admins are marked on the account in Supabase (app_metadata.role = "admin"), which people cannot edit themselves. */
const isAdmin = (user: { app_metadata?: Record<string, unknown> }) => user.app_metadata?.role === "admin";

/**
 * With Supabase connected, people create their own account (or sign in) so their name and
 * chibi are remembered on any device. They can still choose to come in as a guest.
 * Set VITE_REQUIRE_SIGNIN=false to skip the account screen entirely.
 */
export const accountsEnabled = supabaseConfigured && import.meta.env.VITE_REQUIRE_SIGNIN !== "false";

export async function currentAccount(): Promise<Account | null> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? "", saved: (user.user_metadata ?? {}) as SavedProfile, admin: isAdmin(user) } : null;
}

/** Signs in with an email and password created for this person in the Supabase dashboard. */
export async function signIn(email: string, password: string): Promise<Account> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "Sign-in failed");
  return { id: data.user.id, email: data.user.email ?? email, saved: (data.user.user_metadata ?? {}) as SavedProfile, admin: isAdmin(data.user) };
}

/**
 * Creates an account. Returns null when the project asks people to confirm their
 * email first: they are not signed in until they click the link they were sent.
 */
export async function signUp(email: string, password: string): Promise<Account | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "Sign-up failed");
  return data.session ? { id: data.user.id, email: data.user.email ?? email, saved: {}, admin: isAdmin(data.user) } : null;
}

export async function saveToAccount(saved: SavedProfile): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.updateUser({ data: saved });
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

/** Sets a new password for whoever is signed in. */
export async function changePassword(password: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/** Social sign-in buttons to show, set by VITE_SOCIAL_LOGIN (for example "google,facebook"). Each must also be switched on in Supabase. */
export type SocialProvider = "google" | "facebook";
export const socialProviders = String(import.meta.env.VITE_SOCIAL_LOGIN ?? "").split(",").map((p) => p.trim().toLowerCase()).filter((p): p is SocialProvider => p === "google" || p === "facebook");

/** Sends the person to Google or Facebook to sign in. They come back to this page already signed in. */
export async function signInWith(provider: SocialProvider): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  if (error) throw new Error(error.message);
}
