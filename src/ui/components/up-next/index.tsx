import type { EpisodeMetadata } from "@/fetch-data/feed-data";
import type { FC } from "react";
import "./up-next.css";

export interface UpNextProps {
  episode: EpisodeMetadata | undefined;
}

const UpNext: FC<UpNextProps> = ({ episode }) => {
  if (!episode) return null;
  return (
    <p className="up-next">
      Up next — {episode.feed}: {episode.title}
    </p>
  );
};

export default UpNext;
