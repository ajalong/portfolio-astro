/**
 * Standalone client / partner logo list for the homepage carousel.
 *
 * This list is intentionally independent of the project content
 * collection — the carousel can feature clients you don't have a
 * dedicated case study for. Add entries here as needed.
 *
 * Source files live in `public/logos/`. Each `src` is the path under
 * the public root (i.e. `/logos/foo.svg`). Logos render full-colour
 * and height-normalized — widths vary by each logo's intrinsic aspect
 * ratio, so a square monogram and a wide wordmark both read at the
 * same vertical scale without being squashed into a uniform box.
 *
 * Why local SVGs instead of Cloudinary: SVG is already vector-perfect
 * at any size, so Cloudinary's height-normalization and format-
 * conversion features don't help. Local files ship in the page bundle,
 * version-control with the codebase, and avoid an extra CDN hop for
 * what's typically a 3–10KB asset.
 *
 * Order matters — the marquee scrolls items in source order; mix
 * shapes/weights so the rhythm reads well rather than clustering
 * similar logos together.
 */
export interface HomeLogo {
  /** Human label for the alt text. */
  name: string;
  /** Path under the `public/` root, e.g. `/logos/gsk.svg`. */
  src: string;
}

export const homeLogos: HomeLogo[] = [
  { name: 'University of Cambridge', src: '/logos/logo-uni_cambridge.svg' },
  { name: 'Mercedes-Benz',           src: '/logos/logo-mercedes_benz.svg' },
  { name: 'Google',                  src: '/logos/logo-google.svg' },
  { name: 'GSK',                     src: '/logos/logo-gsk.svg' },
  { name: 'Wall Street Journal',     src: '/logos/logo-wsj.svg' },
  { name: 'Tesco',                   src: '/logos/logo-tesco.svg' },
  { name: 'Vodafone',                src: '/logos/logo-vodafone.svg' },
  { name: 'Samsung',                 src: '/logos/logo-samsung.svg' },
  { name: 'BMW',                     src: '/logos/logo-bmw.svg' },
  { name: 'AstraZeneca',             src: '/logos/logo-astra_zeneca.svg' },
  { name: 'Stanford University',     src: '/logos/logo-uni_stanford.svg' },
  { name: 'MINI',                    src: '/logos/logo-mini.svg' },
  { name: 'AtkinsRéalis',            src: '/logos/logo-atkins_realis.svg' },
  { name: 'Epic',                    src: '/logos/logo-epic.svg' },
  { name: 'OMV',                     src: '/logos/logo-omv.svg' },
  { name: 'Jefferies',               src: '/logos/logo-jeffries.svg' },
  { name: 'Topsoe',                  src: '/logos/logo-topsoe.svg' },
];
