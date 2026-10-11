import type { CatalogService } from "./public-site";

export const ambientImage = "/images/ritual-ambient.webp";
export const laserImage = "/images/laser-ambient.webp";
const treatmentImages = {
  manchas: "/images/facial-manchas.webp",
  dermapen: "/images/facial-dermapen.webp",
  relajantes: "/images/masaje-relajante.webp",
  reductores: "/images/masaje-reductor.webp",
  aparatologia: "/images/facial-led.webp",
};
export function serviceImage(
  service: Pick<
    CatalogService,
    "name" | "category" | "imageUrl" | "zonePricing"
  >,
) {
  if (service.imageUrl) return service.imageUrl;
  if (service.zonePricing || /depila/i.test(service.name)) return laserImage;
  if (/mancha/i.test(service.name)) return treatmentImages.manchas;
  if (/dermapen/i.test(service.name)) return treatmentImages.dermapen;
  if (/relaj/i.test(service.name)) return treatmentImages.relajantes;
  if (/reductor/i.test(service.name)) return treatmentImages.reductores;
  if (/cabina|led|espatula|electropor/i.test(service.name))
    return treatmentImages.aparatologia;
  if (/masaj/i.test(service.name)) return "/images/masajes.jpg";
  if (/aparat|cabina|dermapen|antiage/i.test(service.name))
    return "/images/cavitacion.jpg";
  if (service.category === "tratamiento") return "/images/manicura.jpg";
  return "/images/faciales.jpg";
}
