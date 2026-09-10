export interface FiberColorInfo {
  fiberNumber: number;
  fiberColorName: string;
  fiberHex: string;
  fiberTextColor: string;
  tubeNumber: number;
  tubeColorName: string;
  tubeHex: string;
  label: string;
}

export const TELEKOM_FIBER_COLORS = [
  { name: 'Rot', hex: '#ef4444', text: '#ffffff' },
  { name: 'Grün', hex: '#22c55e', text: '#ffffff' },
  { name: 'Blau', hex: '#3b82f6', text: '#ffffff' },
  { name: 'Gelb', hex: '#eab308', text: '#000000' },
  { name: 'Weiß', hex: '#f8fafc', text: '#0f172a' },
  { name: 'Grau', hex: '#94a3b8', text: '#ffffff' },
  { name: 'Braun', hex: '#92400e', text: '#ffffff' },
  { name: 'Violett', hex: '#a855f7', text: '#ffffff' },
  { name: 'Türkis', hex: '#06b6d4', text: '#ffffff' },
  { name: 'Schwarz', hex: '#1e293b', text: '#ffffff' },
  { name: 'Orange', hex: '#f97316', text: '#ffffff' },
  { name: 'Rosa', hex: '#ec4899', text: '#ffffff' },
];

export function getFiberColorInfo(fiberNumber: number): FiberColorInfo {
  const nr = Math.max(1, Math.floor(fiberNumber || 1));
  const fiberIdx = (nr - 1) % 12;
  const tubeIdx = Math.floor((nr - 1) / 12) % 12;
  const tubeNr = Math.floor((nr - 1) / 12) + 1;

  const fiber = TELEKOM_FIBER_COLORS[fiberIdx];
  const tube = TELEKOM_FIBER_COLORS[tubeIdx];

  const tubeLabel = tubeNr > 1 ? `Bündel ${tubeNr} (${tube.name}), ` : '';
  const label = `${tubeLabel}Faser ${nr}: ${fiber.name}`;

  return {
    fiberNumber: nr,
    fiberColorName: fiber.name,
    fiberHex: fiber.hex,
    fiberTextColor: fiber.text,
    tubeNumber: tubeNr,
    tubeColorName: tube.name,
    tubeHex: tube.hex,
    label,
  };
}
