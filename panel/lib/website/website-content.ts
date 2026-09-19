import raw from "./website-defaults.json";
export type WebsiteVideo = {
  id: string;
  title: string;
  description: string;
  url: string;
  poster: string;
};
export type WebsiteContent = Omit<typeof raw, "videos"> & {
  videos: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    items: WebsiteVideo[];
  };
};
export type WebsiteMedia = {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type WebsiteState = {
  draft: WebsiteContent;
  published: WebsiteContent;
  revision: number;
  publishedAt: string | null;
  media: WebsiteMedia[];
};
export const defaultWebsite: WebsiteContent = raw;
