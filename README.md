# Assetra

Assetra adalah PWA manajemen aset perusahaan untuk inventaris, QR Code, peminjaman, perpindahan, maintenance, audit online/offline, notifikasi, dashboard, dan laporan.

## Menjalankan dengan Docker

1. Sesuaikan nilai pada `.env`, terutama seluruh secret dan password untuk produksi.
2. Jalankan `docker compose up --build`.
3. Buka `http://localhost:8088` dan masuk dengan akun seed `admin@assetra.id` / `Assetra123!`.
4. Dokumentasi API tersedia di `http://localhost:8088/docs`.

PostgreSQL, Redis, MinIO, API, worker, web, dan Nginx akan dijalankan bersama. MinIO Console tersedia di `http://localhost:9002`. Port host dapat diubah melalui `ASSETRA_HTTP_PORT` dan `MINIO_CONSOLE_PORT` pada `.env`.

## Pengembangan lokal

Gunakan Node.js 22 dan pnpm. Jalankan `pnpm install`, `pnpm db:generate`, lalu `pnpm dev`. Untuk menjalankan web/API di host tanpa Docker, ubah hostname PostgreSQL, Redis, MinIO, dan URL publik di `.env` menjadi `localhost`.

## Struktur

- `apps/web`: Next.js PWA berbahasa Indonesia.
- `apps/api`: NestJS REST API, Prisma, Swagger, QR, PDF, dan Excel.
- `apps/worker`: antrean notifikasi berbasis BullMQ/Redis.
- `nginx`: reverse proxy untuk deployment lokal/VPS.

## Pemeriksaan

- `pnpm build`: build seluruh workspace.
- `pnpm test`: unit test aturan bisnis.
- `pnpm --filter @assetra/api prisma:migrate`: terapkan migration database.
- `pnpm db:seed`: buat role, permission, master data, Super Admin, dan aset demo.

Untuk produksi, gunakan HTTPS valid agar kamera dan service worker tersedia, ubah semua credential bawaan, konfigurasi SMTP bila email diperlukan, dan siapkan backup volume PostgreSQL serta MinIO.
