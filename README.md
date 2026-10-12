# Jelajah Angkasa 3D

Game web 3D eksplorasi luar angkasa yang langsung jalan di browser (desktop & HP) tanpa install.
Spesifikasi lengkap ada di [`PRD.md`](PRD.md); daftar aset dan lisensi di [`ASSETS.md`](ASSETS.md).

**Status:** Fase 1 (Core Loop) — terbang, misi *Cincin Orbit*, menu/HUD, onboarding, audio, kualitas otomatis.

## Menjalankan

```bash
npm install
npm run dev
```

Buka URL yang dicetak (default http://localhost:3000). Butuh Node.js ≥ 20.9 dan browser dengan WebGL2.

| Skrip               | Fungsi                                             |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Server pengembangan (Turbopack)                    |
| `npm run build`     | Build produksi                                     |
| `npm run typecheck` | Generate tipe rute Next + `tsc --noEmit`           |
| `npm run lint`      | ESLint (aturan Next + React Hooks)                 |
| `npm run test`      | Vitest untuk logika murni                          |
| `npm run check`     | typecheck + lint + test                            |

## Kontrol

| Desktop | HP (landscape) | Aksi |
| --- | --- | --- |
| Mouse (tanpa pointer lock) | Joystick kiri | Arahkan pesawat ke kursor |
| Tombol panah | — | Kemudi alternatif |
| W / S | Tuas kanan | Gas / rem |
| A / D | — (auto-level) | Berguling |
| Shift / Spasi | Tombol TURBO | Turbo (energi terbatas) |
| C | Tombol kamera | Kamera luar ⇄ kokpit |
| Esc / P | Tombol jeda | Jeda |
| M | Tombol suara | Suara nyala/mati |

## Arsitektur singkat

```
app/                 layout (metadata SEO), page (shell server), opengraph-image, icon
game/
  GameRoot.tsx       next/dynamic(ssr:false) → GameApp (Canvas + lapisan UI)
  config/            SEMUA angka tuning (terbang, kamera, misi, kualitas, audio, HUD, visual)
  data/              planets.ts (data & fakta planet), missions.ts, facts.ts
  i18n/              id (default) + en, t() bertipe
  stores/            Zustand: game (state machine), session (UI misi), progress (persist), quality, loading, asset
  controls/          keyboard+mouse, touch, gamepad (stub) → satu ControlInput
  systems/           logika murni (flight, boost, collision, course, mission, scoring, hints, floating origin)
                     + runtime (state per-frame mutable), simulation, GameLoop (satu useFrame)
  entities/          Ship, Earth, Moon, Sun, Rings, EnergyStars, Asteroids
  scenes/            SpaceScene, langit berlapis, debu, speed lines, efek, kualitas, preloader + bake GPU
  audio/             sintesis prosedural + manajer Howler
  ui/                loading, menu, HUD, pause, hasil, kontrol sentuh
```

Prinsip penting:

- **State machine** `boot → loading → menu → playing ⇄ paused → result` (`game/systems/stateMachine.ts`).
- **Satu loop per frame** (`GameLoop`, prioritas -1): input → terbang → tabrakan → misi → kamera → transform → HUD.
  Tidak ada alokasi objek dan tidak ada `setState` React per frame; HUD menulis langsung ke DOM.
- **Floating origin**: posisi gameplay disimpan dalam koordinat semesta (float64 di CPU); render
  dikurangi `origin` yang di-*rebase* saat pesawat menjauh (`WORLD.floatingOriginThreshold`).
- **Skala artistik**: Bumi berjari-jari 200 u; fakta nyata hanya ditampilkan sebagai teks.
- **Kualitas otomatis**: `PerformanceMonitor` menurunkan/menaikkan tier (bloom, partikel, detail planet);
  tier mengatur `performance.max` yang diubah `AdaptiveDpr` menjadi resolusi render.
- **Dev only**: `window.__game` (runtime, store, config) dan `window.__game.r3f()` untuk debugging/tuning.

## Uji manual Fase 1

**Desktop (Chrome/Edge/Firefox/Safari terbaru)**

1. Buka halaman → layar loading (progress + fakta) → title screen 3D (pesawat di depan Bumi).
2. Klik **Mulai Misi** → musik mulai, kamera transisi ke belakang pesawat, hitung mundur 3-2-1-GO.
3. Gerakkan mouse → pesawat mengikuti kursor; muncul petunjuk kontekstual (mouse, W, turbo, dst.).
4. Tahan **W**, **Shift** untuk turbo (FOV melebar, speed lines, suara whoosh), **C** untuk kokpit.
5. Lewati 12 cincin (chime nadanya naik tiap cincin); ambil bintang energi; tabrak asteroid → terpental,
   layar bergetar, turbo berkurang (tidak ada game over).
6. Di sisi malam Bumi terlihat lampu kota, lalu matahari terbit menjelang cincin terakhir.
7. Layar hasil: bintang 1–3, waktu, rekor baru → **Ulangi** / **Menu**. Rekor tetap ada setelah reload.
8. **Esc** saat bermain → menu jeda; pindah tab → otomatis jeda.
9. **Terbang Bebas** → penunjuk ke Bulan; jauh dari Bumi → penunjuk kembali ke Bumi.

**HP (Android Chrome / iOS Safari, landscape)**

1. Posisi tegak → muncul ajakan memutar HP. Landscape → title screen.
2. **Mulai Misi** → (Android) layar penuh + kunci landscape.
3. Joystick muncul di tempat jempol kiri menyentuh; tuas gas kanan; tombol TURBO dengan cincin energi;
   tombol kamera di kanan atas. Getar saat lewat cincin/tabrakan (Android).
4. Petunjuk di HP memakai teks khusus sentuh.

## Pengujian otomatis

`npm run test` mencakup skor & rating bintang, timer misi (termasuk saat jeda), state machine, energi
turbo, model terbang & auto-level, tabrakan, generator lintasan (deteksi lewat cincin tanpa *tunnelling*),
hint onboarding, penggabungan progres, sinkronisasi kamus i18n, dan **uji keseimbangan**: autopilot
menerbangkan lintasan asli dengan model terbang asli untuk menjaga ambang bintang tetap masuk akal.
