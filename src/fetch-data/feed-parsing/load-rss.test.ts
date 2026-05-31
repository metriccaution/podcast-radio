import { describe, expect, test } from "bun:test";
import { fetchAndParse, parseDuration, parseRss, parseXml } from "./load-rss";
import feeds from "./stations";

describe("parseDuration", () => {
  const cases: Array<[string | number | undefined, number]> = [
    [undefined, NaN],
    ["", NaN],
    ["not-a-duration", NaN],
    // Seconds only
    [45, 45],
    ["45", 45],
    ["90", 90],
    // MM:SS
    ["1:30", 90],
    ["10:00", 600],
    ["59:59", 3599],
    // HH:MM:SS
    ["1:00:00", 3600],
    ["1:30:00", 5400],
    ["1:01:01", 3661],
    ["2:30:45", 9045],
  ];

  for (const [input, expected] of cases) {
    test(`parseDuration(${JSON.stringify(input)}) = ${expected}`, () => {
      const result = parseDuration(input as string | number | undefined);
      if (Number.isNaN(expected)) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBe(expected);
      }
    });
  }
});

const testBaseUrl = new URL("https://feeds.example.com/feed.xml");

const minimalRssXml = (overrides: {
  title?: string;
  link?: string;
  description?: string;
  channelExtra?: string;
  items?: string;
}) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${overrides.title ?? "Test Podcast"}</title>
    ${overrides.link ? `<link>${overrides.link}</link>` : ""}
    <description>${overrides.description ?? "A test feed"}</description>
    ${overrides.channelExtra ?? ""}
    ${overrides.items ?? ""}
  </channel>
</rss>`;

const minimalItem = (overrides: {
  guid?: string;
  title?: string;
  pubDate?: string;
  duration?: string;
  enclosureUrl?: string;
}) => `
<item>
  <guid>${overrides.guid ?? "episode-1"}</guid>
  <title>${overrides.title ?? "Episode 1"}</title>
  <pubDate>${overrides.pubDate ?? "Mon, 01 Jan 2024 10:00:00 GMT"}</pubDate>
  <itunes:duration>${overrides.duration ?? "1:00:00"}</itunes:duration>
  <enclosure url="${overrides.enclosureUrl ?? "https://example.com/ep1.mp3"}" type="audio/mpeg"/>
</item>`;

const twoItems =
  minimalItem({ guid: "ep1", title: "Ep 1" }) +
  minimalItem({ guid: "ep2", title: "Ep 2" });

describe("parseRss", () => {
  test("parses a feed with multiple items", () => {
    const xml = minimalRssXml({ items: twoItems });
    const result = parseRss(xml);
    expect(result.rss.channel.title).toBe("Test Podcast");
    expect(result.rss.channel.description).toBe("A test feed");
    expect(result.rss.channel.item).toHaveLength(2);
  });

  test("parses channel link when present", () => {
    const xml = minimalRssXml({ link: "https://example.com", items: twoItems });
    const result = parseRss(xml);
    expect(result.rss.channel.link).toBe("https://example.com");
  });

  test("channel link is absent when not in feed", () => {
    const xml = minimalRssXml({ items: twoItems });
    const result = parseRss(xml);
    expect(result.rss.channel.link).toBeUndefined();
  });

  test("throws on invalid XML structure", () => {
    expect(() => parseRss("<not>valid rss</not>")).toThrow();
  });

  test("throws for a feed with a single item (fast-xml-parser limitation)", () => {
    // fast-xml-parser returns a lone <item> as an object, not a one-element
    // array, so the Zod array schema rejects it. Feeds with exactly one episode
    // are unsupported until the parser config is fixed.
    const xml = minimalRssXml({ items: minimalItem({}) });
    expect(() => parseRss(xml)).toThrow();
  });
});

const validItem2 = minimalItem({ guid: "ep-valid", title: "Valid Episode" });

describe("parseXml", () => {
  test("maps feed metadata correctly", () => {
    const xml = minimalRssXml({
      title: "My Show",
      link: "https://myshow.com",
      description: "Show description",
      items: twoItems,
    });
    const { feed } = parseXml(parseRss(xml), testBaseUrl);
    expect(feed.title).toBe("My Show");
    expect(feed.link).toBe("https://myshow.com");
    expect(feed.description).toBe("Show description");
  });

  test("assigns episode numbers in reverse order (oldest = 1)", () => {
    const xml = minimalRssXml({
      items:
        minimalItem({ guid: "ep3", title: "Ep 3" }) +
        minimalItem({ guid: "ep2", title: "Ep 2" }) +
        minimalItem({ guid: "ep1", title: "Ep 1" }),
    });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes[0]!.episodeNumber).toBe(3);
    expect(episodes[1]!.episodeNumber).toBe(2);
    expect(episodes[2]!.episodeNumber).toBe(1);
  });

  test("filters out episodes without an enclosure", () => {
    const itemWithoutEnclosure = `
<item>
  <guid>no-media</guid>
  <title>No Media</title>
  <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
  <itunes:duration>1:00:00</itunes:duration>
