# AI Agent Farm

Dashboard agent AI berbentuk dunia pertanian 3D low-poly. React 19, TypeScript, React Three Fiber, Drei, Tailwind CSS 4, Vite. Seluruh objek 3D dibuat dari primitive geometry; tidak memerlukan model eksternal.

## Jalankan

Node.js 22.12+ atau 24 LTS.

```sh
npm install
npm run dev
```

Buka URL yang dicetak Vite, biasanya **http://localhost:5173**.

```sh
npm test           # Tes reducer simulasi dan validasi input backend
npm run build     # TypeScript + build produksi ke dist/
npm run preview   # Preview build produksi
```

Dev server mengikat `0.0.0.0` agar bisa diakses dari perangkat lokal. Untuk hanya komputer sendiri: `npm run dev -- --host 127.0.0.1`.

## Demo

- 5 agent awal: acong (coding), jugar (riset), oren (data), abu (monitoring), paramengeow (design).
- acong dan jugar bekerja; oren menunggu hasil jugar; abu memiliki error yang bisa dicoba ulang; paramengeow beristirahat.
- Tambah agent, beri tugas dengan dependensi opsional, pause, resume, cancel, coba ulang. Maksimal 12 agent demo.
- Tugas baru memulai perjalanan, lalu tanaman bertumbuh mengikuti progress. Penyelesaian mengirim petani membawa keranjang ke gudang, lalu pulang beristirahat.
- Klik petani atau sidebar untuk detail, progress, waktu mulai, log. Klik petak lahan atau tombol lahan pada detail tugas untuk proyek dan daftar agent.
- Farm tampil lebih luas; detail agent dibuka saat dipilih, activity feed awalnya dilipat. Feed memiliki timestamp; klik baris untuk memusatkan kamera.
- Waktu farm mengikuti **jam lokal perangkat**: pagi 05:00–10:59, siang 11:00–14:59, sore 15:00–17:59, malam 18:00–04:59. Jam diperiksa setiap 10 detik dan saat tab aktif kembali. Tidak ada siklus dipercepat atau pergantian manual. Pagi bercahaya hangat, sore keemasan; malam menampilkan bulan, bintang, jendela menyala, dan lentera. Tidak mengubah tugas agent. Kualitas rendah menampilkan lentera tanpa point light tambahan.
- Agent berbentuk **kucing low-poly**, dengan telinga, kumis, kaki berbulu, ekor bergerak, serta alat kerja. Avatar sidebar dan detail juga kucing.
- Lingkungan pesisir pegunungan: farm datar menyambung ke bukit, pantai, sungai berjembatan, dermaga dan mercusuar bercahaya malam. Hutan menggunakan instancing; tanpa dependency baru.
- Mouse: drag kiri untuk putar, scroll untuk zoom. Sentuh: satu jari putar, dua jari zoom. Pan dinonaktifkan; elevasi dan zoom dibatasi agar kamera tetap aman.
- Tombol kamera: zoom, putar 45°, reset. Pengaturan menyediakan 3 kualitas dan simulasi koneksi terputus. Label mengambang dan petunjuk viewport dihapus.
- WebGL tidak didukung atau context hilang: fallback 2D; seluruh kontrol tugas tetap bisa digunakan.
- Demo tidak menjalankan model AI atau tugas sungguhan. State berada di memori tab, dimulai ulang saat reload. Tab background memperlambat simulasi secara sengaja; progress bukan waktu kerja nyata.
- Font Google bersifat opsional; tanpa internet menggunakan sans-serif sistem.

## Struktur

| Lokasi | Fungsi |
| --- | --- |
| `src/types.ts` | Agent, task, activity, status, konfigurasi lahan |
| `src/state.ts` | Reducer simulasi dan transisi tugas |
| **`src/adapters.ts`** | Kontrak adapter, demo, WebSocket, validasi snapshot |
| `src/FarmScene.tsx` | Dunia 3D, primitive, karakter, animasi, kamera |
| `src/App.tsx` | Panel UI, form, kontrol, koneksi |
| `src/styles.css` | Layout responsif, Tailwind, visual identity |
| `src/state.test.ts` | Tes dengan Node test runner |

