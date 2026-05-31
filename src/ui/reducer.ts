import type { EpisodeMetadata, RadioStation } from "@/common/feed-data";

export type PlayerState = {
  currentStation: RadioStation;
  episodes: EpisodeMetadata[];
  currentTrack: number;
  startAtSeconds: number;
  currentTime: number;
  episodeStartTime: Date;
  playing: boolean;
  actualDuration: number | null;
};

export type Action =
  /**
   *  Station switched. Rebuilds the full state from a new interleaved episode
   *  list and the radio-clock position at the moment of switching. Preserves
   *  the current playing state so switching stations doesn't interrupt playback.
   */
  | {
      type: "TUNE_IN";
      station: RadioStation;
      episodes: EpisodeMetadata[];
      track: number;
      offset: number;
      startTime: Date;
    }

  /**
   *  User pressed play. Re-syncs to the current radio-clock position before
   *  starting playback, so a long pause doesn't resume stale content. Resets
   *  actualDuration if the track changed (old file duration is no longer
   *  valid); retains it for a same-episode resume so the display stays
   *  accurate without waiting for loadedmetadata to re-fire.
   */
  | { type: "RESUME"; track: number; offset: number; startTime: Date }

  /**
   *  User pressed pause. Stops playback; the wall-clock ticker (setTimeout in
   *  the pause effect) takes over display updates.
   */
  | { type: "PAUSE" }

  /**
   *  One second has elapsed while paused.
   *
   *  Increments currentTime, or advances
   *  the track if the episode's metadata duration is exhausted — keeping the
   *  display coherent with what the radio station would currently be playing.
   *  Track advancement wraps around to the start of the episode list.
   */
  | { type: "TICK" }

  /**
   *  The audio element's onEnded fired. Authoritative track advancement while
   *  playing — preferred over the wall clock because the audio element knows
   *  the actual end of the file, accounting for buffering and metadata drift.
   */
  | { type: "ADVANCE_TRACK" }

  /**
   *  Audio onTimeUpdate. Keeps currentTime accurate from the real playback
   *  position while playing, replacing the wall-clock tick for display
   *  purposes.
   */
  | { type: "SET_CURRENT_TIME"; time: number }

  /**
   *  Audio loadedmetadata. Stores the actual file duration reported by the
   *  browser, preferred over episode.durationSeconds for end-time and
   *  countdown display because RSS feed durations can be inaccurate.
   */
  | { type: "SET_ACTUAL_DURATION"; duration: number };

function advanceTrack(state: PlayerState): PlayerState {
  return {
    ...state,
    currentTrack: (state.currentTrack + 1) % state.episodes.length,
    startAtSeconds: 0,
    currentTime: 0,
    episodeStartTime: new Date(),
    actualDuration: null,
  };
}

export function playerReducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "TUNE_IN":
      return {
        currentStation: action.station,
        episodes: action.episodes,
        currentTrack: action.track,
        startAtSeconds: action.offset,
        currentTime: action.offset,
        episodeStartTime: action.startTime,
        playing: state.playing,
        actualDuration: null,
      };

    case "RESUME":
      return {
        ...state,
        playing: true,
        currentTrack: action.track,
        startAtSeconds: action.offset,
        currentTime: action.offset,
        episodeStartTime: action.startTime,
        actualDuration:
          action.track !== state.currentTrack ? null : state.actualDuration,
      };

    case "PAUSE":
      return { ...state, playing: false };

    case "TICK": {
      const next = state.currentTime + 1;
      const episode = state.episodes[state.currentTrack];
      if (episode && next >= episode.durationSeconds) {
        return advanceTrack(state);
      }
      return { ...state, currentTime: next };
    }

    case "ADVANCE_TRACK":
      return advanceTrack(state);

    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.time };

    case "SET_ACTUAL_DURATION":
      return { ...state, actualDuration: action.duration };
  }
}
