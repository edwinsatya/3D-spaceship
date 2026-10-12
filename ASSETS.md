# Aset — Jelajah Angkasa 3D

Fase 1 dan 2 berjalan **100% dengan aset prosedural**: tidak ada file 3D, tekstur, atau audio pihak
ketiga yang dikirim, jadi tidak ada kewajiban atribusi untuk build saat ini. Semua slot sudah siap
diganti file asli tanpa mengubah komponen.

## Yang dipakai sekarang (prosedural)

| Aset | Dibuat di | Catatan |
| --- | --- | --- |
| Pesawat low-poly | `game/entities/ship/shipGeometry.ts` | Lathe + extrude three.js, warna via props (siap kustomisasi Fase 2) |
| Tekstur Bumi (siang + laut, malam + awan) | `game/scenes/procedural/planetBakes.ts` | Di-*bake* sekali di GPU saat loading (2048×1024 desktop, 1024×512 HP) |
| Tekstur Bulan (kawah) | `game/scenes/procedural/planetBakes.ts` | Dipakai juga sebagai bump map |
| Tekstur Matahari & 7 planet lain + cincin | `game/scenes/procedural/surfaceBakes.ts` | Di-*bake* saat lokasinya dimuat, dilepas saat pergi (Bumi/Bulan tetap di memori) |
| 4 pesawat Hangar | `game/data/ships.ts` → `shipGeometry.ts` | Desain parametrik (badan, sayap, mesin, decal) |
| Medan Bulan & Mars | `game/systems/terrain.ts` + `game/scenes/surface/terrainMesh.ts` | Heightfield deterministik (noise, kawah, bukit), warna per-vertex, batu *instanced* |
| Pendarat Apollo 11 + bendera, Perseverance, Ingenuity | `game/entities/surface/SurfaceProps.tsx` | Model primitif low-poly; bendera digambar di canvas |
| Langit Mars & Bumi di langit Bulan | `game/scenes/surface/SurfaceScene.tsx` | Shader gradien + halo matahari; Bumi memakai tekstur siang hasil bake |
| Langit (nebula, galaksi, Bima Sakti, bintang jauh) | `game/scenes/procedural/skyBake.ts` | Cube map 1024² (512² di tier rendah) |
| Efek suara + musik ambient | `game/audio/synth.ts` | Disintesis jadi WAV saat loading, diputar lewat Howler |
| Font Orbitron & Exo 2 | `app/layout.tsx` (`next/font/google`) | SIL Open Font License 1.1, di-*self-host* oleh Next saat build |

## Slot untuk aset asli

| Slot | Tempat mengisi | Format yang disarankan |
| --- | --- | --- |
| Model pesawat | `SHIP_ASSETS.modelUrl` di `game/config/assets.ts` | `.glb` dengan Draco atau Meshopt (`gltf-transform optimize`) |
| Pendarat, rover, helikopter | `SURFACE_PROP_ASSETS` di `game/config/assets.ts` | `.glb` terkompresi; atur `scale` ke meter |
| Tekstur planet | `textures` per planet di `game/data/planets.ts` (`day`, `night`, `clouds`, `color`) | `.ktx2` (UASTC/ETC1S via `toktx` atau `gltf-transform`), fallback `.jpg/.webp` |
| Audio | `AUDIO_FILES` di `game/audio/audioManager.ts` | `.ogg` + `.m4a`/`.mp3`, ≤ 200 KB per efek |

**Penting untuk KTX2:** salin transcoder Basis ke `public/basis/`:

```bash
cp -r node_modules/three/examples/jsm/libs/basis public/basis
```

**Catatan kanal tekstur Bumi** (agar cocok dengan shader):
- `day`: RGB = warna permukaan (sRGB), **A = mask laut** (1 = laut) untuk kilau matahari.
- `night`: **R = lampu kota**, **G = awan**. Tekstur NASA terpisah perlu digabung dulu (mis. dengan script Sharp/ImageMagick).

## Sumber yang direkomendasikan

| Kebutuhan | Sumber | Lisensi | Kewajiban |
| --- | --- | --- | --- |
| Pesawat 3D | [Kenney — Space Kit](https://kenney.nl/assets/space-kit) | CC0 1.0 | Tidak ada (kredit opsional) |
| Pesawat 3D | [Quaternius — Ultimate Spaceships](https://quaternius.com/packs/ultimatespaceships.html) | CC0 1.0 | Tidak ada (kredit opsional) |
| Tekstur Bumi, Bulan, planet lain (Fase 2) | [Solar System Scope — Textures](https://www.solarsystemscope.com/textures/) | CC BY 4.0 | **Wajib atribusi** di halaman kredit |
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
- Tekstur per planet di-*bake*/dimuat per scene dan dilepas saat pindah lokasi; target ≤ 1,5 MB KTX2 per planet
  saat tekstur asli dipakai.
- Model pesawat ≤ 300 KB per GLB terkompresi.
