import { describe, expect, test } from "bun:test";
import { getCurrent } from "./timing";
import type { EpisodeMetadata } from "@/fetch-data/feed-data";

const makeEpisode = (durationSeconds: number, n = 1): EpisodeMetadata => ({
  feed: "Test Feed",
  title: `Episode ${n}`,
  episodeNumber: n,
  publishedTime: 0,
  durationSeconds,
  mediaLink: "https://example.com/ep.mp3",
});

const epoch = new Date(0);

describe("getCurrent", () => {
  test("starts at episode 0 when no time has elapsed", () => {
    const episodes = [makeEpisode(3600, 1), makeEpisode(3600, 2)];
    const result = getCurrent(episodes, epoch, epoch);
    expect(result.episodeIndex).toBe(0);
    expect(result.timeOffsetSeconds).toBe(0);
  });

  test("moves to the second episode after the first finishes", () => {
    const episodes = [makeEpisode(3600, 1), makeEpisode(3600, 2)];
    const now = new Date(3600 * 1000); // exactly 1 hour elapsed
    const result = getCurrent(episodes, epoch, now);
    expect(result.episodeIndex).toBe(1);
    expect(result.timeOffsetSeconds).toBe(0);
  });

  test("calculates offset within an episode correctly", () => {
    const episodes = [makeEpisode(3600, 1), makeEpisode(3600, 2)];
    const now = new Date(1800 * 1000); // 30 mins into ep 1
    const result = getCurrent(episodes, epoch, now);
    expect(result.episodeIndex).toBe(0);
    expect(result.timeOffsetSeconds).toBe(1800);
  });

  test("wraps around to the start after the full cycle elapses", () => {
    const episodes = [makeEpisode(3600, 1), makeEpisode(3600, 2)];
    const totalMs = 7200 * 1000; // full 2-episode cycle
    const result = getCurrent(episodes, epoch, new Date(totalMs));
    expect(result.episodeIndex).toBe(0);
    expect(result.timeOffsetSeconds).toBe(0);
  });

  test("wraps around with offset into second cycle", () => {
    const episodes = [makeEpisode(3600, 1), makeEpisode(3600, 2)];
    const now = new Date(7200 * 1000 + 900 * 1000); // 15 mins into ep 1 of second cycle
    const result = getCurrent(episodes, epoch, now);
    expect(result.episodeIndex).toBe(0);
    expect(result.timeOffsetSeconds).toBe(900);
  });

  test("floors the offset to whole seconds", () => {
    const episodes = [makeEpisode(3600, 1)];
    const now = new Date(500); // 0.5 seconds elapsed
    const result = getCurrent(episodes, epoch, now);
    expect(result.timeOffsetSeconds).toBe(0);
  });

  test("throws if the episode list has no duration", () => {
    const episodes = [makeEpisode(0, 1)];
    expect(() => getCurrent(episodes, epoch, epoch)).toThrow();
  });

  test("works across many episodes of varying duration", () => {
    const episodes = [
      makeEpisode(1800, 1), // 30 min
      makeEpisode(3600, 2), // 60 min
      makeEpisode(900, 3), // 15 min
    ];
    // Total = 6300s. Request offset 2000s: past ep1 (1800s), 200s into ep2
    const now = new Date(2000 * 1000);
    const result = getCurrent(episodes, epoch, now);
    expect(result.episodeIndex).toBe(1);
    expect(result.timeOffsetSeconds).toBe(200);
  });
});