## Hubungkan agent nyata

Buka **Pengaturan farm → WebSocket URL → Hubungkan backend**. Gunakan `wss://` pada halaman HTTPS. Backend tidak disediakan; adapter siap dihubungkan ke server Anda. Data demo tidak pernah dicampur dengan snapshot live. Kembali ke demo membuat simulasi baru.

Browser mengirim saat koneksi dibuka:

```json
{ "type": "subscribe" }
```

Server mengirim snapshot penuh saat subscribe dan setiap status/log berubah. Urutan `tasks` **terbaru lebih dahulu**; task pertama milik agent adalah tugas yang ditampilkan. Task sebelumnya boleh disertakan untuk riwayat dan hitungan selesai. Hindari mengirim data rahasia dalam log.

```json
{
  "type": "snapshot",
  "data": {
    "agents": [
      {
        "id": "agent-001",
        "name": "Atlas",
        "role": "Coding",
        "color": "#2a78d6",
        "tool": "water",
        "plotId": "p1"
      }
    ],
    "tasks": [
      {
        "id": "task-001",
        "agentId": "agent-001",
        "title": "Implementasikan authentication API",
        "status": "running",
        "progress": 42,
        "startedAt": 1793534400000,
        "updatedAt": 1793534460000,
        "logs": [
          { "at": 1793534460000, "message": "Unit test authentication berjalan." }
        ]
      }
    ],
    "activities": [
      {
        "id": "event-001",
        "agentId": "agent-001",
        "at": 1793534460000,
        "message": "Atlas menjalankan unit test.",
        "kind": "info"
      }
    ]
  }
}
```

### Data yang dibutuhkan

- **Agent:** ID stabil, nama (1–32 karakter), peran (`Coding`, `Riset`, `Data`, `Monitoring`, `Design`), warna `#RRGGBB`, alat (`water`, `hoe`, `basket`, `rake`, `shovel`), lahan `p1`–`p6`.
- **Task:** ID unik, agentId valid, judul (1–160 karakter), status, waktu mulai dan update dalam Unix **milidetik**, log. `dependencyId` opsional untuk kebutuhan backend Anda.
- **Status task:** `walking`, `running`, `waiting`, `paused`, `completed`, `cancelled`, `error`. Agent tanpa task dianggap `idle`.
- **Progress:** angka `0`–`100` dari backend, atau `null` / field dihilangkan bila tidak tersedia. UI menulis **“Progress tidak tersedia”**; tidak mengarang estimasi. Tanaman hanya tumbuh bila ada progress backend.
- **Activity:** ID, agentId, timestamp milidetik, pesan (maks. 1000 karakter), kind (`info`, `success`, `error`). Kirim terbaru lebih dahulu.
- Batas validasi: 100 agent/snapshot, 10.000 task, 500 activity, 100 log/task, 2 MB/pesan. Dunia hanya memiliki 6 lahan; beberapa agent boleh berbagi lahan. Demo dirancang untuk 5–12 petani, bukan visualisasi ratusan agent.
- `elapsed` dan `duration` merupakan detail internal demo, tidak perlu dikirim oleh backend.

### Perintah browser ke backend

```json
{
  "type": "command",
  "requestId": "uuid-untuk-idempotensi",
  "command": { "type": "assign", "agentId": "agent-001", "title": "Perbaiki unit test", "dependencyId": "task-optional" }
}
```

Jenis command:

```ts
{ type: 'add', name: string, role: Role }
{ type: 'assign', agentId: string, title: string, dependencyId?: string }
{ type: 'pause' | 'resume' | 'cancel' | 'retry', agentId: string }
```

Server harus mengautentikasi sesi, memvalidasi izin/command, menolak transisi tidak sah, menjalankan tugas nyata, lalu mengirim snapshot baru. UI live **tidak mengubah state secara optimistis**. Gunakan `requestId` untuk deduplikasi. Untuk penolakan:

```json
{ "type": "error", "message": "Agent masih memiliki tugas aktif." }
```

### Koneksi dan keamanan

