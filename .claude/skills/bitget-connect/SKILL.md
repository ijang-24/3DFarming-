---
name: bitget-connect
description: Hubungkan atau diagnosis Bitget UTA v3 melalui MCP Claude Code dan SDK Node proyek ini. Gunakan untuk setup Bitget, discovery schema, data pasar, pemeriksaan akun read-only, dan preview order tanpa eksekusi; bukan strategi atau otorisasi trading.
---

# Bitget Connect

Baca [setup](references/setup.md) untuk koneksi, [arsitektur](references/architecture.md) sebelum integrasi aplikasi, [safety](references/safety.md) sebelum kredensial/preview, [discovery](references/discovery.md) sebelum menyusun parameter. Versi dan cakupan Academy: [sources](references/sources.md).

1. Periksa `package.json`, lockfile, runtime, konfigurasi MCP yang sudah ada. Jangan timpa server lain. Paket resmi dipin 3.3.1; jangan memasang paket Academy lama atau `all`.
2. Mulai public tanpa kredensial. `npm run bitget:validate`, `npm run bitget:typecheck`, `npm run bitget:test`. Tes mock bukan koneksi exchange.
3. Eksekusi paket eksternal tetap membutuhkan izin lingkungan. Aktivasi `.mcp.json` dan uji jaringan pada audit ini BLOCKED. Jangan mengakali penolakan lewat shell, tes, atau agent lain.
4. Setelah izin tersedia: `npm run bitget:mcp` menguji handshake/discovery lokal; `npm run bitget:check` discovery SDK lokal; `npm run bitget:check -- --public` menguji API nyata. Simpan timestamp, kategori, simbol, status. Narasi bukan bukti.
5. Discovery MCP: `discover({})`, `discover({tool:"market",action:"instruments"})`. Ikuti schema versi terpasang; jangan campur V2/V3. `raw` bukan jalan pintas untuk melewati batas read-only.
6. Account hanya setelah pengguna meminta, ketiga variabel present, key dedicated read-only/IP benar: `npm run bitget:check -- --account`. Jangan tampilkan secret/account payload di terminal. Cocokkan nilai secara privat dengan UI Bitget.
7. Preview opsional `npm run bitget:check -- --preview path/to/order.json`. Ini LOCAL_PREVIEW, bukan validasi precision/minimum exchange, bukan order terkirim. Tanpa metadata aktual, mode akun, risk review, dan persetujuan per-order: tidak execution-ready.

Dilarang mengirim/mengubah/membatalkan order, posisi, leverage, margin mode, transfer, withdrawal dalam setup ini. Jangan menambahkan auto-trade atau strategi baru. Jangan memanggil tool OAuth secara otomatis. Tidak ada blanket approval.

Laporan selalu pisahkan PASS / FAIL / NOT RUN / BLOCKED; public/API, private, demo, mock, preview, dan handshake bukan hal yang sama.
