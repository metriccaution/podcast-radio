import type { EpisodeMetadata, RadioStation } from "@/fetch-data/feed-data";
import { leastCommonMultiple } from "./primes";

/**
 * Interleaves multiple episode lists in round-robin order, cycling until all
 * feeds return to their starting episode simultaneously (determined by the LCM
 * of their lengths).
 *
 * Shorter feeds repeat to keep pace with longer ones, so listening time is
 * balanced per feed rather than per episode. For example, a 10-episode feed
 * paired with a 100-episode feed will replay each of its episodes 10 times
 * before the cycle completes.
 */
export const produceCycle = <T>(lists: T[][]): T[] => {
  const cycle = cycleLength(lists.map((l) => l.length));

  const combined = new Array<T>(cycle * lists.length);
  for (let i = 0; i < combined.length; i++) {
    const list = lists[i % lists.length]!;
    const listIndex = Math.floor(i / lists.length) % list.length;
    combined[i] = list[listIndex]!;
  }

  return combined;
};

/**
 * Returns how many "rounds" of interleaving are needed before all feeds align
 * back to their first episode simultaneously (i.e. the LCM of their lengths).
 *
 * Capped at maxIterations × longest feed length to prevent explosion when feed
 * lengths are coprime (e.g. LCM(99, 100) = 9900), which would produce an
 * unwieldily large cycle and corresponding memory use.
 */
export const cycleLength = (
  lengths: number[],
  maxIterations: number = 10,
): number => {
  const actualCycle = lengths.reduce(
    (lcm, i) => leastCommonMultiple(lcm, i),
    1,
  );

  const maxLength = maxIterations * lengths.reduce((m, i) => Math.max(m, i), 0);

  return Math.min(actualCycle, maxLength);
};

/**
 * Produces an interleaved episode list for a station by grouping episodes by
 * their source feed and passing the groups to produceCycle.
 *
 * Feed order follows station.feeds (declaration order), not the order episodes
 * happen to appear in station.episodes, so the interleave is stable regardless
 * of how the data was generated. Feeds that produced zero valid episodes after
 * RSS parsing are silently dropped rather than producing empty slots in the
 * cycle.
 */
export function interleaveStation(station: RadioStation): EpisodeMetadata[] {
  const byFeed = new Map<string, EpisodeMetadata[]>();

  for (const feed of station.feeds) {
    byFeed.set(feed.title, []);
  }
  for (const episode of station.episodes) {
    byFeed.get(episode.feed)?.push(episode);
  }

  const groups = [...byFeed.values()].filter((g) => g.length > 0);
  if (groups.length === 0) return [];

  return produceCycle(groups);
}
