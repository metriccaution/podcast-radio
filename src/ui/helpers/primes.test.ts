import { describe, expect, test } from "bun:test";
import {
  primeFactors,
  greatestCommonDivisor,
  leastCommonMultiple,
} from "./primes";

describe("primeFactors", () => {
  const cases: [number, number[]][] = [
    [2, [2]],
    [3, [3]],
    [4, [2, 2]],
    [6, [2, 3]],
    [8, [2, 2, 2]],
    [10, [2, 5]],
    [100, [2, 2, 5, 5]],
    [103, [103]],
  ];

  for (const [n, factors] of cases) {
    test(`primeFactors(${n}) = [${factors}]`, () => {
      expect(primeFactors(n)).toEqual(factors);
      expect(factors.reduce((a, i) => a * i, 1)).toBe(n);
    });
  }
});

describe("greatestCommonDivisor", () => {
  const cases: [number, number, number][] = [
    [1, 1, 1],
    [1, 2, 1],
    [2, 4, 2],
    [3, 15, 3],
    [15, 3, 3],
    [48, 18, 6],
    [8, 12, 4],
  ];

  for (const [a, b, gcd] of cases) {
    test(`GCD(${a}, ${b}) = ${gcd}`, () => {
      expect(greatestCommonDivisor(a, b)).toBe(gcd);
    });
  }
});

describe("leastCommonMultiple", () => {
  const cases: [number, number, number][] = [
    [1, 1, 1],
    [1, 2, 2],
    [2, 4, 4],
    [6, 4, 12],
    [3, 15, 15],
    [2, 15, 30],
    [2, 103, 206],
  ];

  for (const [a, b, lcm] of cases) {
    test(`LCM(${a}, ${b}) = ${lcm}`, () => {
      expect(leastCommonMultiple(a, b)).toBe(lcm);
    });
  }
});
