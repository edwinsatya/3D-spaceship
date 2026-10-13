# Aset — Jelajah Angkasa 3D

Satu-satunya aset pihak ketiga yang dikirim adalah **tekstur planet dari Solar System Scope (CC BY 4.0,
wajib atribusi)**. Sisanya (pesawat, medan, langit, suara) masih prosedural, dan semua slot siap diganti file
asli tanpa mengubah komponen.

## Aset pihak ketiga yang dipakai

| Aset | Sumber | Lisensi | Atribusi |
| --- | --- | --- | --- |
| Tekstur Matahari, 8 planet, Bulan, cincin Saturnus (2K) | [Solar System Scope — Textures](https://www.solarsystemscope.com/textures/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Baris kredit di title screen (`menu.textureCredit`); halaman kredit lengkap di Fase 4 |

File asli diunduh 2026-10-13 (14 file, ±6,6 MB JPG/TIF/PNG), lalu **dimodifikasi**: dikonversi ke WebP
(±2,0 MB) dan, untuk Bumi, kanalnya digabung di GPU saat runtime. Hasilnya ada di `public/textures/`:

| File | Asal | Konversi (`cwebp -m 6`) |
| --- | --- | --- |
| `sun.webp` | `2k_sun.jpg` | `-q 78` |
| `mercury.webp`, `mars.webp`, `moon.webp` | `2k_mercury.jpg`, `2k_mars.jpg`, `2k_moon.jpg` | `-q 80` |
| `venus-clouds.webp` | `2k_venus_atmosphere.jpg` | `-q 80` |
| `earth-day.webp` | `2k_earth_daymap.jpg` | `-q 82` |
| `earth-lights.webp` | `2k_earth_nightmap.jpg` | `-q 80` |
| `earth-clouds.webp` | `2k_earth_clouds.jpg` | `-q 75` |
| `earth-ocean.webp` | `2k_earth_specular_map.tif` | `-q 60` |
| `jupiter.webp`, `saturn.webp`, `uranus.webp`, `neptune.webp` | `2k_<planet>.jpg` | `-q 82` |
| `saturn-rings.webp` | `2k_saturn_ring_alpha.png` | `-lossless -exact` (alpha dipertahankan) |

Cara pakai di game: tekstur prosedural tetap di-*bake* duluan (game tidak menunggu jaringan), lalu file
menggantikannya begitu selesai dimuat. Kalau file gagal dimuat, tekstur prosedural tetap dipakai.

## Prosedural (dibuat di kode)

| Aset | Dibuat di | Catatan |
| --- | --- | --- |
| Pesawat low-poly | `game/entities/ship/shipGeometry.ts` | Lathe + extrude three.js, warna via props (siap kustomisasi Fase 2) |
| Tekstur Bumi (siang + laut, malam + awan) | `game/scenes/procedural/planetBakes.ts` | Placeholder saat loading (2048×1024 desktop, 1024×512 HP) sampai file asli termuat |
| Tekstur Bulan (kawah) | `game/scenes/procedural/planetBakes.ts` | Placeholder; file asli juga dipakai sebagai bump map |
| Tekstur Matahari & 7 planet lain + cincin | `game/scenes/procedural/surfaceBakes.ts` | Placeholder saat lokasi dimuat (Matahari: plasma animasi dicampur foto); dilepas saat pergi, Bumi/Bulan tetap di memori |
| 4 pesawat Hangar | `game/data/ships.ts` → `shipGeometry.ts` | Desain parametrik (badan, sayap, mesin, decal) |
| Medan Bulan & Mars | `game/systems/terrain.ts` + `game/scenes/surface/terrainMesh.ts` | Heightfield deterministik (noise, kawah, bukit), warna per-vertex, batu *instanced* |
| Pendarat Apollo 11 + bendera, Perseverance, Ingenuity | `game/entities/surface/SurfaceProps.tsx` | Model primitif low-poly; bendera digambar di canvas |
| Langit Mars & Bumi di langit Bulan | `game/scenes/surface/SurfaceScene.tsx` | Shader gradien + halo matahari; Bumi memakai tekstur siang hasil bake |
| Stasiun orbit (rangka, modul, panel surya, cincin dok) | `game/entities/Station.tsx` | Primitif three.js; panel surya dari tekstur canvas |
| Kristal, kontainer kargo, sabuk asteroid, batu cincin Saturnus | `game/entities/MissionProps.tsx`, `game/systems/scenery.ts` | Prosedural, deterministik |
| Ceres | `game/scenes/procedural/surfaceBakes.ts` (tipe *rocky*) | Belum ada tekstur asli (Solar System Scope menyediakan versi fiktif saja) |
| Langit (nebula, galaksi, Bima Sakti, bintang jauh) | `game/scenes/procedural/skyBake.ts` | Cube map 1024² (512² di tier rendah) |
| Efek suara + musik ambient | `game/audio/synth.ts` | Disintesis jadi WAV saat loading, diputar lewat Howler |
| Font Orbitron & Exo 2 | `app/layout.tsx` (`next/font/google`) | SIL Open Font License 1.1, di-*self-host* oleh Next saat build |

## Slot untuk aset asli

| Slot | Tempat mengisi | Format yang disarankan |
| --- | --- | --- |
| Model pesawat | `SHIP_ASSETS.modelUrl` di `game/config/assets.ts` | `.glb` dengan Draco atau Meshopt (`gltf-transform optimize`) |
| Pendarat, rover, helikopter | `SURFACE_PROP_ASSETS` di `game/config/assets.ts` | `.glb` terkompresi; atur `scale` ke meter |
| Tekstur planet | `textures` per planet di `game/data/planets.ts` (Bumi: `day`, `ocean`, `night`, `clouds`; lainnya `color`; Saturnus juga `rings`) | Sekarang `.webp`; `.ktx2` juga didukung loader (butuh `toktx`, belum terpasang) |
| Audio | `AUDIO_FILES` di `game/audio/audioManager.ts` | `.ogg` + `.m4a`/`.mp3`, ≤ 200 KB per efek |

**Penting untuk KTX2:** salin transcoder Basis ke `public/basis/`:

```bash
cp -r node_modules/three/examples/jsm/libs/basis public/basis
```

**Catatan kanal tekstur Bumi:** file Bumi dipasok terpisah lalu digabung di GPU (`packEarthDay` /
`packEarthNight` di `game/scenes/procedural/planetBakes.ts`) menjadi format yang dipakai shader:
- peta siang: RGB = warna permukaan (sRGB), **A = masker laut** (dari `ocean`, putih = laut) untuk kilau matahari;
- peta malam: **R = lampu kota** (luminans `night`), **G = awan** (dari `clouds`).

## Sumber yang direkomendasikan

| Kebutuhan | Sumber | Lisensi | Kewajiban |
| --- | --- | --- | --- |
| Pesawat 3D | [Kenney — Space Kit](https://kenney.nl/assets/space-kit) | CC0 1.0 | Tidak ada (kredit opsional) |
| Pesawat 3D | [Quaternius — Ultimate Spaceships](https://quaternius.com/packs/ultimatespaceships.html) | CC0 1.0 | Tidak ada (kredit opsional) |
| Tekstur Bumi, Bulan, planet lain (**dipakai**) | [Solar System Scope — Textures](https://www.solarsystemscope.com/textures/) | CC BY 4.0 | **Wajib atribusi** (sudah di title screen) |
| Bumi siang (Blue Marble) | [NASA Visible Earth](https://visibleearth.nasa.gov/collection/1484/blue-marble) | Citra NASA (umumnya bebas hak cipta) | Ikuti [NASA Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) |
| Bumi malam (Black Marble) | [NASA Earth Observatory — Night Lights](https://earthobservatory.nasa.gov/features/NightLights) | Citra NASA | Idem |
| Bulan | [NASA SVS — CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | Citra NASA | Idem |
| Langit berbintang | [NASA SVS — Deep Star Maps](https://svs.gsfc.nasa.gov/4851) | Citra NASA | Idem |
| Efek suara | [Kenney — Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0 1.0 | Tidak ada |
| Apollo LM, Perseverance, Ingenuity (GLB) | [NASA Science — 3D Resources](https://science.nasa.gov/3d-resources/) | Media NASA | Ikuti NASA Media Usage Guidelines; cek catatan tiap model |

Saat aset berlisensi atribusi (CC BY) dipakai, tambahkan ke halaman kredit aset (dijadwalkan di Fase 4)
dan ke tabel di atas.

## Anggaran ukuran (target interaktif < 5 detik di 4G)

- JS awal saat ini: ~590 KB gzip (three.js + R3F + drei + postprocessing + UI).
- Tekstur planet: total 2,0 MB WebP, dimuat per lokasi dan dilepas saat pindah. Lokasi Bumi (siang, laut,
  lampu kota, awan, Bulan) ±1,1 MB dan dimuat di belakang layar setelah loading selesai.
- Model pesawat ≤ 300 KB per GLB terkompresi.
