import { ContainerImage } from "../types";

export function fullImageName(image: ContainerImage) {
  return `${image.name}${image.tag ? ':' + image.tag : ''}`;
}