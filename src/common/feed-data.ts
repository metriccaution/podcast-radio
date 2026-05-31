import { z } from "zod";

export const feedMetadata = z.object({
  title: z.string(),
  link: z.string().optional(),
  description: z.string(),
  imageUrl: z.string().optional(),
});
export type FeedMetadata = z.infer<typeof feedMetadata>;

export const episodeMetadata = z.object({
  feed: z.string(),
  title: z.string(),
  episodeNumber: z.number().int(),
  publishedTime: z.number(),
  durationSeconds: z.number(),
  infoLink: z.url().optional(),
  mediaLink: z.url(),
  imageUrl: z.url().optional(),
});
export type EpisodeMetadata = z.infer<typeof episodeMetadata>;

export const radioStation = z.object({
  title: z.string(),
  feeds: z.array(feedMetadata),
  episodes: z.array(episodeMetadata),
});
export type RadioStation = z.infer<typeof radioStation>;
