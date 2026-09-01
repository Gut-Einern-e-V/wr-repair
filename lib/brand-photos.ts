/* Bildwelt aus Weltrekord_Styleguide/WR_Photos.
   Quellen sind Pexels beziehungsweise KI-generiert; die Urheberhinweise stehen
   laut Styleguide im Dateinamen und werden hier zusaetzlich als Credit gefuehrt. */

import type { StoryImage } from "./stories";

export type BrandPhoto = {
  src: string;
  alt: string;
  credit: string;
};

export const brandPhotos = {
  workshop: {
    src: "/photos/werkstatt-pexels-cottonbro-4482005.jpg",
    alt: "Ein Erwachsener und ein Kind arbeiten gemeinsam an einer Werkbank in einer Autowerkstatt.",
    credit: "Foto: cottonbro studio / Pexels",
  },
  bicycle: {
    src: "/photos/fahrrad-pexels-cottonbro-10505928.jpg",
    alt: "Drei Jugendliche schrauben im Hof gemeinsam an einem umgedrehten Fahrrad.",
    credit: "Foto: cottonbro studio / Pexels",
  },
  reuse: {
    src: "/photos/weiterverwenden-pexels-wolrider-33087361.jpg",
    alt: "Zwei Menschen vor einem alten Auto, dessen Karosserie mit gehaekelten Decken bezogen ist.",
    credit: "Foto: Wolrider / Pexels",
  },
  secondLife: {
    src: "/photos/zweites-leben-ki-generiert.jpg",
    alt: "Aeltere Frau im Vintage-Trainingsanzug haelt lachend einen wieder funktionierenden Handheld-Spielkonsole in die Kamera.",
    credit: "Bild: KI-generiert",
  },
  celebrate: {
    src: "/photos/gemeinsam-feiern-ki-generiert.jpg",
    alt: "Zwei Menschen unterschiedlichen Alters stehen in Lederjacken lachend vor einer Festivalbuehne.",
    credit: "Bild: KI-generiert",
  },
} satisfies Record<string, BrandPhoto>;

export const storyPhotoOrder = [
  brandPhotos.secondLife,
  brandPhotos.bicycle,
  brandPhotos.reuse,
] as const;

export function storyPhoto(index: number): BrandPhoto {
  return storyPhotoOrder[index % storyPhotoOrder.length];
}

/**
 * Aufmacher einer Geschichte fuer Kacheln und Karten.
 *
 * Bringt die Geschichte ein eigenes Bild mit (Frontmatter `image:`, siehe
 * lib/stories.ts), gewinnt das. Sonst greift wie bisher die Markenbildwelt,
 * reihum nach Position in der Liste - so bleibt eine Uebersicht auch dann
 * bebildert, wenn erst ein Teil der Geschichten eigene Fotos hat (Issue #60).
 */
export function storyCover(story: { image: StoryImage | null }, index: number): BrandPhoto {
  if (!story.image) return storyPhoto(index);
  return { src: story.image.src, alt: story.image.alt, credit: story.image.credit ?? "" };
}
