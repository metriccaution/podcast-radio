import type { EpisodeMetadata } from "@/common/feed-data";
import type { FC } from "react";
import "./current-episode.css";

/**
 * Formats a Date as a locale-aware wall-clock time (HH:MM).
 *
 * Uses the user's local timezone intentionally — start/end times are
 * meaningful to the listener in their own context.
 */
function wallClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats a duration in seconds as a human-readable countdown (M:SS or
 * H:MM:SS).
 *
 * Clamps to zero to gracefully handle the window between the
 * metadata duration running out and the audio's onComplete actually firing,
 * which can happen when the real file is longer than the RSS-reported duration.
 */
function countdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export interface CurrentEpisodeProps {
  /**
   * The actual episode being played.
   */
  episode: EpisodeMetadata;
  /**
   * Wall-clock time the current episode started on the radio clock.
   */
  startTime: Date;
  /**
   * Seconds into the episode, driven by audio position when playing and
   * wall-clock ticking when paused. May slightly exceed durationSeconds
   * due to buffering or metadata inaccuracy; countdown() clamps it.
   */
  currentTime: number;
  /**
   * Actual file duration in seconds, reported by the browser after parsing
   * the media headers. Null until the audio element fires loadedmetadata for
   * this track. Preferred over episode.durationSeconds when available because
   * RSS feed durations can be inaccurate.
   */
  actualDuration: number | null;
}

const CurrentEpisode: FC<CurrentEpisodeProps> = ({
  episode,
  startTime,
  currentTime,
  actualDuration,
}) => {
  const duration = actualDuration ?? episode.durationSeconds;
  const endTime = new Date(startTime.getTime() + duration * 1000);
  const remaining = duration - currentTime;

  return (
    <div className="current-episode">
      <p className="feed-name">{episode.feed}</p>
      {episode.infoLink ? (
        <a
          href={episode.infoLink}
          target="_blank"
          rel="noreferrer"
          className="episode-title"
        >
          {episode.title}
        </a>
      ) : (
        <p className="episode-title">{episode.title}</p>
      )}
      <p className="episode-times">
        {wallClock(startTime)} – {wallClock(endTime)}
        <span className="remaining">{countdown(remaining)} left</span>
      </p>
    </div>
  );
};

export default CurrentEpisode;
