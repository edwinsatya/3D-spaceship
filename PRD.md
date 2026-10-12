# PERAN

Kamu adalah senior web game developer & game designer, ahli Three.js/React Three Fiber, game feel, dan optimasi WebGL. Bangun game berikut dengan kualitas production, bertahap per fase.

# PROYEK: Jelajah Angkasa 3D

Game web 3D eksplorasi luar angkasa yang langsung jalan di browser (desktop & HP/mobile) tanpa install. Pemain menerbangkan pesawat, menjelajahi tata surya, menyelesaikan misi, dan mengoleksi pengetahuan tentang planet.

- Target pemain: casual, semua umur (8+), sesi 5–15 menit.
- Bahasa UI: Indonesia (siapkan struktur i18n untuk English).
- Core loop: Terbang → Temukan → Selesaikan misi → Dapat bintang → Buka pesawat/warna baru → Terbang lagi.
- Gaya visual: stylized-sinematik — pesawat low-poly bersih dengan warna cerah & glow mesin, planet semi-realistis, UI futuristik yang tetap mudah dibaca.
- Pilar desain:
  1. Seru dalam 10 detik pertama: langsung terbang, tutorial menyatu dengan permainan.
  2. Kontrol arcade yang responsif, bukan simulator. Tidak ada game over: tabrakan = terpental + kehilangan boost.
  3. Rasa kagum: angkasa yang indah dan sinematik.
  4. Belajar sambil main: fakta planet akurat, disajikan singkat.

# TECH STACK

- Next.js (App Router) + TypeScript strict + Tailwind CSS
- three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- Zustand (state game, middleware persist untuk progres lokal)
- Howler.js (audio), Motion/Framer Motion (transisi UI)
- Collision sederhana (sphere/trigger check); @react-three/rapier hanya jika benar-benar perlu
- Fase 3: PostgreSQL + Auth via Supabase
- Canvas 3D dirender client-only; metadata SEO & OG image tetap dari server
- Pakai versi stabil terbaru semua library

# ARSITEKTUR & ATURAN KODE

- State machine game: boot → loading → menu → playing ⇄ paused → result
- Struktur: `app/`, `game/{scenes,entities,systems,controls,ui,stores,audio,config,data}`
- Input abstraction: keyboard+mouse, touch, gamepad (Fase 4) → satu objek input (pitch, yaw, roll, throttle, boost)
- Semua angka tuning (kecepatan, akselerasi, sensitivitas, durasi boost) di `game/config`, tanpa magic number
- Data planet (nama, fakta, ukuran, tekstur) di `game/data/planets.ts`, bukan di komponen
- Skala dunia artistik (dikompresi, bukan skala nyata) + floating origin agar tidak jitter di jarak jauh
- Di `useFrame`: jangan alokasi objek baru (reuse Vector3/Quaternion) dan jangan setState React per frame
- Aset: mulai dengan placeholder prosedural, tapi loader siap untuk GLB (Draco/Meshopt) & tekstur KTX2. Catat aset yang dibutuhkan + sumber & lisensinya di `ASSETS.md` (mis. Kenney/Quaternius CC0 untuk pesawat, tekstur planet NASA/Solar System Scope)
- Game otomatis pause saat tab tidak aktif

# ROADMAP

## FASE 1 — Core Loop (MVP yang sudah seru dimainkan)

1. Terbang Pesawat
   - Kontrol Kemudi: mouse = arah (pesawat mengikuti posisi kursor relatif ke tengah layar, ada reticle, tanpa pointer lock); A/D = roll dengan auto-level; tombol panah sebagai alternatif.
   - Atur Kecepatan: W/S = gas/rem, akselerasi dengan easing.
   - Pandangan Kokpit: tombol C untuk ganti kamera luar (chase cam dengan lag halus, default) ⇄ kokpit.
   - Boost/Turbo: Shift, energi terbatas yang terisi ulang, FOV melebar + speed lines.
   - Kontrol HP: joystick virtual (kiri), slider gas + tombol boost (kanan), mode landscape.
2. Pemandangan Angkasa
   - Langit Bintang 3D berlapis dengan parallax (bukan skybox datar saja).
   - Pemandangan Bumi: tekstur siang/malam, awan berputar, glow atmosfer (fresnel), Bulan di dekatnya.
   - Nebula & Galaksi: skybox + partikel ringan; Matahari sebagai sumber cahaya utama dengan bloom.
3. Misi Pertama "Cincin Orbit": lewati 12 cincin yang mengelilingi Bumi secepatnya. Timer, penunjuk arah ke cincin berikutnya, rating 1–3 bintang berdasarkan waktu, best time tersimpan. Ada bintang energi (isi boost) dan beberapa asteroid sebagai rintangan ringan.
4. Menu & HUD: title screen 3D (pesawat melayang di depan Bumi) dengan pilihan Mulai Misi / Terbang Bebas; loading screen dengan progress; menu pause; HUD (kecepatan, boost, objektif, timer, penunjuk target di luar layar); layar hasil misi.
5. Onboarding: petunjuk kontrol kontekstual yang muncul saat dibutuhkan di misi pertama (bukan teks panjang di awal), beda untuk desktop & HP.
6. Audio dasar: suara mesin (pitch mengikuti kecepatan), whoosh boost, chime saat melewati cincin, musik ambient, tombol mute. Audio di-unlock lewat klik tombol Mulai (aturan autoplay browser).
7. Kualitas otomatis: AdaptiveDpr + PerformanceMonitor (drei) yang menurunkan efek saat FPS turun.

