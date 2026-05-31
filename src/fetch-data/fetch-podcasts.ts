/**
 * Build-time script to fetch podcast data.
 */

import { join } from "node:path";
import type { EpisodeMetadata, FeedMetadata, RadioStation } from "./feed-data";
import { fetchAndParse } from "./feed-parsing/load-rss";
import stations from "./feed-parsing/stations";

import { writeFile } from "node:fs/promises";
import { contentFile, fileName } from "./feed-parsing/create-sources";

const stationFileDir = join(__dirname, "..", "ui", "stations");

for (const station of stations) {
  console.log(new Date(), `Fetching ${station.title}`);

  const feeds: FeedMetadata[] = [];
  const episodes: EpisodeMetadata[] = [];

  for (const feed of station.feeds) {
    const parsed = await fetchAndParse(new URL(feed.rssUrl));
    feeds.push(parsed.feed);
    parsed.episodes.forEach((episode) => episodes.push(episode));
  }

  const results: RadioStation = {
    title: station.title,
    feeds,
    episodes,
  };

  console.log(new Date(), `Found ${episodes.length} valid episodes`);

  const neatName = fileName(results.title);

  await writeFile(
    join(stationFileDir, neatName + "-content.ts"),
    contentFile(results),
    "utf-8",
  );
}
