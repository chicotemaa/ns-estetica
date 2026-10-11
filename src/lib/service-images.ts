import type { CatalogService } from "./public-site";

export const ambientImage = "/images/ritual-ambient.webp";
export const laserImage = "/images/laser-ambient.webp";
export const isGeneratedImage = (src: string) =>
  src === ambientImage || src === laserImage;
export function serviceImage(
  service: Pick<
    CatalogService,
    "name" | "category" | "imageUrl" | "zonePricing"
  >,
) {
  if (service.imageUrl) return service.imageUrl;
  if (service.zonePricing || /depila/i.test(service.name)) return laserImage;
  if (/masaj/i.test(service.name)) return "/images/masajes.jpg";
  if (/aparat|cabina|dermapen|antiage/i.test(service.name))
    return "/images/cavitacion.jpg";
  if (service.category === "tratamiento") return "/images/manicura.jpg";
  return "/images/faciales.jpg";
}
