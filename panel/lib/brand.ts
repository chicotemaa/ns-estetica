import { defaultWebsite } from "./website/website-content";
import type { WebsiteContent } from "./website/website-content";
export const palettes = {
  bronze: "Bronce cálido",
  forest: "Verde oliva",
  graphite: "Grafito",
} as const;
export type Brand = {
  name: string;
  initials: string;
  shortName: string;
  palette: keyof typeof palettes;
  identity: WebsiteContent["identity"];
};
export function brandFromRecord(row: Record<string, unknown>): Brand {
  const palette = String(row.brand_palette || "bronze");
  const identity =
    (row.website_content as WebsiteContent | null)?.identity ||
    defaultWebsite.identity;
  return {
    name: identity.name,
    initials:
      identity.shortName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "NA",
    shortName: identity.shortName,
    identity,
    palette: Object.hasOwn(palettes, palette)
      ? (palette as Brand["palette"])
      : "bronze",
  };
}
