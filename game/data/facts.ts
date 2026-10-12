import type { Localized } from "@/game/i18n/types";
import { BODIES, BODY_ORDER } from "./planets";

/** Short, accurate facts used for loading tips and the result screen. */
export const SPACE_FACTS: readonly Localized[] = [
  ...BODY_ORDER.map((id) => BODIES[id].facts.funFact),
  {
    id: "Bulan menjauh dari Bumi sekitar 3,8 cm setiap tahun.",
    en: "The Moon drifts about 3.8 cm farther from Earth every year.",
  },
  {
    id: "Gravitasi di Bulan hanya sekitar seperenam gravitasi Bumi.",
    en: "Gravity on the Moon is only about one-sixth of Earth's.",
  },
  {
    id: "Stasiun Luar Angkasa Internasional mengelilingi Bumi kira-kira setiap 90 menit.",
    en: "The International Space Station circles Earth roughly every 90 minutes.",
  },
  {
    id: "Di luar angkasa tidak ada udara, jadi suara tidak bisa merambat.",
    en: "There is no air in space, so sound cannot travel there.",
  },
  {
    id: "Sumbu Bumi miring sekitar 23,4° — itulah yang menyebabkan musim.",
    en: "Earth's axis is tilted about 23.4° — that's what causes the seasons.",
  },
  {
    id: "Jejak kaki astronaut di Bulan bisa bertahan jutaan tahun karena tidak ada angin di sana.",
    en: "Astronaut footprints on the Moon can last millions of years because there is no wind.",
  },
];
