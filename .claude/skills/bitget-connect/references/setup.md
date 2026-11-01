# Setup dan diagnosis

Audit 2026-11-01: Windows 11 native, PowerShell 5.1, Node 24.16.0, npm/npx 11.13.0, Claude Code 2.1.302. Paket membutuhkan Node >=20. SDK/MCP resmi 3.3.1, MCP client SDK 1.32.2; lockfile pinned. `npm ci --ignore-scripts` memasang ulang versi lock tanpa lifecycle scripts. Jangan menjalankan installer global/multi-client.

## Profil project-local

Aktivasi `.mcp.json` DITOLAK permission lingkungan; file aktif belum dibuat. Berikut contoh INAKTIF, bukan koneksi selesai. Sesudah izin eksekusi paket resmi diberikan, baca konfigurasi yang ada, gabungkan hanya entry ini:

```json
{
  "mcpServers": {
    "bitget-public": {
      "type": "stdio",
      "command": "node",
      "args": ["scripts/bitget-mcp.mjs", "public"]
    }
  }
}
```

Jalankan Claude Code dari root proyek. Bila client memakai working directory lain, gunakan path absolut wrapper. Wrapper memanggil executable lokal `node_modules/@bitget-ai/bitget-agent-mcp/lib/index.js`; tidak download saat startup. Windows tidak membutuhkan `cmd /c` untuk `node`. Jika memilih `npx` di Windows, dokumentasi Claude Code menyarankan `cmd /c npx ...`; jangan mengganti ke package/version yang belum diaudit. macOS/Linux gunakan Node pada PATH dan path proyek yang sesuai; belum diuji di OS tersebut.

Account read-only: contoh entry sama, nama `bitget-account-read`, argumen terakhir `account`. Trading-review: nama `bitget-trading-review`, argumen terakhir `trading-review`. Keduanya INAKTIF dan tetap `--read-only`, modules `market,account,trade`, surface `intent`. Trading-review bukan izin write. Jangan aktifkan ketiganya sekaligus atau menggabungkan key live/demo.

Public: modules `market`; wrapper menghapus tiga credential vars, mengisolasi HOME/USERPROFILE ke direktori temporary kosong agar SDK tidak memuat OAuth tersimpan. Tidak menghapus file pengguna. Account: mewajibkan ketiga env vars; direktori OAuth tetap diisolasi. Endpoint dipaksa HTTPS production, timeout10s, transport retry maksimum1. `raw`/OAuth verbs dapat tetap muncul; tidak boleh dipakai untuk memperluas akses.

Secret diwariskan dari proses induk. Tidak ada `.env` loader: membuat `.env` saja tidak bekerja. Simpan lewat secret manager/launcher lokal, jangan mengetik nilai dalam command history atau chat. Tutup/buka terminal dan Claude Code setelah mengubah environment. Jangan gunakan variabel `VITE_*`. Status keberadaan saja: `npm run bitget:check` (local discovery).

Claude Code: project scope `.mcp.json` dibagikan lewat repo, local/user scopes berbeda. Tinjau project server approval saat diminta; `/mcp` melihat status/tools. Reload/restart client setelah konfigurasi. Jangan whitelist `mcp__bitget*` secara menyeluruh atau mematikan approval global. Config client lain tidak otomatis dipakai Claude Code. Cursor `.cursor/mcp.json`, Desktop/Windsurf/VS Code/OpenClaw punya format/lifecycle sendiri; tidak diubah oleh setup ini.

## Pemeriksaan bertahap

| Perintah | Membuktikan | Tidak membuktikan |
|---|---|---|
| `npm run bitget:validate` | File skill/link, package pin, wrapper/config shape | Startup/network |
| `npm run bitget:typecheck` | TypeScript scripts valid | Respons exchange |
| `npm run bitget:test` | Mock SDK boundary, no-network preview, deny surface | API nyata |
| `npm run bitget:mcp` | Initialize, listTools, discover via stdio; close di finally | HTTPS public/private |
| `npm run bitget:check` | Discovery lokal SDK, credential present/missing | Koneksi exchange |
| `npm run bitget:check -- --public` | Instruments/ticker/book/candles SPOT dan futures, funding/OI futures | Account auth/order readiness |
| `npm run bitget:check -- --account` | Private overview/positions; partial errors diperiksa | Mutasi, validasi angka privat dengan UI |
| `npm run bitget:check -- --preview order.json` | Payload SDK dryRun tanpa network | Precision/minimum/risk/order execution |

Bukti public harus mencantumkan `observedAt`, `requestTime`, `category`, `symbol`, `action`, `ok`, data tidak kosong. SDK membuang raw API envelope pada ToolResult; `ok:true` berarti SDK menerima sukses business code, bukan HTTP code yang dicetak. Jangan mengarang status HTTP atau `00000` dari narasi. Format array ringkas memuat satu sample public; format objek hanya keys/sections. Metadata mentah dapat diperiksa melalui `createReader('public').read('market', {action:'instruments',category,symbol})` dalam program server-side setelah izin; jangan menebak field rules.

## Troubleshooting Academy lengkap

| Gejala | Pemeriksaan aman pertama |
|---|---|
| Server tidak muncul | Node >=20/PATH, package pin/entry, working directory, permission eksekusi |
| Tools hilang | JSON valid, project scope benar, approval, `/mcp`, restart; listTools aktual |
| Env missing | Nama persis tiga vars; restart proses induk; `.env` tidak dimuat otomatis |
| Auth gagal | Waktu OS/NTP, key/secret/API passphrase (bukan login password), revoked/expiry; jangan cetak nilainya |
| Permission ditolak | Endpoint/schema/account mode/key read scope; jangan langsung perluas izin |
| Public jalan private gagal | Presence3vars, key read-only, whitelist IP egress, UTA compatibility |
| Trading tidak tersedia | Disengaja: semua profil read-only. Jangan melemahkan guard untuk memperbaiki setup |
| IP ditolak | Cocokkan IP publik egress/NAT/VPN dengan whitelist; jangan hapus whitelist |
| Rate limit | Request berurutan, kurangi polling; SDK bounded retry GET/429, hormati Retry-After maksimum30s |
| Timeout | DNS/TLS/proxy/firewall/region layanan/status exchange;10s/request, MCP10–15s; tidak retry order |
| Hasil keliru/kosong | Kategori/symbol/instruments status, interval/time range/units; periksa partial sections |
| JSON invalid | `npm run bitget:validate`, quotes/comma/brackets/env placement |

Tambahan: OAuth tersimpan dapat menyamarkan key missing pada server bawaan; wrapper mengisolasinya. SDK package3.3.1 punya internal constant3.1.0: gunakan manifest/lock, bukan constant sebagai bukti versi. Schema candles mendeskripsikan limit secara kontradiktif; gunakan5 sampai hasil aktual teruji. Proses handshake harus close di finally; jangan membiarkan child stdio menggantung.
