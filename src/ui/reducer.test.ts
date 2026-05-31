import { describe, expect, test } from "bun:test";
import { playerReducer } from "./reducer";
import type { PlayerState } from "./reducer";
import type { EpisodeMetadata, RadioStation } from "@/common/feed-data";

const testStation: RadioStation = {
  title: "Test Station",
  feeds: [{ title: "Test Feed", description: "A test feed" }],
  episodes: [],
};

function makeEpisode(
  overrides: Partial<EpisodeMetadata> = {},
): EpisodeMetadata {
  return {
    feed: "Test Feed",
    title: "Test Episode",
    episodeNumber: 1,
    publishedTime: 1704067200000,
    mediaLink: "https://example.com/episode.mp3",
    durationSeconds: 3600,
    ...overrides,
  };
}

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    currentStation: testStation,
    episodes: [makeEpisode(), makeEpisode({ title: "Episode 2" })],
    currentTrack: 0,
    startAtSeconds: 0,
    currentTime: 0,
    episodeStartTime: new Date("2024-01-01T00:00:00Z"),
    playing: false,
    actualDuration: null,
    ...overrides,
  };
}

describe("TUNE_IN", () => {
  test("stores new episodes and position, pauses, clears actualDuration", () => {
    const newEpisodes = [makeEpisode({ title: "New Station Ep" })];
    const startTime = new Date("2024-06-01T12:00:00Z");
    const state = makeState({ playing: true, actualDuration: 1800 });

    const next = playerReducer(state, {
      type: "TUNE_IN",
      station: testStation,
      episodes: newEpisodes,
      track: 0,
      offset: 300,
      startTime,
    });

    expect(next.episodes).toBe(newEpisodes);
    expect(next.currentTrack).toBe(0);
    expect(next.startAtSeconds).toBe(300);
    expect(next.currentTime).toBe(300);
    expect(next.episodeStartTime).toBe(startTime);
    expect(next.playing).toBe(false);
    expect(next.actualDuration).toBeNull();
  });
});

describe("PAUSE", () => {
  test("sets playing to false, leaves all other fields unchanged", () => {
    const state = makeState({
      playing: true,
      currentTrack: 1,
      currentTime: 500,
      actualDuration: 1800,
    });

    const next = playerReducer(state, { type: "PAUSE" });

    expect(next.playing).toBe(false);
    expect(next.currentTrack).toBe(1);
    expect(next.currentTime).toBe(500);
    expect(next.actualDuration).toBe(1800);
    expect(next.episodes).toBe(state.episodes);
  });
});

describe("RESUME", () => {
  test("sets playing to true and syncs position from payload", () => {
    const startTime = new Date("2024-06-01T12:05:00Z");
    const state = makeState({ playing: false, currentTrack: 0 });

    const next = playerReducer(state, {
      type: "RESUME",
      track: 0,
      offset: 250,
      startTime,
    });

    expect(next.playing).toBe(true);
    expect(next.currentTrack).toBe(0);
    expect(next.startAtSeconds).toBe(250);
    expect(next.currentTime).toBe(250);
    expect(next.episodeStartTime).toBe(startTime);
  });

  test("retains actualDuration when resuming the same track", () => {
    const state = makeState({ currentTrack: 1, actualDuration: 1800 });

    const next = playerReducer(state, {
      type: "RESUME",
      track: 1,
      offset: 100,
      startTime: new Date(),
    });

    expect(next.actualDuration).toBe(1800);
  });

  test("resets actualDuration when resuming a different track", () => {
    const state = makeState({ currentTrack: 0, actualDuration: 1800 });

    const next = playerReducer(state, {
      type: "RESUME",
      track: 1,
      offset: 0,
      startTime: new Date(),
    });

    expect(next.actualDuration).toBeNull();
  });
});

describe("TICK", () => {
  test("increments currentTime by 1 mid-episode", () => {
    const state = makeState({ currentTime: 100 });

    const next = playerReducer(state, { type: "TICK" });

    expect(next.currentTime).toBe(101);
    expect(next.currentTrack).toBe(0);
  });

  test("advances track when currentTime + 1 reaches episode durationSeconds", () => {
    const state = makeState({
      episodes: [makeEpisode({ durationSeconds: 101 }), makeEpisode()],
      currentTrack: 0,
      currentTime: 100,
      actualDuration: 101,
    });

    const next = playerReducer(state, { type: "TICK" });

    expect(next.currentTrack).toBe(1);
    expect(next.currentTime).toBe(0);
    expect(next.startAtSeconds).toBe(0);
    expect(next.actualDuration).toBeNull();
  });

  test("wraps to track 0 when advancing past the last track", () => {
    const state = makeState({
      episodes: [makeEpisode(), makeEpisode({ durationSeconds: 50 })],
      currentTrack: 1,
      currentTime: 49,
    });

    const next = playerReducer(state, { type: "TICK" });

    expect(next.currentTrack).toBe(0);
    expect(next.currentTime).toBe(0);
  });
});

describe("ADVANCE_TRACK", () => {
  test("unconditionally advances to next track and resets time and duration", () => {
    const state = makeState({
      currentTrack: 0,
      currentTime: 500,
      actualDuration: 1800,
    });

    const next = playerReducer(state, { type: "ADVANCE_TRACK" });

    expect(next.currentTrack).toBe(1);
    expect(next.currentTime).toBe(0);
    expect(next.startAtSeconds).toBe(0);
    expect(next.actualDuration).toBeNull();
  });

  test("wraps to track 0 from the last track", () => {
    const state = makeState({ currentTrack: 1 });

    const next = playerReducer(state, { type: "ADVANCE_TRACK" });

    expect(next.currentTrack).toBe(0);
  });
});

describe("SET_CURRENT_TIME", () => {
  test("updates currentTime only", () => {
    const state = makeState({ currentTime: 0, actualDuration: 1800 });

    const next = playerReducer(state, { type: "SET_CURRENT_TIME", time: 42 });

    expect(next.currentTime).toBe(42);
    expect(next.actualDuration).toBe(1800);
    expect(next.currentTrack).toBe(state.currentTrack);
  });
});

describe("SET_ACTUAL_DURATION", () => {
  test("updates actualDuration only", () => {
    const state = makeState({ currentTime: 100, actualDuration: null });

    const next = playerReducer(state, {
      type: "SET_ACTUAL_DURATION",
      duration: 3500,
    });

    expect(next.actualDuration).toBe(3500);
    expect(next.currentTime).toBe(100);
    expect(next.currentTrack).toBe(state.currentTrack);
  });
});
