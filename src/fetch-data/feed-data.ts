/**
 * Info about a particular RSS feed.
 *
 * Doesn't include episodes.
 */
export interface FeedMetadata {
  title: string;
  link?: string;
  description: string;
}

/**
 * Information about a single podcast episode.
 */
export interface EpisodeMetadata {
  /**
   * Name of a feed - matches up with the `title` from {@link FeedMetadata}.
   */
  feed: string;
  title: string;
  episodeNumber: number;
  publishedTime: number;
  durationSeconds: number;
  infoLink?: string;
  mediaLink: string;
}

/**
 * Distilled data from a collection of RSS feeds.
 */
export interface RadioStation {
  title: string;
  feeds: FeedMetadata[];
  episodes: EpisodeMetadata[];
}
