import { useEffect, useState } from "react";
import { accountsEnabled } from "./net/auth";
import { getSupabase } from "./net/supabase";

/** The photo from the person's Google sign-in, or "" when they have none. */
export function usePhoto(key: unknown = 0): [string, () => void] {
  const [photo, setPhoto] = useState("");
  useEffect(() => {
    if (!accountsEnabled) return;
    let live = true;
    getSupabase().then((sb) => sb.auth.getSession()).then(({ data }) => {
      const m = (data.session?.user.user_metadata ?? {}) as { avatar_url?: unknown; picture?: unknown };
      const url = typeof m.avatar_url === "string" ? m.avatar_url : typeof m.picture === "string" ? m.picture : "";
      if (live && /^https:\/\//.test(url)) setPhoto(url);
    }).catch(() => { /* keep the chibi */ });
    return () => { live = false; };
  }, [key]);
  return [photo, () => setPhoto("")];
}
