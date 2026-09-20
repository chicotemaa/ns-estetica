import raw from "./website-defaults.json";
export type WebsitePhoto = { id: string; title: string; image: string; alt: string; description: string };
export type WebsitePost = { id: string; title: string; excerpt: string; content: string };
export type WebsiteVideo = {
  id: string;
  title: string;
  description: string;
  url: string;
  poster: string;
};
export type WebsiteContent = Omit<typeof raw, "videos" | "gallery" | "brand" | "journal"> & {
  gallery: Omit<typeof raw.gallery, "photos"> & { photos: WebsitePhoto[] };
  brand: Omit<typeof raw.brand, "photos"> & { photos: WebsitePhoto[] };
  journal: Omit<typeof raw.journal, "posts"> & { posts: WebsitePost[] };
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
