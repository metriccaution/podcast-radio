import type { EpisodeMetadata } from "@/fetch-data/feed-data";
import type { FC } from "react";
import AudioPlayer from "./audio";

export interface PlayerProps {
  episodes: EpisodeMetadata[];
  startAt: { track: number; seconds: number };
  playing: boolean;
  onTimeUpdate: (event: { currentTime: number; duration: number }) => void;
  onComplete: () => void;
  onActualDuration: (seconds: number) => void;
}

const Player: FC<PlayerProps> = ({
  episodes,
  startAt,
  playing,
  onTimeUpdate,
  onComplete,
  onActualDuration,
}) => {
  const episode = episodes[startAt.track];
  if (!episode) return null;

  return (
    <AudioPlayer
      source={episode.mediaLink}
      startAtSeconds={startAt.seconds}
      playing={playing}
      onTimeUpdate={onTimeUpdate}
      onComplete={onComplete}
      onActualDuration={onActualDuration}
    />
  );
};

export default Player;
