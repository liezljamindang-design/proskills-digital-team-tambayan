import { useEffect, useRef, useState } from "react";
import { setAct } from "../net/session";
import { useHq } from "../store";
import { displayName } from "../types";

/**
 * Stations from SomaFM: listener-supported internet radio with no adverts.
 * Each is a live stream, so everyone tuned to the same station hears the same thing.
 */
const STATIONS = [
  { id: "groovesalad", name: "Groove Salad", about: "Chilled beats and ambient grooves" },
  { id: "fluid", name: "Fluid", about: "Instrumental hip-hop and lo-fi" },
  { id: "lush", name: "Lush", about: "Mellow, mostly female vocals" },
  { id: "indiepop", name: "Indie Pop Rocks!", about: "New and classic indie pop" },
  { id: "poptron", name: "PopTron", about: "Electropop and indie dance" },
  { id: "u80s", name: "Underground 80s", about: "Synthpop and new wave" },
  { id: "seventies", name: "Left Coast 70s", about: "Mellow 70s album rock" },
  { id: "bossa", name: "Bossa Beyond", about: "Bossa nova and samba" },
  { id: "secretagent", name: "Secret Agent", about: "Lounge and spy-movie cool" },
  { id: "beatblender", name: "Beat Blender", about: "Deep house and downtempo" },
  { id: "reggae", name: "Heavyweight Reggae", about: "Reggae, ska and rocksteady" },
  { id: "dronezone", name: "Drone Zone", about: "Ambient, good for focus" },
  { id: "deepspaceone", name: "Deep Space One", about: "Deep ambient and space music" },
  { id: "spacestation", name: "Space Station Soma", about: "Spaced-out electronica, study and work" },
  { id: "thetrip", name: "The Trip", about: "Progressive house and trance, dance" },
  { id: "suburbsofgoa", name: "Suburbs of Goa", about: "Desi-influenced Asian world beats" },
  { id: "sonicuniverse", name: "Sonic Universe", about: "Jazz, eclectic and avant-garde" },
  { id: "7soul", name: "Seven Inch Soul", about: "Vintage soul from 45 rpm vinyl, oldies" },
  { id: "bootliquor", name: "Boot Liquor", about: "Americana and country roots" },
  { id: "folkfwd", name: "Folk Forward", about: "Indie folk, acoustic and alt-folk" },
  { id: "digitalis", name: "Digitalis", about: "Calm, digitally affected rock" },
  { id: "metal", name: "Metal Detector", about: "Heavy metal, from black to doom" },
  { id: "covers", name: "Covers", about: "Songs you know, covered by other artists" },
  { id: "illstreet", name: "Illinois Street Lounge", about: "Classic bachelor-pad lounge and exotica" },
  { id: "thistle", name: "ThistleRadio", about: "Celtic roots and branches" },
  { id: "cliqhop", name: "cliqhop idm", about: "Blips and beeps backed by beats, electronic" },
  { id: "dubstep", name: "Dub Step Beyond", about: "Dubstep, dub and deep bass" },
  { id: "missioncontrol", name: "Mission Control", about: "Ambient and electronica with NASA radio" },
  { id: "vaporwaves", name: "Vaporwaves", about: "Vaporwave, retro and chill aesthetics" },
  { id: "defcon", name: "DEF CON Radio", about: "Music for hacking, dark electronic" },
  { id: "bagel", name: "BAGeL Radio", about: "Alternative rock, noise pop and indie rock" },
] as const;
const AMBIENT = "ambient";
const streamUrl = (id: string) => `https://ice1.somafm.com/${id}-128-mp3`;
const ambient = () => import("../audio/ambient");

let player: HTMLAudioElement | null = null;

/** A song from YouTube, played in YouTube's own small player. */
interface Song { id: string; title: string; by?: string }
const songIdFrom = (text: string) => /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(text)?.[1] ?? null;
const SONG = "yt:";

