import { useEffect, useState, type FormEvent, useRef } from "react";
import { HQ } from "../config";
import { accountsEnabled, changePassword, currentAccount, onSignedIn, returnError, saveToAccount, signIn, signInWith, signOut, signUp, socialProviders, type Account } from "../net/auth";
import { dailyCheckIn } from "../economy";
import { startRoster } from "../net/roster";
import { joinOffice, liveMode, updateMyProfile } from "../net/session";
import { DEFAULT_LOOK } from "../office/Chibi";
import { useHq } from "../store";
import { batchesOf, type Look, type Profile } from "../types";
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
  const kicked = useHq((s) => s.kicked);
  const editing = useHq((s) => s.editingAvatar);
  const setEditing = useHq((s) => s.setEditingAvatar);
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(accountsEnabled);
  const [failed, setFailed] = useState("");
  const [guest, setGuest] = useState(false);
  // Preview builds can switch this on to try the admin form without accounts.
  const isAdmin = account?.admin ?? (!accountsEnabled && (import.meta.env.VITE_PREVIEW_ADMIN === "true" || new URLSearchParams(window.location.search).has("admin")));

  // Live mode: pick up an existing session, so returning teammates walk straight in.
  useEffect(() => {
    if (!accountsEnabled) return;
    const problem = returnError();
    if (problem) setFailed(`Sign-in didn't finish. The sign-in service said: "${problem}"`);
    currentAccount().then(setAccount).catch(() => setFailed("Couldn't reach the sign-in service. Check your connection and reload.")).finally(() => setChecking(false));
    // A sign-in that completes a moment after the page loads (coming back from Google) is picked up here.
    void onSignedIn((signedIn) => setAccount((current) => current ?? signedIn)).catch(() => undefined);
  }, []);

  // The choice to hide the Admin label follows the account to a new device.
  useEffect(() => { if (account?.saved.hideAdmin !== undefined) { try { localStorage.setItem("playground.hideAdmin", account.saved.hideAdmin ? "1" : "0"); } catch { /* private mode */ } } }, [account]);
  const hidesTag = () => { try { return localStorage.getItem("playground.hideAdmin") === "1"; } catch { return false; } };
  async function enter(name: string, role: string, look: Look, birthday?: string, birthYear?: number, firstName?: string, batches: number[] = []) {
    const batch = batches[0];
    const profile: Profile = { id: account?.id ?? guestId(), name, role, look, birthday, birthYear, firstName, batch, batches, admin: isAdmin || undefined, hideAdmin: (isAdmin && hidesTag()) || undefined, coins: me?.coins ?? fromAccount?.coins, streak: me?.streak ?? fromAccount?.streak, lastDay: me?.lastDay ?? fromAccount?.lastDay, owned: me?.owned ?? fromAccount?.owned, best: me?.best ?? account?.saved.best, status: me?.status, act: joined ? me?.act : undefined };
    setFailed("");
    try {
      // Saved to the account first, so the chibi is remembered even if the live connection fails.
      if (account) void saveToAccount({ name, role, look, birthday: birthday ?? "", birthYear: birthYear ?? null, firstName: firstName ?? "", batch: batch ?? null, batches, best: profile.best, hideAdmin: Boolean(profile.hideAdmin) });
      if (joined) { updateMyProfile(profile); startRoster(profile); }
      else { useHq.getState().setMe(profile); await joinOffice(profile); dailyCheckIn(); }
      setEditing(false);
    } catch (err) {
      setFailed(`Couldn't connect to the office. Try again in a moment.${err instanceof Error && err.message ? ` (Details: ${err.message})` : ""}`);
    }
  }

  const needsSignIn = accountsEnabled && !account && !guest && !joined;
  const open = !joined || editing;
  // Signed in: what is saved on the account wins over whatever this browser remembers.
  const fromAccount: Profile | null = account?.saved.name
    ? { id: account.id, name: account.saved.name, role: account.saved.role ?? "", look: { ...DEFAULT_LOOK, ...account.saved.look }, best: account.saved.best, birthday: account.saved.birthday || undefined, birthYear: account.saved.birthYear ?? undefined, firstName: account.saved.firstName || undefined, batch: account.saved.batch ?? undefined, batches: (account.admin ? account.saved.batches : account.saved.batches?.slice(0, 1)) ?? undefined, admin: account.admin || undefined, hideAdmin: (account.admin && (account.saved.hideAdmin ?? hidesTag())) || undefined, coins: account.saved.coins, streak: account.saved.streak, lastDay: account.saved.lastDay, owned: account.saved.owned }
    : null;
  const initial: Profile | null = joined ? me : fromAccount ?? (account ? null : me);

  // A returning teammate with a saved chibi walks straight in, without seeing the editor again.
  const autoTried = useRef(false);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    // No batch yet: the editor opens so they can pick one before walking in.
    if (!fromAccount || joined || autoTried.current || !batchesOf(fromAccount).length) return;
    autoTried.current = true;
    setEntering(true);
    useHq.getState().setMe(fromAccount);
    joinOffice(fromAccount)
      .then(dailyCheckIn)
      .catch((err) => setFailed(`Couldn't connect to the office. Try again in a moment.${err instanceof Error && err.message ? ` (Details: ${err.message})` : ""}`))
      .finally(() => setEntering(false));
    // Runs once, when the account first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, joined]);

  if (kicked) return (
    <Dialog open onClose={() => undefined} labelledBy="kicked-title">
      <div className="welcome">
        <h2 id="kicked-title">You're signed in on another device</h2>
        <p>Your account can be in the Pro Skills Digital Lobby on one device at a time, phone or computer. It was just opened somewhere else, so this one stepped out.</p>
        <div className="dialog-actions"><button type="button" className="btn-primary" onClick={() => window.location.reload()}>Use it here instead</button></div>
      </div>
    </Dialog>
  );

  return (
    <Dialog open={open} onClose={() => { if (joined) setEditing(false); }} labelledBy="welcome-title">
      <div className="welcome">
        <p className="eyebrow">{joined ? "My profile" : liveMode ? "Team space" : "Preview mode"}</p>
        <h2 id="welcome-title">{joined ? "Change your look" : `Welcome to ${HQ.name}`}</h2>
        {!joined && <p>A just-for-fun office for the team. Make your chibi, walk around, chat and play.</p>}
        {!joined && !liveMode && <p className="muted">Preview mode: you'll only see people who are in other tabs of this same browser. Connecting Supabase makes it live for the whole team.</p>}
        {failed && <p className="field-error" role="alert">{failed}</p>}

        {!checking && !needsSignIn && account && (
          <AccountBox email={account.email} />
        )}
        {checking || entering ? (
          <p className="muted">{entering ? "Welcome back! Walking you in…" : "Checking who you are…"}</p>
        ) : needsSignIn ? (
          <SignIn onSignedIn={setAccount} onGuest={() => setGuest(true)} />
        ) : (
          <AvatarBuilder
            initial={initial}
            submitLabel={joined ? "Save" : "Enter the office"}
            onSubmit={enter}
            admin={isAdmin}
            onCancel={joined ? () => setEditing(false) : undefined}
          />
        )}
      </div>
    </Dialog>
  );
}

