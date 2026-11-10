export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so drills can be reproduced in tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: Rng = Math.random;

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Pick an item, avoiding `avoid` when there is any other choice. */
export function pick<T>(rng: Rng, items: readonly T[], avoid?: T): T {
  const pool = avoid !== undefined && items.length > 1 ? items.filter((i) => i !== avoid) : items;
  return pool[Math.floor(rng() * pool.length)];
}
