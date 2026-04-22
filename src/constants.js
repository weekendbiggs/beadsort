// Shared world constants. All units in meters. Y is up.
// Player side is +Z, dishes on -Z edge of table.

export const TABLE = {
  width: 4.0,       // X extent
  depth: 6.0,       // Z extent
  thickness: 0.4,
  topY: 0,          // y of marble surface
};

export const DISH = {
  count: 6,
  radius: 0.42,     // outer rim radius
  innerRadius: 0.34,
  rimHeight: 0.18,
  // dishes are arranged across the back edge of the table
  rowZ: -TABLE.depth / 2 + 0.6,
  // 6 dishes spread across width with margin
  spread: TABLE.width - 0.9,
};

export const BEAD = {
  radius: 0.07,     // physics + visual sphere radius
  spawnZMin: -0.6,  // bottom 2/3 of playfield
  spawnZMax: TABLE.depth / 2 - 0.5,
  spawnXMargin: 0.4,
  spawnYMin: 0.4,
  spawnYMax: 1.4,
};

// Six dish colors (also bead colors). Sega-blue beach palette.
export const COLORS = [
  { name: 'cyan',    hex: 0x6ff0ff },
  { name: 'rose',    hex: 0xff8fb1 },
  { name: 'lemon',   hex: 0xffe773 },
  { name: 'lime',    hex: 0x9bf07a },
  { name: 'violet',  hex: 0xc89bff },
  { name: 'coral',   hex: 0xff9f6a },
];

// dish positions across the back row, evenly spaced
export function dishPositions() {
  const xs = [];
  const n = DISH.count;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    xs.push((t - 0.5) * DISH.spread);
  }
  return xs.map((x) => ({ x, y: TABLE.topY, z: DISH.rowZ }));
}
