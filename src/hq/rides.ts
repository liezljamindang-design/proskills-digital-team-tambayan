/** Bikes and cars to ride around the office. The makes are invented; nobody's real brand is used. */
export interface Ride { kind: string; color: string; name?: string }
export const RIDES: { id: string; label: string; make: string; group: "Bikes" | "Cars"; speed: number }[] = [
  { id: "bmx", label: "BMX", make: "Kalye Pro", group: "Bikes", speed: 1.6 },
  { id: "mtb", label: "Mountain bike", make: "Bundok X", group: "Bikes", speed: 1.7 },
  { id: "road", label: "Road bike", make: "Hangin Aero", group: "Bikes", speed: 1.9 },
  { id: "kart", label: "Go-kart", make: "Zoomie", group: "Cars", speed: 2.1 },
  { id: "mini", label: "Mini car", make: "Bubwit", group: "Cars", speed: 2.2 },
  { id: "jeep", label: "Jeep", make: "Byahe King", group: "Cars", speed: 2.0 },
];
export const RIDE_COLORS = ["#e03131", "#f08c00", "#f4c21f", "#2f9e44", "#1c7ed6", "#7048e8", "#e64980", "#212529", "#f8f9fa"];
export const rideInfo = (kind?: string) => RIDES.find((r) => r.id === kind);
export const isCar = (kind?: string) => rideInfo(kind)?.group === "Cars";
