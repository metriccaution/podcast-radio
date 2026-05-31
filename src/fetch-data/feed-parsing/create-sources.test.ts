import { describe, expect, test } from "bun:test";
import { fileName, contentFile } from "./create-sources";
import type { RadioStation } from "../feed-data";

describe("fileName", () => {
  const cases: Array<[string, string]> = [
    ["Documentary", "documentary"],
    ["Game Shows", "game-shows"],
    // Non-word, non-space chars are stripped before spaces are collapsed to "-"
    ["RPG Lets-Plays", "rpg-letsplays"],
    ["History & More!", "history-more"],
    // Leading/trailing spaces become leading/trailing dashes (no trim)
    ["  leading spaces  ", "-leading-spaces-"],
    // Multiple spaces collapse to a single dash
    ["multiple   spaces", "multiple-spaces"],
  ];

  for (const [input, expected] of cases) {
    test(`fileName(${JSON.stringify(input)}) = ${JSON.stringify(expected)}`, () => {
      expect(fileName(input)).toBe(expected);
    });
  }
});

describe("contentFile", () => {
  const station: RadioStation = {
    title: "Test Station",
    feeds: [{ title: "Feed A", description: "Desc A" }],
    episodes: [
      {
        feed: "Feed A",
        title: "Episode 1",
        episodeNumber: 1,
        publishedTime: 1700000000000,
        durationSeconds: 3600,
        mediaLink: "https://example.com/ep1.mp3",
      },
    ],
  };

  test("starts with the generated file comment", () => {
    expect(contentFile(station)).toMatch(/^\/\/ Automatically generated file/);
  });

  test("imports RadioStation type from feed-data", () => {
    expect(contentFile(station)).toContain(
      'import type { RadioStation } from "@/fetch-data/feed-data"',
    );
  });

  test("exports the data as default", () => {
    expect(contentFile(station)).toContain("export default data");
  });

  test("includes the station title in the JSON", () => {
    expect(contentFile(station)).toContain('"Test Station"');
  });

  test("produces valid TypeScript that round-trips the data", () => {
    const output = contentFile(station);
    // Extract the JSON object literal from the assignment
    const match = output.match(
      /const data : RadioStation = (\{[\s\S]+\})\nexport/,
    );
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1]!);
    expect(parsed).toEqual(station);
  });
});
