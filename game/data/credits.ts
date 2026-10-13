import type { Localized } from "@/game/i18n/types";

/** Third-party work used by the game (shown on the Credits screen; see also ASSETS.md). */
export interface Credit {
  name: string;
  author: string;
  license: string;
  url: string;
  licenseUrl?: string;
  /** What it is used for. */
  use: Localized;
}

export const ASSET_CREDITS: readonly Credit[] = [
  {
    name: "Planet textures (Sun, planets, Moon, Saturn's rings)",
    author: "Solar System Scope / INOVE",
    license: "CC BY 4.0",
    url: "https://www.solarsystemscope.com/textures/",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: { en: "Converted to WebP; Earth's maps are combined in the game.", id: "Dikonversi ke WebP; peta Bumi digabung di dalam game." },
  },
  {
    name: "Orbitron",
    author: "Matt McInerney",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Orbitron",
    licenseUrl: "https://openfontlicense.org/",
    use: { en: "Titles and HUD numbers.", id: "Judul dan angka HUD." },
  },
  {
    name: "Exo 2",
    author: "Natanael Gama",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Exo+2",
    licenseUrl: "https://openfontlicense.org/",
    use: { en: "Body text.", id: "Teks isi." },
  },
];

export const LIBRARY_CREDITS: readonly Pick<Credit, "name" | "license" | "url">[] = [
  { name: "Next.js", license: "MIT", url: "https://nextjs.org" },
  { name: "React", license: "MIT", url: "https://react.dev" },
  { name: "three.js", license: "MIT", url: "https://threejs.org" },
  { name: "React Three Fiber, drei & postprocessing (pmndrs)", license: "MIT", url: "https://pmnd.rs" },
  { name: "postprocessing", license: "Zlib", url: "https://github.com/pmndrs/postprocessing" },
  { name: "Zustand", license: "MIT", url: "https://github.com/pmndrs/zustand" },
  { name: "howler.js", license: "MIT", url: "https://howlerjs.com" },
  { name: "Motion", license: "MIT", url: "https://motion.dev" },
  { name: "Supabase JS", license: "MIT", url: "https://supabase.com" },
  { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com" },
];
