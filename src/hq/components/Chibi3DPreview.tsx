import { useEffect, useRef } from "react";
import * as THREE from "three";
import { animateChibi, buildChibi, disposeChibi } from "../office3d/chibi3d";
import type { Look } from "../types";

/** A slowly turning 3D chibi, for the avatar editor. Drag it to spin it yourself. */
export function Chibi3DPreview({ look, size = 220 }: { look: Look; size?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef(look);
  lookRef.current = look;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#b9c6da", 1.3));
    const sun = new THREE.DirectionalLight("#fff6e5", 2); sun.position.set(-2, 4, 3); sun.castShadow = true; scene.add(sun);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.06, 40), new THREE.MeshStandardMaterial({ color: "#dfe5ee", roughness: 0.9 }));
    stand.position.y = -0.03; stand.receiveShadow = true; scene.add(stand);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.25, 4.2); camera.lookAt(0, 0.72, 0);

    let chibi = new THREE.Group(), sig = "", angle = 0.5, dragging: number | null = null, raf = 0;
    const down = (e: PointerEvent) => { dragging = e.clientX; };
    const move = (e: PointerEvent) => { if (dragging === null) return; angle += (e.clientX - dragging) * 0.012; dragging = e.clientX; };
    const up = () => { dragging = null; };
    renderer.domElement.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const next = JSON.stringify(lookRef.current);
      if (next !== sig) { scene.remove(chibi); disposeChibi(chibi); chibi = buildChibi(lookRef.current); scene.add(chibi); sig = next; }
      if (dragging === null && !still) angle += 0.006;
      chibi.rotation.y = angle;
      animateChibi(chibi, now / 1000, { moving: false, dance: false });
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      disposeChibi(chibi); stand.geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [size]);

  return <div ref={hostRef} className="chibi-3d" style={{ width: size, height: size }} role="img" aria-label="Your chibi in 3D. Drag to turn it." />;
}
