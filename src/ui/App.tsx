import { useEffect, useReducer } from "react";
import { radioStation } from "@/common/feed-data";
import type { EpisodeMetadata } from "@/common/feed-data";
import { interleaveStation } from "./helpers/stations";
import { getCurrent } from "./helpers/timing";
import { playerReducer } from "./reducer";
import type { PlayerState } from "./reducer";
import StationPicker from "@/ui/components/station-picker";
import CurrentEpisode from "@/ui/components/current-episode";
import UpNext from "@/ui/components/up-next";
import Player from "@/ui/components/player";
import Artwork from "@/ui/components/artwork";
import { PlayIcon, PauseIcon } from "@/ui/components/icons";
import "./index.css";
import "./app.css";

import rawDocumentary from "./stations/documentary-content.json";
import rawGameShows from "./stations/game-shows-content.json";
import rawHistory from "./stations/history-content.json";
import rawRpgLetsPlays from "./stations/rpg-letsplays-content.json";
import rawDrama from "./stations/drama-content.json";
import rpgTalk from "./stations/rpg-talk-content.json";

const stations = [
  rawDocumentary,
  rawDrama,
  rawGameShows,
  rawHistory,
  rawRpgLetsPlays,
  rpgTalk,
].map((raw) => radioStation.parse(raw));

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

const buildTime: string | undefined =
  typeof process !== "undefined"
    ? process.env.BUN_PUBLIC_BUILD_TIME
    : undefined;

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

  const currentEpisode = state.episodes[state.currentTrack];
  const currentFeed = state.currentStation.feeds.find(
    (f) => f.title === currentEpisode?.feed,
  );
  const artworkUrl = currentEpisode?.imageUrl ?? currentFeed?.imageUrl;

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

      <div className="content-layout">
        <Artwork imageUrl={artworkUrl} alt={currentEpisode?.feed ?? ""} />

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
            {state.playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <Player
            episodes={state.episodes}
            startAt={{
              track: state.currentTrack,
              seconds: state.startAtSeconds,
            }}
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

      <footer className="site-footer">
        Feeds curated by the author of this tool; not affiliated with any
        podcast creator.
        {buildTime && <> &middot; Built {buildTime}</>}
      </footer>
    </div>
  );
}

export default App;
