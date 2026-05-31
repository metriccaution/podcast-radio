/**
 * Generates PNG icons from logo.svg for PWA home screen support.
 * Run once with `bun src/generate-icons.ts` and commit the outputs.
 */

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const svg = readFileSync(join(__dirname, "ui/logo.svg"), "utf-8");
const uiDir = join(__dirname, "ui");

const sizes: Array<{ name: string; size: number }> = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(join(uiDir, name), png);
  console.log(`Generated ${name} (${size}×${size})`);
}
