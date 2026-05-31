import { describe, expect, test } from "bun:test";
import { cycleLength, produceCycle, interleaveStation } from "./stations";
import type { RadioStation } from "@/common/feed-data";

describe("cycleLength", () => {
  const cases: Array<{ lengths: number[]; expected: number }> = [
    { lengths: [1], expected: 1 },
    { lengths: [103, 2], expected: 206 },
    { lengths: [3, 5, 15], expected: 15 },
    { lengths: [3, 3, 5, 15], expected: 15 },
    { lengths: [3, 3, 5, 15, 9], expected: 45 },
  ];

  for (const { lengths, expected } of cases) {
    test(`cycleLength([${lengths}]) = ${expected}`, () => {
      expect(cycleLength(lengths)).toBe(expected);
    });
  }
});

describe("produceCycle", () => {
  const arr = (id: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${id}${i + 1}`);

  const cases = [
    {
      lists: [arr("A", 3)],
      expected: ["A1", "A2", "A3"],
    },
    {
      lists: [arr("A", 3), arr("B", 3)],
      expected: ["A1", "B1", "A2", "B2", "A3", "B3"],
    },
    {
      lists: [arr("A", 2), arr("B", 1), arr("C", 2)],
      expected: ["A1", "B1", "C1", "A2", "B1", "C2"],
    },
    {
      lists: [arr("A", 2), arr("B", 3)],
      expected: [
        "A1",
        "B1",
        "A2",
        "B2",
        "A1",
        "B3",
        "A2",
        "B1",
        "A1",
        "B2",
        "A2",
        "B3",
      ],
    },
  ];

  for (const { lists, expected } of cases) {
    test(`produceCycle with lengths [${lists.map((l) => l.length)}]`, () => {
      expect(produceCycle(lists)).toEqual(expected);
    });
  }
});

describe("interleaveStation", () => {
  const makeStation = (
    feeds: Array<{ title: string; episodes: string[] }>,
  ): RadioStation => ({
    title: "Test",
    feeds: feeds.map(({ title }) => ({ title, description: "" })),
    episodes: feeds.flatMap(({ title, episodes }) =>
      episodes.map((ep, i) => ({
        feed: title,
        title: ep,
        episodeNumber: i + 1,
        publishedTime: 0,
        durationSeconds: 60,
        mediaLink: "https://example.com/ep.mp3",
      })),
    ),
  });

  test("interleaves two feeds of equal length", () => {
    const station = makeStation([
      { title: "Feed A", episodes: ["A1", "A2", "A3"] },
      { title: "Feed B", episodes: ["B1", "B2", "B3"] },
    ]);
    const result = interleaveStation(station);
    expect(result.map((e) => e.title)).toEqual([
      "A1",
      "B1",
      "A2",
      "B2",
      "A3",
      "B3",
    ]);
  });

  test("preserves feed order from station.feeds", () => {
    const station = makeStation([
      { title: "Feed A", episodes: ["A1"] },
      { title: "Feed B", episodes: ["B1"] },
    ]);
    const result = interleaveStation(station);
    expect(result[0]!.feed).toBe("Feed A");
    expect(result[1]!.feed).toBe("Feed B");
  });

  test("returns empty array for a station with no episodes", () => {
    const station: RadioStation = { title: "Empty", feeds: [], episodes: [] };
    expect(interleaveStation(station)).toEqual([]);
  });

  test("handles a single feed", () => {
    const station = makeStation([{ title: "Feed A", episodes: ["A1", "A2"] }]);
    const result = interleaveStation(station);
    expect(result.map((e) => e.title)).toEqual(["A1", "A2"]);
  });
});
