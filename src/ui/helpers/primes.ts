/**
 * Returns the prime factors of n in ascending order, with repetition.
 * Used by greatestCommonDivisor to find shared factors between two numbers.
 */
export function primeFactors(n: number): number[] {
  const factors: number[] = [];
  let remaining = n;
  for (let i = 2; i <= remaining; i++) {
    while (remaining % i === 0) {
      factors.push(i);
      remaining /= i;
    }
  }
  return factors;
}

/**
 * Returns the largest integer that divides both a and b evenly, computed by
 * intersecting their prime factor lists. Used as a building block for
 * leastCommonMultiple.
 */
export function greatestCommonDivisor(a: number, b: number): number {
  const aFactors = primeFactors(a);
  const bFactors = primeFactors(b);
  const common: number[] = [];

  const bRemaining = [...bFactors];
  for (const factor of aFactors) {
    const idx = bRemaining.indexOf(factor);
    if (idx !== -1) {
      common.push(factor);
      bRemaining.splice(idx, 1);
    }
  }

  return common.reduce((product, f) => product * f, 1);
}

/**
 * Returns the smallest integer that is a multiple of both a and b.
 * Used by cycleLength to find when two feeds of different lengths will
 * simultaneously return to their first episode.
 */
export function leastCommonMultiple(a: number, b: number): number {
  return (a * b) / greatestCommonDivisor(a, b);
}