function SignIn({ onSignedIn, onGuest }: { onSignedIn: (account: Account) => void; onGuest: () => void }) {
  const [mode, setMode] = useState<"up" | "in">("in");
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
      if (account) return onSignedIn(account);
      // No session came back. Signing in straight away works unless the project insists on a confirmed email.
      try { onSignedIn(await signIn(email.trim(), password)); }
      catch { setMode("in"); setNotice("Almost there: open the confirmation email we just sent, click the link, then sign in here."); }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(mode === "in"
        ? /not confirmed/i.test(message) ? "This email hasn't been confirmed yet. Click the link in the confirmation email, or ask the admin to confirm you."
          : "That email and password didn't match. Check them, or create an account if you are new."
        : /already/i.test(message) ? "That email already has an account. Sign in instead."
          : /rate limit|sending|confirmation email/i.test(message) ? `Supabase said: "${message}". It tried to send a confirmation email and hit the free limit. The \"Confirm email\" switch in Supabase is still on: turn it off and save, then try again.`
          : /signups? (not allowed|disabled)/i.test(message) ? "New sign-ups are turned off in Supabase. Ask the admin to allow them."
          : /fetch|network/i.test(message) ? "Couldn't reach the sign-in service. Check your connection and try again."
          : `Couldn't create the account: ${message || "unknown error"}`);
    } finally { setBusy(false); }
  }

  return (
    <form className="inquiry" onSubmit={submit} noValidate>
      {socialProviders.length > 0 && (
        <div className="social">
          {socialProviders.map((provider) => (
            <button key={provider} type="button" className={`social-btn is-${provider}`}
              onClick={() => { setError(""); signInWith(provider).catch(() => setError(`Couldn't open ${provider === "google" ? "Google" : "Facebook"} sign-in. Try again, or use email below.`)); }}>
              Continue with {provider === "google" ? "Google" : "Facebook"}
            </button>
          ))}
          <p className="social-or">or use email</p>
        </div>
      )}
      <div className="chips" role="group" aria-label="Account">
        <button type="button" className="service-chip" aria-pressed={mode === "in"} onClick={() => { setMode("in"); setError(""); }}>I have an account</button>
        <button type="button" className="service-chip" aria-pressed={mode === "up"} onClick={() => { setMode("up"); setError(""); }}>I'm new: create account</button>
      </div>
      <p>{mode === "up" ? "Create an account once and your name and chibi are remembered on any device." : "Welcome back! Sign in to pick up your chibi."}</p>
      <div className="field"><label htmlFor="si-email">Email</label><input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="si-pass">Password</label><PasswordInput id="si-pass" autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={setPassword} /></div>
      {notice && <p className="muted" role="status">{notice}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary inquiry-submit" disabled={busy}>{busy ? "One moment…" : mode === "up" ? "Create account" : "Sign in"}</button>
      <button type="button" className="text-btn" onClick={onGuest}>Just visiting? Continue as a guest</button>
    </form>
  );
}

