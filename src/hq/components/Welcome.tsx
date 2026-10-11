import { useEffect, useState, type FormEvent } from "react";
import { HQ } from "../config";
import { accountsEnabled, currentAccount, saveToAccount, signIn, signUp, type Account } from "../net/auth";
import { joinOffice, liveMode, updateMyProfile } from "../net/session";
import { DEFAULT_LOOK } from "../office/Chibi";
import { useHq } from "../store";
import type { Look, Profile } from "../types";
import { AvatarBuilder } from "./AvatarBuilder";
import { Dialog } from "./Dialog";

/** Each browser tab is its own person in preview mode, so two tabs show two avatars. */
function guestId(): string {
  try {
    let id = window.sessionStorage.getItem("playground.guest");
    if (!id) { id = `guest-${crypto.randomUUID()}`; window.sessionStorage.setItem("playground.guest", id); }
    return id;
  } catch { return `guest-${Math.random().toString(36).slice(2)}`; }
}

/**
 * The way in: sign in (live mode only), make your chibi, enter. It also
 * reopens as the avatar editor from "My avatar".
 */
export function Welcome() {
  const me = useHq((s) => s.me);
  const joined = useHq((s) => s.joined);
  const editing = useHq((s) => s.editingAvatar);
  const setEditing = useHq((s) => s.setEditingAvatar);
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(accountsEnabled);
  const [failed, setFailed] = useState("");
  const [guest, setGuest] = useState(false);

  // Live mode: pick up an existing session, so returning teammates walk straight in.
  useEffect(() => {
    if (!accountsEnabled) return;
    currentAccount().then(setAccount).catch(() => setFailed("Couldn't reach the sign-in service. Check your connection and reload.")).finally(() => setChecking(false));
  }, []);

  async function enter(name: string, role: string, look: Look, birthday?: string, birthYear?: number) {
    const profile: Profile = { id: account?.id ?? guestId(), name, role, look, birthday, birthYear, best: me?.best ?? account?.saved.best, status: me?.status, act: joined ? me?.act : undefined };
    setFailed("");
    try {
      if (joined) updateMyProfile(profile);
      else { useHq.getState().setMe(profile); await joinOffice(profile); }
      if (account) void saveToAccount({ name, role, look, birthday: birthday ?? "", birthYear: birthYear ?? null, best: profile.best });
      setEditing(false);
    } catch {
      setFailed("Couldn't connect to the office. Check your connection and try again.");
    }
  }

  const needsSignIn = accountsEnabled && !account && !guest && !joined;
  const open = !joined || editing;
  const initial: Profile | null =
    me ?? (account?.saved.name ? { id: account.id, name: account.saved.name, role: account.saved.role ?? "", look: { ...DEFAULT_LOOK, ...account.saved.look }, best: account.saved.best, birthday: account.saved.birthday || undefined, birthYear: account.saved.birthYear ?? undefined } : null);

  return (
    <Dialog open={open} onClose={() => { if (joined) setEditing(false); }} labelledBy="welcome-title">
      <div className="welcome">
        <p className="eyebrow">{joined ? "My avatar" : liveMode ? "Team space" : "Preview mode"}</p>
        <h2 id="welcome-title">{joined ? "Change your look" : `Welcome to ${HQ.name}`}</h2>
        {!joined && <p>A just-for-fun office for the team. Make your chibi, walk around, chat and play.</p>}
        {!joined && !liveMode && <p className="muted">Preview mode: you'll only see people who are in other tabs of this same browser. Connecting Supabase makes it live for the whole team.</p>}
        {failed && <p className="field-error" role="alert">{failed}</p>}

        {checking ? (
          <p className="muted">Checking who you are…</p>
        ) : needsSignIn ? (
          <SignIn onSignedIn={setAccount} onGuest={() => setGuest(true)} />
        ) : (
          <AvatarBuilder
            initial={initial}
            submitLabel={joined ? "Save" : "Enter the office"}
            onSubmit={enter}
            onCancel={joined ? () => setEditing(false) : undefined}
          />
        )}
      </div>
    </Dialog>
  );
}

function SignIn({ onSignedIn, onGuest }: { onSignedIn: (account: Account) => void; onGuest: () => void }) {
  const [mode, setMode] = useState<"up" | "in">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Use a password of at least 6 characters.");
    setBusy(true); setError("");
    try {
      if (mode === "in") return onSignedIn(await signIn(email.trim(), password));
      const account = await signUp(email.trim(), password);
      if (account) onSignedIn(account);
      else { setMode("in"); setNotice("Almost there: open the confirmation email we just sent, click the link, then sign in here."); }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(mode === "in"
        ? "That email and password didn't match. Check them, or create an account if you are new."
        : /already/i.test(message) ? "That email already has an account. Sign in instead." : "Couldn't create the account. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return (
    <form className="inquiry" onSubmit={submit} noValidate>
      <div className="chips" role="group" aria-label="Account">
        <button type="button" className="service-chip" aria-pressed={mode === "up"} onClick={() => { setMode("up"); setError(""); }}>I'm new: create account</button>
        <button type="button" className="service-chip" aria-pressed={mode === "in"} onClick={() => { setMode("in"); setError(""); }}>I have an account</button>
      </div>
      <p>{mode === "up" ? "Create an account once and your name and chibi are remembered on any device." : "Welcome back! Sign in to pick up your chibi."}</p>
      <div className="field"><label htmlFor="si-email">Email</label><input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="si-pass">Password</label><input id="si-pass" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {notice && <p className="muted" role="status">{notice}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary inquiry-submit" disabled={busy}>{busy ? "One moment…" : mode === "up" ? "Create account" : "Sign in"}</button>
      <button type="button" className="text-btn" onClick={onGuest}>Just visiting? Continue as a guest</button>
    </form>
  );
}
