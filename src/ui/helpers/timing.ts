import type { EpisodeMetadata } from "@/fetch-data/feed-data";

/**
 * Calculates which episode in a station's list is currently "on air" and how
 * far into it we are, given a broadcast start time and the current wall-clock
 * time.
 *
 * The station is modelled as a single flat playlist that loops indefinitely.
 * Using new Date(0) as startTime causes the modulo to treat the broadcast as
 * having cycled since Unix epoch, making the position deterministic for any
 * given wall-clock time.
 */
export function getCurrent(
  episodes: EpisodeMetadata[],
  startTime: Date,
  now: Date,
): { episodeIndex: number; timeOffsetSeconds: number } {
  const totalDurationMillis = episodes.reduce(
    (s, i) => s + i.durationSeconds * 1000,
    0,
  );

  if (totalDurationMillis === 0) {
    throw new Error("No duration set for station");
  }

  const millisElapsed = now.getTime() - startTime.getTime();
  let offsetSeconds = (millisElapsed % totalDurationMillis) / 1000;

  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i]!;
    if (episode.durationSeconds > offsetSeconds) {
      return {
        episodeIndex: i,
        timeOffsetSeconds: Math.floor(offsetSeconds),
      };
    } else {
      offsetSeconds -= episode.durationSeconds;
    }
  }

  throw new Error("Failed to calculate time offset for station");
}
