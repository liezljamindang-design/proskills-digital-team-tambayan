import { Coin } from "./Coin";
import { buy, EARNING, onSale, SHOP, wear, type ShopItem } from "../economy";
import { ChibiFull, PetArt } from "../office/Chibi";
import { useHq } from "../store";
import { Dialog } from "./Dialog";

/** The shop: spend coins on hats and pets, and see how coins are earned. */
export function Shop() {
  const open = useHq((s) => s.shopOpen);
  const setOpen = useHq((s) => s.setShopOpen);
  const me = useHq((s) => s.me);
  if (!me) return null;
  const coins = me.coins ?? 0, owned = me.owned ?? [];

  const row = (item: ShopItem) => {
    const has = owned.includes(item.id), wearing = me.look[item.kind] === item.id;
    return (
      <li key={item.id} className={`shop-item${wearing ? " is-on" : ""}`}>
        <div className="shop-preview">
          {item.kind !== "pet"
            ? <ChibiFull look={{ ...me.look, [item.kind]: item.id }} size={84} />
            : <svg viewBox="-12 -18 24 20" width={64} height={54} aria-hidden="true"><PetArt id={item.id} /></svg>}
        </div>
        <strong>{item.name}</strong>
        {item.until && <span className="limited">Limited · {item.note} · {onSale(item) ? `until ${new Date(`${item.until}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}` : "ended"}</span>}
        {has ? (
          <button type="button" className="btn-secondary" onClick={() => wear(item)}>{wearing ? "Take off" : item.kind === "pet" ? "Bring along" : "Wear"}</button>
        ) : (
          !onSale(item) ? <span className="muted">No longer sold</span> :
          <button type="button" className="btn-primary" disabled={coins < item.price} onClick={() => buy(item)}
            aria-label={`Buy ${item.name} for ${item.price} coins${coins < item.price ? ", not enough coins yet" : ""}`}><Coin size={16} /> {item.price}</button>
        )}
      </li>
    );
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} labelledBy="shop-title">
      <div className="shop">
        <header className="panel-head">
          <div><p className="eyebrow">Tambayan shop</p><h2 id="shop-title">Skins, hats and pets</h2></div>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close the shop">✕</button>
        </header>
        <p className="shop-balance"><span className="shop-coins"><Coin size={22} /> <strong>{coins}</strong> coins</span><span>🔥 <strong>{me.streak ?? 0}</strong> day streak</span></p>
        <details className="shop-how">
          <summary>How to earn coins</summary>
          <ul>
            <li>Come in each day: {EARNING.daily} coins, plus {EARNING.streakBonus} more for each day in a row (up to {EARNING.streakCap} days).</li>
            <li>Chat: {EARNING.chat} coin a message, up to {EARNING.chatCap} a day.</li>
            <li>Finish Memory Match: {EARNING.win} coins, plus {EARNING.best} for a new best score.</li>
            <li>Walk into the Collaboration Room: {EARNING.meeting} coins, once a day.</li>
          </ul>
        </details>
        <h3 className="panel-title">Skins</h3>
        <ul className="shop-grid">{SHOP.filter((i) => i.kind === "fx").map(row)}</ul>
        <h3 className="panel-title">Hats</h3>
        <ul className="shop-grid">{SHOP.filter((i) => i.kind === "hat").map(row)}</ul>
        <h3 className="panel-title">Pets</h3>
        <ul className="shop-grid">{SHOP.filter((i) => i.kind === "pet").map(row)}</ul>
      </div>
    </Dialog>
  );
}
