import { SEAT_IDS } from "../data/office";
import type { FurnitureItem } from "../types";
import { project } from "./iso";
import { Box, panelY } from "./primitives";

const DESK_TOP = 15;

function Desk({ x, y, w, h, monitors = 1 }: FurnitureItem) {
  const slot = w / monitors;
  return (
    <>
      <Box x={x + 0.06} y={y + 0.08} w={0.1} h={h - 0.16} z1={DESK_TOP - 3} m="gold" />
      <Box x={x + w - 0.16} y={y + 0.08} w={0.1} h={h - 0.16} z1={DESK_TOP - 3} m="gold" />
      <Box x={x} y={y} w={w} h={h} z0={DESK_TOP - 3} z1={DESK_TOP} m="desk" />
      {Array.from({ length: monitors }, (_, i) => {
        const mx = x + slot * i + slot / 2 - 0.22, my = y + 0.12;
        return (
          <g key={i}>
            <Box x={mx + 0.19} y={my} w={0.06} h={0.06} z0={DESK_TOP} z1={DESK_TOP + 5} m="dark" />
            <Box x={mx} y={my} w={0.44} h={0.05} z0={DESK_TOP + 4} z1={DESK_TOP + 21} m="dark" />
            <polygon className="screen" points={panelY(my + 0.05, mx + 0.03, mx + 0.41, DESK_TOP + 6, DESK_TOP + 19)} />
            <polygon className="screen-line" points={panelY(my + 0.05, mx + 0.07, mx + 0.3, DESK_TOP + 14, DESK_TOP + 15.5)} />
            <polygon className="screen-gold" points={panelY(my + 0.05, mx + 0.07, mx + 0.22, DESK_TOP + 10, DESK_TOP + 11.5)} />
          </g>
        );
      })}
    </>
  );
}

const Chair = ({ x, y, w, h }: FurnitureItem) => (
  <>
    <Box x={x + w / 2 - 0.04} y={y + h / 2 - 0.04} w={0.08} h={0.08} z1={7} m="gold" />
    <Box x={x} y={y} w={w} h={h} z0={7} z1={10} m="dark" />
    <Box x={x} y={y + h - 0.07} w={w} h={0.07} z0={10} z1={21} m="dark" />
  </>
);

function Plant({ x, y, w, h }: FurnitureItem) {
  const [cx, cy] = project(x + w / 2, y + h / 2);
  return (
    <>
      <Box x={x} y={y} w={w} h={h} z1={10} m="pot" />
      <ellipse className="leaf-b" cx={cx - 5} cy={cy - 19} rx={7} ry={9} />
      <ellipse className="leaf-b" cx={cx + 6} cy={cy - 20} rx={7} ry={9} />
      <ellipse className="leaf-a" cx={cx} cy={cy - 26} rx={8} ry={11} />
    </>
  );
}

function Sofa({ x, y, w, h }: FurnitureItem) {
  const alongX = w >= h;
  return alongX ? (
    <><Box x={x} y={y} w={w} h={0.16} z1={19} m="soft" /><Box x={x} y={y + 0.16} w={w} h={h - 0.16} z1={9} m="soft" /></>
  ) : (
    <><Box x={x + w - 0.16} y={y} w={0.16} h={h} z1={19} m="soft" /><Box x={x} y={y} w={w - 0.16} h={h} z1={9} m="soft" /></>
  );
}

const Table = ({ x, y, w, h }: FurnitureItem) => (
  <><Box x={x + w / 2 - 0.2} y={y + h / 2 - 0.15} w={0.4} h={0.3} z1={12} m="gold" /><Box x={x} y={y} w={w} h={h} z0={12} z1={15} m="desk" /></>
);
const LowTable = ({ x, y, w, h }: FurnitureItem) => <Box x={x} y={y} w={w} h={h} z0={5} z1={8} m="desk" />;