Selesai jika: buka web → loading → Mulai → terbang → selesaikan Cincin Orbit → lihat skor → ulangi, lancar di desktop & HP mid-range.

## FASE 2 — Jelajah Planet & Hangar

1. Jelajah Planet (Matahari + 8 planet)
   - Peta Tata Surya + warp: pilih tujuan → efek terowongan warp → tiba di dekat planet.
   - Mengitari Planet: dekati lalu tekan F → orbit otomatis dengan kamera sinematik.
   - Kenali Tiap Planet: kartu info (ukuran, jarak dari Matahari, suhu, satu fakta unik). Kunjungan pertama → notifikasi "Planet Ditemukan!" + entri baru di Ensiklopedia (koleksi).
   - Turun ke Permukaan: hanya Bulan & Mars. Sekuens masuk atmosfer (panas, getaran, fade) → scene permukaan terpisah yang kecil (terrain low-poly + beberapa titik menarik) → lepas landas kembali. Bukan pendaratan seamless. Planet lain menampilkan alasan ilmiah kenapa tidak bisa didarati (mis. Jupiter tidak punya permukaan padat, suhu Venus ±460°C).
2. Pilih Pesawat (Hangar)
   - Galeri Pesawat 3D: 3–4 pesawat dengan stat berbeda (kecepatan, handling, boost).
   - Hias Warna & Bentuk: warna body & aksen, decal, warna jejak mesin.
   - Lihat Sebelum Terbang: turntable 360° + test flight singkat.
3. Progres lokal (Zustand persist): pesawat, kustomisasi, planet ditemukan, best time.

Selesai jika: pemain bisa warp ke semua planet, orbit, mendarat di Bulan/Mars, dan terbang dengan pesawat hasil kustomisasinya.

## FASE 3 — Petualangan, Progres & Akun

1. Petualangan Baru
   - Rute Baru: sabuk asteroid, cincin Saturnus, stasiun luar angkasa.
   - Misi Seru (bervariasi): balapan cincin, kumpulkan kristal, antar paket ke stasiun, misi foto (mis. "potret Bintik Merah Besar Jupiter"). Semua misi diberi rating 1–3 bintang.
   - Mode Foto & Galeri: bekukan dunia, kamera bebas, filter, sembunyikan HUD, simpan ke galeri lokal, download/share (Web Share API).
2. Progres & Unlock: total bintang membuka pesawat, warna, dan rute baru; lencana/achievement.
3. Akun (opsional, guest-first)
   - Semua bisa dimainkan tanpa akun; progres tersimpan lokal.
   - Daftar Akun / Masuk & Keluar: Google OAuth + magic link email. Saat login pertama, progres tamu digabung ke akun.
   - Simpan Pesawat Favorit: loadout tersinkron antar device.
   - (Opsional) Leaderboard waktu terbaik per rute, dengan validasi waktu di server.

Selesai jika: ada minimal 6 misi, sistem unlock berjalan, dan progres tersinkron setelah login di device lain.

## FASE 4 — Pengaturan, Suara & Polish

1. Pengaturan & Suara
   - Suara Mesin & audio: volume terpisah (master, musik, efek, mesin), suara mesin khas tiap pesawat.
   - Kualitas Tampilan: preset Rendah/Sedang/Tinggi/Auto (bloom, bayangan, partikel, resolusi) + FPS counter.
   - Panduan Kontrol: referensi lengkap per perangkat, remap tombol, sensitivitas, invert Y, gamepad, kemudi gyro di HP (opsional).
2. Aksesibilitas: mode kurangi gerakan (ikut prefers-reduced-motion: matikan shake & FOV kick), HUD ramah buta warna, ukuran teks.
3. Polish & rilis: bahasa English, PWA, analytics event (mulai main, tutorial selesai, misi selesai, durasi sesi), halaman kredit aset, OG image untuk share.

Selesai jika: semua pengaturan tersimpan dan langsung berlaku tanpa reload.

# GAME FEEL (berlaku di semua fase)

- Setiap aksi punya feedback: visual + suara (+ getar di HP yang mendukung).
- Kamera: lag halus, FOV naik saat boost, shake kecil saat tabrakan.
- Visual: debu angkasa/speed lines saat cepat, jejak mesin, bloom pada mesin & bintang.
- Transisi UI halus; angka skor dan timer beranimasi.

# NON-FUNGSIONAL

- 60 fps di desktop, ≥30 fps di HP mid-range.
- Interaktif dalam < 5 detik di koneksi 4G; aset tiap planet di-lazy-load.
- Instancing untuk asteroid & bintang, LOD untuk planet, dispose resource saat ganti scene.
- Browser: Chrome, Safari (iOS), Firefox, Edge terbaru; WebGL2 dengan pesan fallback yang ramah.
- Unit test (Vitest) untuk logika murni: skor, timer, rating bintang, unlock.

# DI LUAR CAKUPAN

Multiplayer real-time, fisika orbit realistis, skala tata surya nyata, VR, iklan/pembelian dalam game.

# CARA KERJA

1. Kerjakan FASE 1 saja. Jangan mulai fase berikutnya sebelum saya minta.
2. Sebelum coding, tampilkan rencana singkat: struktur folder, daftar komponen, store, dan keputusan teknis + alasannya.
3. Setiap satu fitur selesai: pastikan typecheck, lint, dan build lolos, lalu commit dengan pesan yang jelas.
4. Di akhir fase: ringkasan, cara test manual (desktop & HP), known issues, dan saran untuk fase berikutnya.
5. Untuk hal kecil yang ambigu, ambil keputusan paling masuk akal dan catat asumsinya; jangan berhenti hanya untuk bertanya.
