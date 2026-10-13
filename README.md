# Jelajah Angkasa 3D

Game web 3D eksplorasi luar angkasa yang langsung jalan di browser (desktop & HP) tanpa install.
Spesifikasi lengkap ada di [`PRD.md`](PRD.md); daftar aset dan lisensi di [`ASSETS.md`](ASSETS.md).

**Tekstur planet:** [Solar System Scope](https://www.solarsystemscope.com/textures/), lisensi
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (dikonversi ke WebP; detail di `ASSETS.md`).

**Bahasa UI default:** English (`DEFAULT_LOCALE` di `game/i18n/types.ts`); kamus Indonesia tetap lengkap.

**Status:** Fase 3 (Petualangan, Progres & Akun) selesai.
- **Fase 1:** terbang, misi *Cincin Orbit*, menu/HUD, onboarding, audio, kualitas otomatis.
- **Fase 2:** peta Tata Surya + warp, orbit, Ensiklopedia, pendaratan di Bulan/Mars, Hangar.
- **Fase 3:**
  - 7 misi di 5 rute: orbit Bumi, stasiun luar angkasa, Jupiter, sabuk asteroid (Ceres), cincin Saturnus.
  - Mode Foto + Galeri.
  - Unlock berbasis bintang dan 11 lencana.
  - Akun opsional (Supabase) dengan sinkronisasi progres antar perangkat.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3001 (port 3001 dipakai `dev` dan `start`; 3000 sering dipakai proyek lain). Butuh Node.js ≥ 20.9 dan browser dengan WebGL2.

| Skrip               | Fungsi                                             |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Server pengembangan (Turbopack)                    |
| `npm run build`     | Build produksi                                     |
| `npm run typecheck` | Generate tipe rute Next + `tsc --noEmit`           |
| `npm run lint`      | ESLint (aturan Next + React Hooks)                 |
| `npm run test`      | Vitest untuk logika murni                          |
| `npm run check`     | typecheck + lint + test                            |

### Akun (opsional, Supabase)

Tanpa konfigurasi, game berjalan sebagai tamu dan progres tersimpan di perangkat. Untuk mengaktifkan akun:

1. Buat project di [supabase.com](https://supabase.com).
2. Jalankan `supabase/migrations/20261013000000_player_progress.sql` di SQL Editor (atau `supabase db push`).
   Tabel `player_progress` memakai Row Level Security: setiap pemain hanya bisa membaca/menulis barisnya sendiri.
3. **Authentication → Providers**: aktifkan *Email* (magic link) dan *Google* (Client ID + Secret dari Google Cloud
   Console; redirect URI dari halaman provider Supabase).
4. **Authentication → URL Configuration**: isi *Site URL* dan tambahkan URL game (mis. `http://localhost:3001`) ke
   *Redirect URLs*.
5. Salin `.env.example` ke `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (Project Settings → API), lalu restart `npm run dev`. Nilai `NEXT_PUBLIC_` di-*inline* saat build.

Saat login pertama, progres tamu digabung ke akun (rekor terbaik, bintang, penemuan, lencana; loadout pesawat
yang paling baru menang). Setelah itu progres diunggah otomatis ±2,5 detik setelah berubah dan ditarik ulang saat
tab kembali aktif. Suara dan bahasa tetap per perangkat.

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
| Tab | Tombol peta | Peta Tata Surya → warp (hanya Terbang Bebas, tidak saat di permukaan) |
| F | Tombol **Orbit** (muncul saat dekat planet) | Masuk/keluar orbit + kartu info planet |
| L | Tombol **Mendarat / Lepas landas** | Mendarat di Bulan/Mars; planet lain menjelaskan kenapa tidak bisa |
| V | Tombol **kamera foto** (kanan atas) | Mode foto: seret = lihat sekeliling, scroll/cubit = jarak kamera, Spasi = jepret, H = sembunyikan kontrol |

## Arsitektur singkat

```
app/                 layout (metadata SEO), page (shell server), opengraph-image, icon
game/
  GameRoot.tsx       next/dynamic(ssr:false) → GameApp (Canvas + lapisan UI)
  config/            SEMUA angka tuning (terbang, kamera, misi, kualitas, audio, HUD, visual)
  data/              planets.ts (Matahari, 8 planet, Bulan: fakta EN/ID), solarSystem.ts (tata letak peta & cahaya),
                     surfaces.ts (lokasi pendaratan & tempat menarik), ships.ts (4 pesawat + palet), missions.ts (rute,
                     misi, lintasan), station.ts, photoTargets.ts, unlocks.ts, badges.ts, facts.ts
  i18n/              en (default, sumber tipe kamus) + id, t() bertipe; metadata/OG ikut DEFAULT_LOCALE
  stores/            Zustand: game (state machine), session (UI misi), progress (persist), quality, loading, asset,
                     ui (overlay), photo (mode foto + galeri), account
  controls/          keyboard+mouse, touch, gamepad (stub) → satu ControlInput
  systems/           logika murni (flight, boost, collision, course, mission, scoring, hints, floating origin,
                     environment, warp, orbit, discovery, landing, terrain, shipConfig, objectives, photo, unlocks,
                     badges, scenery, station, autopilot untuk uji keseimbangan, account/merge+sync)
                     + runtime (state per-frame mutable), simulation, landingFlow/orbitControl, GameLoop (satu useFrame)
  entities/          ship/, planet/ (PlanetBody, SunBody, atmosfer, tekstur on-demand), surface/ (properti lokasi),
                     Earth, Moon, Sun, Rings, EnergyStars, Asteroids
  scenes/            SpaceScene, surface/ (medan + langit Bulan/Mars), warp tunnel, langit berlapis, debu, efek,
                     kualitas, preloader + bake GPU
  audio/             sintesis prosedural + manajer Howler
  ui/                loading, menu, HUD, pause, hasil, kontrol sentuh, map/, hangar/, encyclopedia/, missions/,
                     photo/, gallery/, badges/, account/
supabase/migrations/ skema tabel progres + RLS
```

Prinsip penting:

- **State machine** `boot → loading → menu ⇄ hangar → playing ⇄ paused / map → result` (`game/systems/stateMachine.ts`).
- **Lokasi = scene sendiri**: tiap tujuan warp (Matahari + 8 planet) dimuat sebagai scene terpisah; Bulan ada di
  lokasi Bumi. Permukaan Bulan/Mars adalah scene kecil terpisah (bukan pendaratan mulus) di balik fade.
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

## Uji manual Fase 2

**Desktop**

1. Title → **Hangar**: pilih 4 pesawat (statistik berubah), ganti warna badan/aksen, decal, warna jejak mesin;
   seret untuk memutar 360°. **Uji Terbang** → 45 detik terbang → kembali ke Hangar. Pilihan tetap setelah reload.
2. **Terbang Bebas** → dekati Bulan → banner "Moon discovered!"; tekan **F** → orbit sinematik + kartu info;
   **F** lagi untuk keluar.
3. Dekat Bulan tekan **L** → turun (guncangan), layar gelap, muncul Laut Ketenangan dan pesawat mendarat pelan di
   landasan lalu diam. Tahan **W** untuk terbang ke pilar hijau: situs Apollo 11 (pendarat + bendera), kawah, dan
   titik Earthrise (Bumi terlihat di langit hitam). Tiap situs memunculkan kartu fakta; objektif di atas menghitung
   situs. **L** → lepas landas, langsung mengorbit Bulan di atas titik tempat kamu turun (**F** untuk keluar orbit).
4. **Tab** → peta Tata Surya → pilih Mars → **Warp** (terowongan warp) → tiba di Mars. **L** → masuk atmosfer
   (pinggir layar menyala oranye) → Kawah Jezero dengan langit Mars: Perseverance, Ingenuity, delta sungai.
5. Warp ke Jupiter/Saturnus/Venus/Matahari, dekati, tekan **L** → kartu penjelasan ilmiah kenapa tidak bisa mendarat.
6. Menu/Jeda → **Encyclopedia**: entri terbuka sesuai planet yang sudah ditemukan; sisanya terkunci.

**HP (landscape)**

1. Hangar bisa digulir; tombol cukup besar; seret untuk memutar pesawat.
2. Saat Terbang Bebas ada tombol peta (kanan atas); tombol **Orbit**, **Mendarat** dan **Lepas landas** muncul di
   tengah bawah saat relevan.
3. Kartu info/fakta muncul di kiri atas tanpa menutupi joystick dan tuas gas.

## Uji manual Fase 3

**Desktop**

1. Title → **Missions**: 7 misi dikelompokkan per rute; misi yang terkunci menunjukkan bintang yang dibutuhkan.
   Selesaikan *Orbit Rings* → layar hasil menampilkan **New unlocks!** (mis. *Station Delivery*, pesawat *Swift*)
   dan toast **Badge earned!** di kiri bawah.
2. *Station Delivery*: terbang menabrak kontainer oranye (tergantung di bawah pesawat), bawa melewati cincin dok
   stasiun yang menyala emas; ulangi 3×.
3. *Storm Portrait*: buka mode foto (**V**), arahkan ke Bintik Merah Besar; meter **Framing** dan bintang berubah
   langsung. **Spasi** untuk jepret → hasil misi + foto di layar hasil. Coba filter (Vivid, Mono, …).
4. *Belt Slalom* / *Crystal Hunt* di sabuk asteroid Ceres; *Ring Run* tepat di atas cincin Saturnus (auto-level
   menjadikan cincin sebagai "lantai"); *Ringed Giant* memotret seluruh Saturnus.
5. **Gallery** (title/jeda): lihat, unduh, bagikan (jika browser mendukung), hapus foto (ketuk dua kali).
6. **Badges** (title/jeda): 11 lencana; yang sudah didapat menyala.
7. **Hangar**: pesawat, warna, decal, dan jejak mesin yang terkunci memakai gembok + jumlah bintang.
8. **Akun** (ikon orang di kanan atas title): tanpa konfigurasi muncul penjelasan; dengan Supabase → *Continue with
   Google* atau link email → status sinkron. Login di perangkat lain → bintang/lencana/pesawat ikut.

**HP (landscape)**

1. Tombol kamera foto di kanan atas HUD; di mode foto: seret untuk melihat, cubit untuk jarak, tombol rana bulat.
2. Toast lencana tidak menutupi judul/HUD; layar Misi, Galeri, Lencana, dan Akun bisa digulir.

## Pengujian otomatis

`npm run test` mencakup skor & rating bintang, timer misi (termasuk saat jeda), state machine, energi
turbo, model terbang & auto-level, tabrakan, generator lintasan (deteksi lewat cincin tanpa *tunnelling*),
hint onboarding, penggabungan progres, sinkronisasi kamus i18n, dan **uji keseimbangan**: autopilot
menerbangkan lintasan asli dengan model terbang asli untuk menjaga ambang bintang tetap masuk akal.
Fase 2 menambah uji warp, orbit, penemuan planet, lingkungan per lokasi, konfigurasi pesawat, urutan
pendaratan/lepas landas, dan medan (deterministik, landasan datar, bukit di tepi peta).

Fase 3 menambah:
- **Uji keseimbangan semua misi:** autopilot menerbangkan setiap misi dengan setiap pesawat. Pilot rapi mendapat
  2★, dan 3★ butuh turbo.
- **Uji tata letak:** batu, kristal, kontainer, dan stasiun.
- **Uji logika:** skor foto, matriks filter, unlock, lencana, penggabungan progres tamu/akun, dan sinkronisasi
  (dengan penyimpanan palsu).

Pemeriksaan visual dilakukan dengan Playwright (devDependency) terhadap build produksi yang dibuat dengan
`NEXT_PUBLIC_E2E=1`: flag itu mengaktifkan `window.__game` di build produksi supaya skrip bisa memajukan
simulasi secara deterministik (`frameloop="never"` + `advance`).