/** Café counter, with a coffee machine and a row of cups. */
function Counter({ x, y, w, h }: FurnitureItem) {
  return (
    <>
      <Box x={x} y={y} w={w} h={h} z1={19} m="dark" />
      <Box x={x} y={y} w={w} h={h} z0={19} z1={22} m="desk" />
      <Box x={x + 0.2} y={y + 0.1} w={0.5} h={0.32} z0={22} z1={37} m="green" />
      {[1.0, 1.25, 1.5].map((dx) => <Box key={dx} x={x + dx} y={y + 0.2} w={0.13} h={0.13} z0={22} z1={27} m="gold" />)}
    </>
  );
}

function Lamp({ x, y, w, h }: FurnitureItem) {
  const [cx, cy] = project(x + w / 2, y + h / 2, 44);
  return (
    <>
      <Box x={x} y={y} w={w} h={h} z1={2} m="gold" />
      <Box x={x + w / 2 - 0.03} y={y + h / 2 - 0.03} w={0.06} h={0.06} z0={2} z1={36} m="gold" />
      <ellipse className="lamp-glow" cx={cx} cy={cy} rx={15} ry={11} />
      <Box x={x - 0.04} y={y - 0.04} w={w + 0.08} h={h + 0.08} z0={36} z1={48} m="shade" />
    </>
  );
}

/** An arcade cabinet. Its screen faces the room, and it is the way into the mini-game. */
function Arcade({ x, y, w, h }: FurnitureItem) {
  return (
    <g className="arcade" data-open="game">
      <Box x={x} y={y} w={w} h={h} z1={44} m="dark" />
      <Box x={x} y={y} w={w} h={h} z0={44} z1={50} m="gold" />
      <polygon className="screen arcade-screen" points={panelY(y + h, x + 0.06, x + w - 0.06, 22, 40)} />
      <polygon className="screen-alert" points={panelY(y + h, x + 0.12, x + 0.24, 26, 33)} />
      <polygon className="screen-gold" points={panelY(y + h, x + 0.28, x + 0.4, 29, 36)} />
      <Box x={x} y={y + h} w={w} h={0.13} z0={13} z1={17} m="green" />
    </g>
  );
}

function PingPong({ x, y, w, h }: FurnitureItem) {
  return (
    <>
      <Box x={x + 0.1} y={y + 0.1} w={0.1} h={h - 0.2} z1={12} m="gold" />
      <Box x={x + w - 0.2} y={y + 0.1} w={0.1} h={h - 0.2} z1={12} m="gold" />
      <Box x={x} y={y} w={w} h={h} z0={12} z1={14.5} m="green" />
      <Box x={x + w / 2 - 0.02} y={y - 0.04} w={0.04} h={h + 0.08} z0={14.5} z1={19} m="desk" />
    </>
  );
}

function BeanBag({ x, y, w, h }: FurnitureItem) {
  const [cx, cy] = project(x + w / 2, y + h / 2);
  return (
    <g className="m-gold">
      <ellipse className="f-r" cx={cx} cy={cy - 2} rx={17} ry={10} />
      <ellipse className="f-l" cx={cx} cy={cy - 7} rx={15} ry={9} />
      <ellipse className="f-t" cx={cx - 2} cy={cy - 12} rx={11} ry={6.5} />
    </g>
  );
}

const Stool = ({ x, y, w, h }: FurnitureItem) => (
  <><Box x={x + w / 2 - 0.04} y={y + h / 2 - 0.04} w={0.08} h={0.08} z1={11} m="gold" /><Box x={x} y={y} w={w} h={h} z0={11} z1={14} m="soft" /></>
);

