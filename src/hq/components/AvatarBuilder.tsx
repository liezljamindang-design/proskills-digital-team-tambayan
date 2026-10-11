import { useState, type FormEvent } from "react";
import { birthdayKey, MONTHS } from "../birthday";
import { useHq } from "../store";
import { Chibi3DPreview } from "./Chibi3DPreview";
import { ACCESSORIES, FITS, ChibiFull, DEFAULT_LOOK, HAIRS, OUTFITS, randomLook, SKINS, STYLES } from "../office/Chibi";
import { BATCHES, batchesOf, type Look, type Profile } from "../types";

interface Props {
  initial: Profile | null;
  submitLabel: string;
  onSubmit: (name: string, role: string, look: Look, birthday?: string, birthYear?: number, firstName?: string, batches?: number[]) => void;
  /** Admins may pick several batches; everyone else picks one. */
  admin?: boolean;
  onCancel?: () => void;
}

/** Name, role and a chibi you design yourself. Shown when joining and from "My avatar". */
export function AvatarBuilder({ initial, submitLabel, onSubmit, onCancel, admin }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [look, setLook] = useState<Look>(initial?.look ?? DEFAULT_LOOK);
  const [month, setMonth] = useState(initial?.birthday ? Number(initial.birthday.slice(0, 2)) : 0);
  const [day, setDay] = useState(initial?.birthday ? Number(initial.birthday.slice(3)) : 0);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [batches, setBatches] = useState<number[]>(initial ? batchesOf(initial) : []);
  const [year, setYear] = useState(initial?.birthYear ?? 0);
  const view3d = useHq((s) => s.view3d);
  const [error, setError] = useState("");
  const set = <K extends keyof Look>(key: K, value: Look[K]) => setLook((l) => ({ ...l, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter the username your teammates will see.");
    if (!batches.length) return setError(admin ? "Pick at least one batch." : "Pick your batch number. Everyone is in the public room, plus their own batch room.");
    if ((month > 0) !== (day > 0)) return setError("Pick both a month and a day for your birthday, or leave both empty.");
    onSubmit(name.trim().slice(0, 24), role.trim().slice(0, 40), look, month && day ? birthdayKey(month, day) : undefined, month && day && year ? year : undefined, firstName.trim().slice(0, 20) || undefined, admin ? [...batches].sort((a, b) => a - b) : batches.slice(0, 1));
  }

  const swatches = (label: string, key: "skin" | "hair" | "outfit", colors: string[]) => (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="swatches">
        {colors.map((c) => (
          <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={look[key] === c} aria-label={`${label} colour ${c}`} onClick={() => set(key, c)} />
        ))}
      </div>
    </fieldset>
  );

  return (
    <form className="builder" onSubmit={submit} noValidate>
      <div className="builder-preview">
        {view3d ? <Chibi3DPreview look={look} size={210} /> : <ChibiFull look={look} size={170} />}
        <button type="button" className="btn-secondary" onClick={() => setLook((l) => ({ ...randomLook(), hat: l.hat, pet: l.pet }))}>Surprise me</button>
      </div>

      <div className="builder-fields">
        <div className="field-row">
          <div className="field">
            <label htmlFor="av-name">Username</label>
            <input id="av-name" type="text" maxLength={24} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="av-first">First name (optional)</label>
            <input id="av-first" type="text" maxLength={20} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Shown beside your username" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="av-role">Role (optional)</label>
            <input id="av-role" type="text" maxLength={40} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Designer" />
          </div>
{!admin && (
          <div className="field">
            <label htmlFor="av-batch">Batch (required)</label>
            <select id="av-batch" className="plain-select" value={batches[0] ?? 0} onChange={(e) => setBatches(Number(e.target.value) ? [Number(e.target.value)] : [])}>
              <option value={0}>Choose your batch…</option>
              {Array.from({ length: BATCHES }, (_, i) => <option key={i} value={i + 1}>Batch {i + 1}</option>)}
            </select>
          </div>
          )}
        </div>

        {admin && (
          <fieldset className="field">
            <legend>Batches (required. Admin: pick as many as you handle)</legend>
            <div className="chips">
              {Array.from({ length: BATCHES }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className="service-chip" aria-pressed={batches.includes(n)}
                  onClick={() => setBatches((list) => (list.includes(n) ? list.filter((x) => x !== n) : [...list, n]))}>Batch {n}</button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="field">
          <legend>Birthday (optional)</legend>
          <div className="field-row birthday-row">
            <select aria-label="Birthday month" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setDay((d) => Math.min(d, new Date(2024, Number(e.target.value), 0).getDate())); }}>
              <option value={0}>Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Birthday day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              <option value={0}>Day</option>
              {Array.from({ length: month ? new Date(2024, month, 0).getDate() : 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
            <select aria-label="Birthday year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              <option value={0}>Year</option>
              {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 14 - i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <p className="field-hint">On your day the office puts up a banner with your name. The year is optional and stays private: teammates never see it.</p>
        </fieldset>

        {swatches("Skin", "skin", SKINS)}
        <fieldset className="field">
          <legend>Hairstyle</legend>
          <div className="chips">
            {STYLES.map((s) => <button key={s.id} type="button" className="service-chip" aria-pressed={look.style === s.id} onClick={() => set("style", s.id)}>{s.label}</button>)}
          </div>
        </fieldset>
        {swatches("Hair", "hair", HAIRS)}
        <fieldset className="field">
          <legend>Clothing style</legend>
          <div className="chips">
            {FITS.map((f) => <button key={f.id} type="button" className="service-chip" aria-pressed={(look.fit ?? "basic") === f.id} onClick={() => set("fit", f.id)}>{f.label}</button>)}
          </div>
        </fieldset>
        {swatches("Outfit colour", "outfit", OUTFITS)}
        <div className="field-row">
          <fieldset className="field">
            <legend>Bottoms</legend>
            <div className="chips">
              {(["pants", "skirt"] as const).map((b) => <button key={b} type="button" className="service-chip" aria-pressed={look.bottoms === b} onClick={() => set("bottoms", b)}>{b === "pants" ? "Pants" : "Skirt"}</button>)}
            </div>
          </fieldset>
        </div>
        <fieldset className="field">
          <legend>Accessory</legend>
          <div className="chips">
            {ACCESSORIES.map((a) => <button key={a.id} type="button" className="service-chip" aria-pressed={look.accessory === a.id} onClick={() => set("accessory", a.id)}>{a.label}</button>)}
          </div>
        </fieldset>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="builder-actions">
          {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="btn-primary">{submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
