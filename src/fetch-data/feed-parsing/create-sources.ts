/**
 * Create source files for a given station.
 */

import type { RadioStation } from "../feed-data";

/**
 * Get a nice file name for a title.
 */
export const fileName = (title: string): string =>
  title
    .toLowerCase()
    .replaceAll(/[^\s\w]+/gim, "")
    .replaceAll(/\s+/gim, "-")
    .toLowerCase();

/**
 * Make a TypeScript file containing the raw content.
 */
export const contentFile = (content: RadioStation): string =>
  [
    "// Automatically generated file",
    'import type { RadioStation } from "@/fetch-data/feed-data"',
    `const data : RadioStation = ${JSON.stringify(content, null, 2)}`,
    "export default data",
  ].join("\n");