/** For signed-in people: change your password, or sign out of this browser. */
function AccountBox({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    if (password.length < 6) return setError("Use a password of at least 6 characters.");
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true); setError("");
    try { await changePassword(password); setDone(true); setPassword(""); setAgain(""); }
    catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(/different from the old/i.test(message) ? "That is already your password. Choose a different one." : `Couldn't change the password${message ? `: ${message}` : "."}`);
    } finally { setBusy(false); }
  }

  return (
    <section className="account-box" aria-label="Your account">
      <p className="muted">Signed in as <strong>{email}</strong></p>
      <div className="account-actions">
        <button type="button" className="btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Change password</button>
        <button type="button" className="btn-secondary" onClick={() => { void signOut().finally(() => window.location.reload()); }}>Sign out</button>
      </div>
      {open && (
        <form className="inquiry" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="pw-new">New password</label><PasswordInput id="pw-new" autoComplete="new-password" value={password} onChange={setPassword} /></div>
          <div className="field"><label htmlFor="pw-again">Type it again</label><PasswordInput id="pw-again" autoComplete="new-password" value={again} onChange={setAgain} /></div>
          {error && <p className="field-error" role="alert">{error}</p>}
          {done && <p className="muted" role="status">Password changed. Use the new one next time you sign in.</p>}
          <button type="submit" className="btn-primary inquiry-submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
        </form>
      )}
    </section>
  );
}

/** A password field with an eye button to show or hide what was typed. */
function PasswordInput({ id, autoComplete, value, onChange }: { id: string; autoComplete: string; value: string; onChange: (value: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} type={shown ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="pw-eye" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
