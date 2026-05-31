import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { EpisodeMetadata, FeedMetadata } from "@/common/feed-data";
import dayjs from "dayjs";
import dateParse from "dayjs/plugin/customParseFormat";
dayjs.extend(dateParse);

export async function fetchAndParse(url: URL): Promise<ParseResults> {
  return parseXml(parseRss(await loadRss(url)), url);
}

export async function loadRss(url: URL): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${url.href}`);
  }

  return res.text();
}

const rss = z.object({
  rss: z.object({
    channel: z.object({
      title: z.string(),
      link: z.url().optional(),
      description: z.string(),
      "itunes:image": z.object({ "@_href": z.string() }).optional(),
      image: z.object({ url: z.string() }).optional(),
      item: z.array(
        z.object({
          guid: z.union([
            z.object({
              "#text": z.string(),
            }),
            z.string(),
          ]),
          title: z.string(),
          link: z.url().optional(),
          pubDate: z.string(),
          "itunes:duration": z.union([z.string(), z.number()]).optional(),
          "itunes:image": z.object({ "@_href": z.string() }).optional(),
          enclosure: z
            .object({
              "@_url": z.url(),
              "@_type": z.string().optional(),
            })
            .optional(),
        }),
      ),
    }),
  }),
});

export type RssContent = z.infer<typeof rss>;

export function parseRss(xmlString: string): RssContent {
  return rss.parse(
    new XMLParser({
      ignoreAttributes: false,
    }).parse(xmlString),
  );
}

export interface ParseResults {
  feed: FeedMetadata;
  episodes: EpisodeMetadata[];
}

/**
 * Start date of "In Our Time", as a lower bound.
 */
const lowerDateBound = new Date("1998-10-01T00:00:00.000Z").getTime();

/**
 * Turn raw XML-like objects into my own format for the bits I need.
 */
export function parseXml(parsed: RssContent, baseUrl: URL): ParseResults {
  function resolveImage(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    try {
      const resolved = new URL(raw, baseUrl);
      resolved.protocol = "https:";
      return resolved.href;
    } catch {
      return undefined;
    }
  }

  const channelImage = resolveImage(
    parsed.rss.channel["itunes:image"]?.["@_href"] ??
      parsed.rss.channel.image?.url,
  );

  return {
    feed: {
      title: parsed.rss.channel.title,
      // TODO - Remove HTML from here
      description: parsed.rss.channel.description,
      link: parsed.rss.channel.link,
      imageUrl: channelImage,
    },
    episodes: parsed.rss.channel.item
      .map((episode, index) => ({
        ...episode,
        episodeNumber: parsed.rss.channel.item.length - index,
      }))
      // We can't actually generate a station without this.
      .filter((episode) => episode["itunes:duration"] && episode["enclosure"])
      .map(
        (episode): EpisodeMetadata => ({
          feed: parsed.rss.channel.title,
          title: episode.title,
          episodeNumber: episode.episodeNumber,
          publishedTime: rssDate(episode.pubDate),
          durationSeconds: parseDuration(episode["itunes:duration"]),
          infoLink: episode.link,
          mediaLink: episode.enclosure?.["@_url"]!,
          imageUrl: resolveImage(episode["itunes:image"]?.["@_href"]),
        }),
      )
      // Filter out everything where the duration seems off
      .filter(
        (episode) =>
          !Number.isNaN(episode.durationSeconds) &&
          episode.durationSeconds > 60,
      )
      // Don't include anything published before the date of RSS invention, or after today
      .filter((episode) => {
        const inTheFuture = episode.publishedTime > Date.now();
        const beforeRss = episode.publishedTime < lowerDateBound;
        return (
          !Number.isNaN(episode.publishedTime) && !inTheFuture && !beforeRss
        );
      }),
  };
}

/**
 * Parse a duration string, returning the data in seconds, if possible.
 */
export function parseDuration(duration?: string | number): number {
  if (!duration) {
    return Number.NaN;
  }

  if (typeof duration === "number") {
    return duration;
  }

  if (!/^[\d(\.\d+)?:]+$/.test(duration)) {
    return Number.NaN;
  }

  const multipliers: Record<number, number[]> = {
    1: [1],
    2: [60, 1],
    3: [3600, 60, 1],
  };

  const parts = duration.split(":").map((n) => Number.parseFloat(n));

  const multiplier = multipliers[parts.length];
  if (!multiplier) {
    return Number.NaN;
  }

  return parts.map((n, i) => n * multiplier[i]!).reduce((s, i) => s + i, 0);
}

/**
 * Date string -> Unix timestamp in millis.
 */
function rssDate(dateString: string): number {
  return dayjs(
    dateString.slice(4).replace("GMT", "+0000").trim(),
    "DD MMM YYYY HH:mm:ss Z",
  )
    .toDate()
    .getTime();
}