/** A bed in the Sleeping Quarters: headboard at the back, pillow, and a blanket over the foot. */
function Bed({ x, y, w, h }: FurnitureItem) {
  return (
    <>
      <Box x={x} y={y} w={w} h={0.07} z1={19} m="dark" />
      <Box x={x} y={y + 0.07} w={w} h={h - 0.07} z1={6} m="desk" />
      <Box x={x + 0.04} y={y + 0.1} w={w - 0.08} h={h - 0.14} z0={6} z1={10} m="pot" />
      <Box x={x + 0.15} y={y + 0.16} w={w - 0.3} h={0.24} z0={10} z1={13} m="gold" />
      <Box x={x + 0.04} y={y + 0.5} w={w - 0.08} h={h - 0.54} z0={10} z1={12} m="soft" />
    </>
  );
}

/** A bookshelf: three rows of colourful spines facing the room. */
function Shelf({ x, y, w, h }: FurnitureItem) {
  const n = Math.round(w / 0.16);
  return (
    <>
      <Box x={x} y={y} w={w} h={h} z1={38} m="dark" />
      {[6, 17, 28].map((z, row) => Array.from({ length: n }, (_, i) => (
        <polygon key={`${z}-${i}`} className={["screen-gold", "screen-alert", "screen-line", "book-red"][(i + row) % 4]}
          points={panelY(y + h, x + 0.05 + i * ((w - 0.1) / n), x + 0.05 + (i + 0.8) * ((w - 0.1) / n), z, z + 8 - ((i + row) % 3))} />
      )))}
    </>
  );
}

const Fridge = ({ x, y, w, h }: FurnitureItem) => (
  <>
    <Box x={x} y={y} w={w} h={h} z1={42} m="pot" />
    <polygon className="screen" points={panelY(y + h, x + 0.07, x + w - 0.07, 14, 37)} />
    {[18, 25, 32].map((z) => <polygon key={z} className={z === 25 ? "screen-alert" : "screen-gold"} points={panelY(y + h, x + 0.12, x + w - 0.12, z, z + 2.5)} />)}
  </>
);

/** The front desk in the lobby. */
const Reception = ({ x, y, w, h }: FurnitureItem) => (
  <>
    <Box x={x} y={y} w={w} h={h} z1={17} m="desk" />
    <Box x={x - 0.04} y={y - 0.04} w={w + 0.08} h={h + 0.08} z0={17} z1={19.5} m="gold" />
    <Box x={x + 0.1} y={y + 0.3} w={0.08} h={0.4} z0={19.5} z1={31} m="dark" />
    <Box x={x + 0.34} y={y + h - 0.4} w={0.14} h={0.14} z0={19.5} z1={25} m="green" />
  </>
);

function Foosball({ x, y, w, h }: FurnitureItem) {
  return (
    <>
      <Box x={x + 0.08} y={y + 0.08} w={0.1} h={h - 0.16} z1={11} m="dark" />
      <Box x={x + w - 0.18} y={y + 0.08} w={0.1} h={h - 0.16} z1={11} m="dark" />
      <Box x={x} y={y} w={w} h={h} z0={11} z1={16} m="dark" />
      <Box x={x + 0.06} y={y + 0.06} w={w - 0.12} h={h - 0.12} z0={16} z1={16.6} m="green" />
      {[0.25, 0.5, 0.75].map((f) => <Box key={f} x={x + w * f - 0.02} y={y - 0.12} w={0.04} h={h + 0.24} z0={18} z1={19.2} m="gold" />)}
    </>
  );
}

/** A tree in a planter, taller and fuller than the desk plants. */
function Tree({ x, y, w, h }: FurnitureItem) {
  const [cx, cy] = project(x + w / 2, y + h / 2);
  return (
    <>
      <Box x={x} y={y} w={w} h={h} z1={9} m="pot" />
      <Box x={x + w / 2 - 0.05} y={y + h / 2 - 0.05} w={0.1} h={0.1} z0={9} z1={30} m="trunk" />
      <ellipse className="leaf-b" cx={cx - 9} cy={cy - 36} rx={11} ry={12} />
      <ellipse className="leaf-b" cx={cx + 10} cy={cy - 38} rx={11} ry={12} />
      <ellipse className="leaf-a" cx={cx} cy={cy - 50} rx={13} ry={15} />
      <ellipse className="leaf-a" cx={cx - 2} cy={cy - 34} rx={9} ry={8} />
    </>
  );
}