/** The Music menu: office ambience or an ad-free radio station. Always off until someone turns it on. */
export function MusicToggle() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.6);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"radio" | "songs">("radio");
  const [songQuery, setSongQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songNote, setSongNote] = useState("");
  const [song, setSong] = useState<(Song & { queue: string[] }) | null>(null);

  async function searchSongs() {
    const q = songQuery.trim();
    const pasted = songIdFrom(q);
    if (pasted) { playSong({ id: pasted, title: "YouTube song" }, []); return; }
    if (q.length < 2) return;
    setSongNote("Searching…");
    try {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
      const data = (await res.json().catch(() => ({}))) as { songs?: Song[]; error?: string };
      if (!res.ok || !Array.isArray(data.songs)) { setSongs([]); setSongNote(data.error === "no-key" ? "Song search isn't switched on yet. You can still paste a YouTube link here and press Search." : data.error === "quota" ? "Today's free searches are used up. Paste a YouTube link instead, or try again tomorrow." : "Search isn't answering right now. Paste a YouTube link instead."); return; }
      setSongs(data.songs ?? []); setSongNote(data.songs?.length ? "" : "No songs found for that.");
    } catch { setSongNote("Search isn't answering right now. Paste a YouTube link instead."); }
  }
  /** Plays a song and lines the rest of the results up after it. Stops the radio. */
  function playSong(pick: Song, rest: string[], fromDj = false) {
    stopAll(); setCurrent(null); setError("");
    if (!fromDj) setFollowing(null);
    setSong({ ...pick, queue: rest.filter((id) => id !== pick.id).slice(0, 20) });
    setAct({ radio: `♪ ${pick.title}`.slice(0, 60), dj: useHq.getState().me?.act?.dj ? SONG + pick.id : undefined });
  }
  function stopSong() { setSong(null); setAct({ radio: undefined, dj: undefined }); }
  // DJ mode: one person offers their station to everyone; each listener joins with one tap.
  const iAmDj = useHq((s) => Boolean(s.me?.act?.dj));
  const dj = useHq((s) => Object.values(s.peers).find((p) => p.act?.dj && (p.act.dj.startsWith(SONG) || STATIONS.some((x) => x.id === p.act?.dj))) ?? null);
  const [following, setFollowing] = useState<string | null>(null);
  const [declined, setDeclined] = useState("");
  const djSongId = dj?.act?.dj?.startsWith(SONG) ? dj.act.dj.slice(SONG.length) : null;
  const djStation = djSongId && /^[\w-]{11}$/.test(djSongId) ? { id: SONG + djSongId, name: String(dj?.act?.radio ?? "a song").replace(/^♪ /, "") } : STATIONS.find((x) => x.id === dj?.act?.dj);
  const playingId = song ? SONG + song.id : current;
  const offer = dj && djStation && !iAmDj && playingId !== djStation.id && declined !== `${dj.id}:${djStation.id}` ? { dj, station: djStation } : null;
  // Once you have tuned in, you follow the DJ when they change station.
  useEffect(() => {
    if (!following) return;
    if (!dj || dj.id !== following) { setFollowing(null); return; }
    if (djStation && playingId !== djStation.id && !loading) tune(djStation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, dj?.id, djStation?.id]);

  function stopAll() {
    player?.pause();
    if (player) player.removeAttribute("src");
    void ambient().then((m) => m.stopAmbient()).catch(() => undefined);
  }
  useEffect(() => () => { stopAll(); }, []);

  // Close the menu when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", onDown); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  /** Joins whatever the DJ has on: a radio station or a song. */
  function tune(target: { id: string; name: string }) {
    if (target.id.startsWith(SONG)) playSong({ id: target.id.slice(SONG.length), title: target.name }, [], true); else void play(target.id, true);
  }
  async function play(id: string, fromDj = false) {
    setError("");
    stopAll(); setSong(null);
    if (!fromDj) setFollowing(null);
    if (current === id) { setCurrent(null); setAct({ radio: undefined, dj: undefined }); return; }
    if (id === AMBIENT) {
      const ok = await ambient().then((m) => m.startAmbient()).catch(() => false);
      setCurrent(ok ? AMBIENT : null);
      setAct({ radio: undefined, dj: undefined });
      if (!ok) setError("Sound isn't available in this browser.");
      return;
    }
    const station = STATIONS.find((s) => s.id === id)!;
    player ??= new Audio();
    player.volume = volume;
    player.src = streamUrl(id);
    setLoading(true); setCurrent(id);
    try {
      await player.play();
      setAct({ radio: station.name, dj: useHq.getState().me?.act?.dj ? id : undefined });
    } catch {
      setCurrent(null); setAct({ radio: undefined, dj: undefined });
      setError(`${station.name} isn't answering right now. Try another station.`);
    } finally { setLoading(false); }
  }

  /** Music off. If you were following a DJ, their invitation does not pop up again for that station. */
  function turnOff() {
    stopAll(); setFollowing(null); setCurrent(null); setSong(null); setAct({ radio: undefined, dj: undefined });
    if (dj && djStation) setDeclined(`${dj.id}:${djStation.id}`);
  }
  const playing = current !== null || song !== null;
  const label = song ? song.title : current === AMBIENT ? "Office ambience" : STATIONS.find((s) => s.id === current)?.name;

  return (
    <div className="music" ref={boxRef}>
      <button type="button" className={`text-btn music-btn${playing ? " is-on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
        aria-label={playing ? `Music: ${label}. Open the music menu` : "Open the music menu"}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6.5" cy="18" r="2.5" fill="currentColor" /><circle cx="16.5" cy="16" r="2.5" fill="currentColor" /></svg>
        <span className="music-label">{playing ? label : "Music"}</span>
      </button>
      {song && (
        <div className="song-player" role="region" aria-label={`Now playing: ${song.title}`}>
          <div className="song-bar"><span title={song.title}>♪ {song.title}</span><button type="button" aria-label="Stop the song" onClick={stopSong}>×</button></div>
          <iframe key={song.id} title="YouTube player" src={`https://www.youtube-nocookie.com/embed/${song.id}?autoplay=1&playsinline=1&rel=0${song.queue.length ? `&playlist=${song.queue.join(",")}` : ""}`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      {offer && (
        <div className="dj-offer" role="status">
          <p>🎧 <strong>{displayName(offer.dj)}</strong> is the DJ: <strong>{offer.station.name}</strong></p>
          <div className="room-actions">
            <button type="button" className="btn-primary" onClick={() => { setFollowing(offer.dj.id); tune(offer.station); }}>Tune in</button>
            <button type="button" className="btn-secondary" onClick={() => setDeclined(`${offer.dj.id}:${offer.station.id}`)}>No thanks</button>
          </div>
        </div>
      )}
      {open && (
        <div className="music-menu" role="group" aria-label="Music">
          <p className="eyebrow">Music · no ads</p>
          {!((current && current !== AMBIENT) || song) && <button type="button" className="dj-btn" disabled>🎧 DJ mode: play a station or song first</button>}
          {((current && current !== AMBIENT) || song) && (
            <button type="button" className={`dj-btn${iAmDj ? " is-on" : ""}`} aria-pressed={iAmDj} onClick={() => setAct({ dj: iAmDj ? undefined : song ? SONG + song.id : current ?? undefined })}>
              {iAmDj ? "🎧 You are the DJ · tap to stop" : song ? "🎧 DJ mode: invite everyone to this song" : "🎧 DJ mode: invite everyone to this station"}
            </button>
          )}
          {following && dj && <p className="dj-note">Following DJ {displayName(dj)}. Pick a station yourself to stop following.</p>}
          {error && <p className="field-error" role="alert">{error}</p>}
          {playing && <button type="button" className="music-off" onClick={turnOff}>■ Turn music off</button>}
          <div className="music-tabs" role="tablist" aria-label="Music source">
            <button type="button" role="tab" aria-selected={mode === "radio"} onClick={() => setMode("radio")}>📻 Radio</button>
            <button type="button" role="tab" aria-selected={mode === "songs"} onClick={() => setMode("songs")}>🔎 Songs</button>
          </div>
          {mode === "songs" && (
            <div className="songs">
              <form className="song-search" onSubmit={(e) => { e.preventDefault(); void searchSongs(); }}>
                <input className="music-search" type="search" value={songQuery} onChange={(e) => setSongQuery(e.target.value)} placeholder="Song, artist, or a YouTube link" aria-label="Search songs" />
                <button type="submit" className="btn-primary">Search</button>
              </form>
              {songNote && <p className="dj-note" role="status">{songNote}</p>}
              <ul>
                {songs.map((x) => (
                  <li key={x.id}>
                    <button type="button" className="station" aria-pressed={song?.id === x.id} onClick={() => playSong(x, songs.map((y) => y.id))}>
                      <img className="song-thumb" src={`https://i.ytimg.com/vi/${x.id}/default.jpg`} alt="" loading="lazy" />
                      <span className="station-id"><strong>{x.title}</strong><span>{x.by}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="music-credit">Songs play from YouTube in its own player, which may show ads. Radio has none.</p>
            </div>
          )}
          {mode === "radio" && <>
          <input className="music-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stations: jazz, 80s, chill, rock…" aria-label="Search stations" />
          <ul>
            {[{ id: AMBIENT, name: "Office ambience", about: "Soft generated background sound" }, ...STATIONS].filter((s) => query.trim().toLowerCase().split(/\s+/).every((w) => `${s.name} ${s.about}`.toLowerCase().includes(w))).map((s) => (
              <li key={s.id}>
                <button type="button" className="station" aria-pressed={current === s.id} onClick={() => void play(s.id)}>
                  <span className="station-icon" aria-hidden="true">{current === s.id ? (loading ? "…" : "■") : "▶"}</span>
                  <span className="station-id"><strong>{s.name}</strong><span>{s.about}</span></span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim() && ![{ name: "Office ambience", about: "Soft generated background sound" }, ...STATIONS].some((s) => query.trim().toLowerCase().split(/\s+/).every((w) => `${s.name} ${s.about}`.toLowerCase().includes(w))) && <p className="dj-note">No station matches that. Try a genre or mood, like “jazz”, “lo-fi” or “dance”.</p>}
          <label className="volume">
            <span>Volume</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (player) player.volume = v; }} />
          </label>
          <p className="music-credit">Radio by <a href="https://somafm.com" target="_blank" rel="noopener noreferrer">SomaFM</a>, listener-supported and commercial-free.</p>
          </>}
        </div>
      )}
    </div>
  );
}
