import { radioStation, type RadioStation } from "@/common/feed-data";

export const fileName = (title: string): string =>
  title
    .toLowerCase()
    .replaceAll(/[^\s\w]+/gim, "")
    .replaceAll(/\s+/gim, "-")
    .toLowerCase();

export const contentFile = (content: RadioStation): string =>
  JSON.stringify(radioStation.parse(content), null, 2);