- Snapshot valid pertama menandai koneksi siap; timeout 12 detik menampilkan error.
- Koneksi terputus mempertahankan data terakhir, menonaktifkan mutation, menyediakan reconnect manual. UI tidak mengulang command otomatis.
- Terapkan autentikasi cookie HttpOnly/Secure/SameSite lewat server atau reverse proxy. Jangan simpan API key pada frontend/URL. Periksa Origin di server WebSocket.
- Production harus memakai TLS/WSS dan izin per agent. Adapter hanyalah transport frontend, bukan lapisan autentikasi server.
- Backend Anda adalah sumber kebenaran untuk progress, dependensi, penyelesaian, cancellation, serta log. Tidak ada timer simulasi pada live mode.

## Browser smoke test opsional

Sudah diuji menggunakan Edge desktop dan viewport ponsel. Skrip `browser-smoke.mjs` memerlukan paket Playwright sementara dan lokasi Edge Windows standar:

```sh
npm install --no-save --package-lock=false playwright
npm run dev -- --port 5173
# Terminal lain:
node browser-smoke.mjs
```

Menghasilkan `farm-desktop.png` dan `farm-mobile.png`. Ubah `executablePath` bila Edge berada di lokasi lain. Tidak ada dependency Playwright di runtime aplikasi.

## Bitget: tooling dan runtime read-only

Skill project-local: **`/bitget-connect`**. [Setup dan troubleshooting](.claude/skills/bitget-connect/references/setup.md), [arsitektur](.claude/skills/bitget-connect/references/architecture.md), [keamanan](.claude/skills/bitget-connect/references/safety.md), [schema](.claude/skills/bitget-connect/references/discovery.md), [audit sumber/Academy](.claude/skills/bitget-connect/references/sources.md).

```sh
npm run bitget:validate
npm run bitget:typecheck
npm run bitget:test
# Setelah izin eksekusi paket eksternal tersedia:
npm run bitget:mcp                 # Local stdio handshake + discovery, bukan API live
npm run bitget:check               # Discovery lokal, credential present/missing
npm run bitget:check -- --public   # Public HTTPS reads nyata
npm run bitget:check -- --account  # Private reads opt-in; perlu3envvars
npm run bitget:check -- --preview order.json # Local dryRun, tidak submit
```

SDK dan MCP resmi dipin **3.3.1**, protocol SDK **1.32.2**; UTA v3. SDK hanya Node di `scripts/bitget.ts`, **bukan browser**. Tidak ada strategi, auto-trade, backend trading, atau integrasi status trading ke farm. Konfigurasi Claude Code tidak menjadikan React MCP client.

**Verifikasi ulang 2026-11-01:** validasi file/typecheck PASS, 3 tes Bitget mock PASS, 4 tes farm PASS, production build PASS (warning chunk 3D >500 kB), `npm audit` melaporkan 0 vulnerabilities. Handshake MCP **BLOCKED**: izin lingkungan kembali menolak menjalankan paket Bitget; tidak dicoba melalui jalur lain. Public HTTPS belum dijalankan; akun/Demo NOT RUN. Ketiga credential vars **missing**. `.mcp.json` tetap belum dibuat; contoh inactive ada di setup. Tidak ada order/mutasi dikirim. Tes mock bukan bukti koneksi; metadata precision/minimum belum diamati, preview selalu `executionReady:false`.

Secret hanya environment proses (`BITGET_API_KEY`, `BITGET_SECRET_KEY`, `BITGET_PASSPHRASE`), tidak ada `.env` loader. Jangan gunakan `VITE_*`, chat, JSON config, atau command history untuk secret. Public wrapper membuang credential vars dan mengisolasi OAuth store; account/trading-review tetap read-only. Withdrawal tidak diaktifkan.

## Catatan build

Three.js/R3F dimuat sebagai chunk dinamis agar UI awal cepat. Vite mungkin memberi warning chunk 3D >500 kB; ini ukuran engine, bukan kegagalan build. Kualitas rendah mematikan shadow, menurunkan pixel ratio, dan menyembunyikan awan. Preferensi reduced motion menghentikan animasi dekoratif; perjalanan agent tetap menunjukkan posisi kerja.