</item>`;
    const xml = minimalRssXml({ items: validItem2 + itemWithoutEnclosure });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes).toHaveLength(1);
  });

  test("filters out episodes without a duration", () => {
    const itemWithoutDuration = `
<item>
  <guid>no-duration</guid>
  <title>No Duration</title>
  <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
  <enclosure url="https://example.com/ep.mp3" type="audio/mpeg"/>
</item>`;
    const xml = minimalRssXml({ items: validItem2 + itemWithoutDuration });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes).toHaveLength(1);
  });

  test("filters out episodes shorter than 60 seconds", () => {
    const shortItem = minimalItem({ guid: "short", duration: "0:45" });
    const xml = minimalRssXml({ items: validItem2 + shortItem });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes).toHaveLength(1);
  });

  test("filters out episodes with dates in the future", () => {
    const futureItem = minimalItem({
      guid: "future",
      pubDate: "Mon, 01 Jan 2099 10:00:00 GMT",
    });
    const xml = minimalRssXml({ items: validItem2 + futureItem });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes).toHaveLength(1);
  });

  test("filters out episodes with dates before RSS existed", () => {
    const ancientItem = minimalItem({
      guid: "ancient",
      pubDate: "Mon, 01 Jan 1990 10:00:00 GMT",
    });
    const xml = minimalRssXml({ items: validItem2 + ancientItem });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes).toHaveLength(1);
  });

  test("sets mediaLink from enclosure url", () => {
    const xml = minimalRssXml({
      items:
        validItem2 +
        minimalItem({
          guid: "ep-url",
          enclosureUrl: "https://cdn.example.com/audio.mp3",
        }),
    });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    const ep = episodes.find(
      (e) => e.mediaLink === "https://cdn.example.com/audio.mp3",
    );
    expect(ep).toBeDefined();
  });

  test("sets feed name from channel title", () => {
    const xml = minimalRssXml({ title: "My Podcast", items: twoItems });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(episodes[0]!.feed).toBe("My Podcast");
  });

  test("captures channel itunes:image as feed imageUrl", () => {
    const xml = minimalRssXml({
      channelExtra: `<itunes:image href="https://example.com/cover.jpg"/>`,
      items: twoItems,
    });
    const { feed } = parseXml(parseRss(xml), testBaseUrl);
    expect(feed.imageUrl).toBe("https://example.com/cover.jpg");
  });

  test("upgrades channel itunes:image HTTP URL to HTTPS", () => {
    const xml = minimalRssXml({
      channelExtra: `<itunes:image href="http://example.com/cover.jpg"/>`,
      items: twoItems,
    });
    const { feed } = parseXml(parseRss(xml), testBaseUrl);
    expect(feed.imageUrl).toBe("https://example.com/cover.jpg");
  });

  test("falls back to RSS image element when no itunes:image", () => {
    const xml = minimalRssXml({
      channelExtra: `<image><url>https://example.com/rss-img.jpg</url></image>`,
      items: twoItems,
    });
    const { feed } = parseXml(parseRss(xml), testBaseUrl);
    expect(feed.imageUrl).toBe("https://example.com/rss-img.jpg");
  });

  test("captures episode itunes:image as episode imageUrl", () => {
    const itemWithImage =
      minimalItem({ guid: "ep-img" }) +
      `<item>
  <guid>ep-img-2</guid>
  <title>Episode with Art</title>
  <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
  <itunes:duration>1:00:00</itunes:duration>
  <enclosure url="https://example.com/ep2.mp3" type="audio/mpeg"/>
  <itunes:image href="https://example.com/ep-art.jpg"/>
</item>`;
    const xml = minimalRssXml({ items: itemWithImage });
    const { episodes } = parseXml(parseRss(xml), testBaseUrl);
    const ep = episodes.find(
      (e) => e.mediaLink === "https://example.com/ep2.mp3",
    );
    expect(ep?.imageUrl).toBe("https://example.com/ep-art.jpg");
  });

  test("imageUrl is undefined when no image elements present", () => {
    const xml = minimalRssXml({ items: twoItems });
    const { feed, episodes } = parseXml(parseRss(xml), testBaseUrl);
    expect(feed.imageUrl).toBeUndefined();
    expect(episodes[0]!.imageUrl).toBeUndefined();
  });
});

/**
 * Typically leave this skipped, as it involves actually fetching remote data.
 */
describe.skip("Parsing real feeds", () => {
  const testFeeds = feeds
    .flatMap((f) => f.feeds)
    .filter((f) =>
      [
        "Darknet Diaries",
        "BBC Intrigue",
        "BBC Limelight",
        "Totalis Rankium - Pirates",
        "Journey Through Time",
      ].includes(f.title),
    );

  for (const { rssUrl, title } of testFeeds) {
    test(`Fetch and test ${title} from ${rssUrl}`, async () => {
      const feed = await fetchAndParse(new URL(rssUrl));
      expect(feed.episodes.length).toBeGreaterThan(0);
    });
  }
});
