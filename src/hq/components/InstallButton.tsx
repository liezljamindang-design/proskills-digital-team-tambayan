import { useEffect, useState } from "react";

interface InstallEvent extends Event { prompt: () => Promise<void> }

/** Shows "Install app" when the browser offers to install the Tambayan (Chrome, Edge, Android). */
export function InstallButton() {
  const [offer, setOffer] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onOffer = (e: Event) => { e.preventDefault(); setOffer(e as InstallEvent); };
    const onDone = () => setOffer(null);
    window.addEventListener("beforeinstallprompt", onOffer); window.addEventListener("appinstalled", onDone);
    return () => { window.removeEventListener("beforeinstallprompt", onOffer); window.removeEventListener("appinstalled", onDone); };
  }, []);
  if (!offer) return null;
  return <button type="button" className="text-btn install-btn" onClick={() => { void offer.prompt(); setOffer(null); }}>Install app</button>;
}