function Treadmill({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x} y={y + 0.25} w={w} h={h - 0.25} z1={4} m="dark" /><Box x={x + 0.04} y={y} w={0.06} h={0.08} z1={24} m="gold" /><Box x={x + w - 0.1} y={y} w={0.06} h={0.08} z1={24} m="gold" /><Box x={x} y={y} w={w} h={0.1} z0={22} z1={27} m="dark" /></>);
}
function Weights({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x + 0.1} y={y + 0.1} w={w - 0.2} h={h - 0.2} z1={9} m="dark" /><Box x={x} y={y + h / 2 - 0.03} w={w} h={0.06} z0={12} z1={14} m="desk" /><Box x={x} y={y + 0.06} w={0.14} h={h - 0.12} z0={7} z1={19} m="gold" /><Box x={x + w - 0.14} y={y + 0.06} w={0.14} h={h - 0.12} z0={7} z1={19} m="gold" /></>);
}
function Bag({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x + w / 2 - 0.03} y={y + h / 2 - 0.03} w={0.06} h={0.06} z1={44} m="dark" /><Box x={x + 0.06} y={y + 0.06} w={w - 0.12} h={h - 0.12} z0={8} z1={34} m="soft" /><Box x={x - 0.05} y={y - 0.05} w={w + 0.1} h={h + 0.1} z1={2} m="dark" /></>);
}
function Hoop({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x + w / 2 - 0.05} y={y + h / 2 - 0.05} w={0.1} h={0.1} z1={48} m="dark" /><Box x={x + w / 2 - 0.03} y={y} w={0.06} h={h} z0={44} z1={66} m="desk" /><Box x={x + w / 2 - 0.2} y={y + h / 2 - 0.16} w={0.4} h={0.32} z0={46} z1={47.5} m="gold" /></>);
}
function Speaker({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x} y={y} w={w} h={h} z1={30} m="dark" /><Box x={x + 0.08} y={y + h - 0.02} w={w - 0.16} h={0.03} z0={6} z1={17} m="gold" /></>);
}
function Piano({ x, y, w, h }: FurnitureItem) {
  return (<><Box x={x} y={y} w={w} h={h - 0.2} z1={20} m="dark" /><Box x={x + 0.06} y={y + h - 0.2} w={w - 0.12} h={0.2} z0={12} z1={14.5} m="desk" /><Box x={x + 0.06} y={y + h - 0.2} w={0.07} h={0.18} z1={12} m="dark" /><Box x={x + w - 0.13} y={y + h - 0.2} w={0.07} h={0.18} z1={12} m="dark" /></>);
}

const RENDERERS = {
  treadmill: Treadmill, weights: Weights, bag: Bag, hoop: Hoop, speaker: Speaker, piano: Piano,
  desk: Desk, chair: Chair, plant: Plant, sofa: Sofa, table: Table, "low-table": LowTable, counter: Counter, lamp: Lamp,
  arcade: Arcade, pingpong: PingPong, beanbag: BeanBag, stool: Stool, bed: Bed, shelf: Shelf, fridge: Fridge, reception: Reception, foosball: Foosball, tree: Tree,
} as const;

export function Furniture({ item }: { item: FurnitureItem }) {
  const Render = RENDERERS[item.kind];
  // Anything you can sit on is clickable: clicking walks you over and sits you down.
  if (item.kind === "treadmill" || item.kind === "weights") return <g className="seat" data-gym={item.id}><Render {...item} /></g>;
  if (item.kind === "hoop") return <g className="seat" data-hoop=""><Render {...item} /></g>;
  return SEAT_IDS.has(item.id) ? <g className="seat" data-seat={item.id}><Render {...item} /></g> : <Render {...item} />;
}
