# Jelajah Angkasa 3D

Game web 3D eksplorasi luar angkasa yang langsung jalan di browser (desktop & HP). Lihat `PRD.md` untuk spesifikasi lengkap.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Skrip

| Skrip               | Fungsi                                   |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Server pengembangan (Turbopack)          |
| `npm run build`     | Build produksi                           |
| `npm run typecheck` | Generate tipe rute + `tsc --noEmit`      |
| `npm run lint`      | ESLint                                   |
| `npm run test`      | Unit test (Vitest) untuk logika murni    |
| `npm run check`     | typecheck + lint + test                  |
