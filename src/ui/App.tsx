import { useEffect, useReducer } from "react";
import type { EpisodeMetadata } from "@/fetch-data/feed-data";
import { interleaveStation } from "./helpers/stations";
import { getCurrent } from "./helpers/timing";
import { playerReducer } from "./reducer";
import type { PlayerState } from "./reducer";
import StationPicker from "@/ui/components/station-picker";
import CurrentEpisode from "@/ui/components/current-episode";
import UpNext from "@/ui/components/up-next";
import Player from "@/ui/components/player";
import "./index.css";
import "./app.css";

import documentary from "./stations/documentary-content";
import gameShows from "./stations/game-shows-content";
import history from "./stations/history-content";
import rpgLetsPlays from "./stations/rpg-letsplays-content";

const stations = [documentary, gameShows, history, rpgLetsPlays];

/**
 * Returns where the given episode list "is" right now on the radio clock.
 *
 * The station is treated as having broadcast continuously since Unix epoch
 * (new Date(0)), so the position is always deterministic for a given wall-clock
 * time — tuning in at the same moment always lands on the same episode at the
 * same offset, regardless of when the app was loaded.
 */
function radioNow(episodes: EpisodeMetadata[]) {
  const now = new Date();
  const { episodeIndex, timeOffsetSeconds } = getCurrent(
    episodes,
    new Date(0),
    now,
  );
  return {
    episodeIndex,
    timeOffsetSeconds,
    episodeStartTime: new Date(now.getTime() - timeOffsetSeconds * 1000),
  };
}

function initialState(): PlayerState {
  const station = stations[0]!;
  const interleaved = interleaveStation(station);
  const { episodeIndex, timeOffsetSeconds, episodeStartTime } =
    radioNow(interleaved);
  return {
    currentStation: station,
    episodes: interleaved,
    currentTrack: episodeIndex,
    startAtSeconds: timeOffsetSeconds,
    currentTime: timeOffsetSeconds,
    episodeStartTime,
    playing: false,
    actualDuration: null,
  };
}

export function App() {
  const [state, dispatch] = useReducer(playerReducer, null, initialState);

  /**
   * While paused, ticks the display forward once per second using a
   * self-rescheduling setTimeout chained through the currentTime dependency.
   */
  useEffect(() => {
    if (state.playing) return;
    const id = setTimeout(() => dispatch({ type: "TICK" }), 1000);
    return () => clearTimeout(id);
  }, [state.playing, state.currentTrack, state.currentTime]);

  const handlePlayToggle = () => {
    if (state.playing) {
      dispatch({ type: "PAUSE" });
    } else {
      // Re-sync the current playing episode with the current clock-time
      const { episodeIndex, timeOffsetSeconds, episodeStartTime } = radioNow(
        state.episodes,
      );
      dispatch({
        type: "RESUME",
        track: episodeIndex,
        offset: timeOffsetSeconds,
        startTime: episodeStartTime,
      });
    }
  };

  return (
    <div className="app">
      <StationPicker
        stations={stations}
        current={state.currentStation}
        onChange={(station) => {
          const interleaved = interleaveStation(station);
          const { episodeIndex, timeOffsetSeconds, episodeStartTime } =
            radioNow(interleaved);
          dispatch({
            type: "TUNE_IN",
            station,
            episodes: interleaved,
            track: episodeIndex,
            offset: timeOffsetSeconds,
            startTime: episodeStartTime,
          });
        }}
      />

      <main className="player-area">
        <CurrentEpisode
          episode={state.episodes[state.currentTrack]!}
          startTime={state.episodeStartTime}
          currentTime={state.currentTime}
          actualDuration={state.actualDuration}
        />
        <UpNext episode={state.episodes[state.currentTrack + 1]} />

        <button
          className={`play-pause ${state.playing ? "playing" : ""}`}
          onClick={handlePlayToggle}
          aria-label={state.playing ? "Pause" : "Play"}
        >
          {state.playing ? "⏸" : "▶"}
        </button>

        <Player
          episodes={state.episodes}
          startAt={{ track: state.currentTrack, seconds: state.startAtSeconds }}
          playing={state.playing}
          onTimeUpdate={({ currentTime }) =>
            dispatch({ type: "SET_CURRENT_TIME", time: currentTime })
          }
          onComplete={() => dispatch({ type: "ADVANCE_TRACK" })}
          onActualDuration={(duration) =>
            dispatch({ type: "SET_ACTUAL_DURATION", duration })
          }
        />
      </main>
    </div>
  );
}

export default App;
