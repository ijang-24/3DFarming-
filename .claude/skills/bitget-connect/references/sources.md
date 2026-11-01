# Sumber, versi, cakupan Academy

Audit 2026-11-01. Artikel Academy adalah konteks awal, bukan kontrak package/API saat ini. Urutan bukti: manifest+lock+implementasi versi terpasang dan discovery schema, dokumentasi teknis resmi, artikel pengantar. Repo main bisa berbeda dari npm pinned. Tidak ada klaim semua endpoint dites.

## Sumber resmi

1. [Academy setup guide](https://www.bitget.com/academy/how-to-connect-bitget-mcp-to-claude-cursor-ai-agents-2026-setup-guide), artikel29Mei2026, seluruh bagian substantif ditinjau.
2. [UTA Agent Hub](https://www.bitget.com/docs/uta/agent-hub), arsitektur tools/SDK/skills dan origin resmi.
3. [MCP resmi](https://github.com/Bitget-AI/agent-mcp), scoped package `@bitget-ai/bitget-agent-mcp`, executable `bitget-agent-mcp`, local stdio, Node>=20.
4. [SDK resmi](https://github.com/Bitget-AI/agent-sdk), `@bitget-ai/bitget-agent-sdk`, HTTPS origin `https://api.bitget.com`, HMAC private requests.
5. [Skill resmi](https://github.com/Bitget-AI/agent-skill), `skills/SKILL.md` diinspeksi sebelum adaptasi; berorientasi bgc CLI, tidak dipasang sebagai skill kedua. Konsep discovery dan review dipertahankan; global CLI installer, broad trigger semua trading, dan mutasi tidak diadopsi. Attribution: Bitget-AI, repository resmi MIT menurut Agent Hub; tulisan ini adaptasi prosedur, bukan salinan seluruh skill.
6. [Claude Code MCP](https://code.claude.com/docs/en/mcp): project config, scopes, approval, stdio client lifecycle.
7. [Claude Code Skills](https://code.claude.com/docs/en/skills): project-local SKILL.md/frontmatter/supporting references.

## Audit paket lokal

| Item | Terverifikasi statik/registry |
|---|---|
| SDK / MCP | 3.3.1 / 3.3.1 exact, --ignore-scripts install |
| MCP protocol SDK | 1.32.2 exact; audit dependency terakhir0vulnerabilities setelah patch |
| npm maintainer teramati | andrewyang_bgai; nama maintainer bukan signature atau bukti supply-chain mutlak |
| executable | bitget-agent-mcp, lib/index.js; transport stdio bukan hosted MCP URL |
| API family | installed API_VARIANT UTA v3, OpenAPI catalog109operations spec3.0.0 |
| Modules | account,trade,market,strategy,broker,cryptoloans,instloan,tax;8 ModuleId, bukan9 artikel |
| Default | account,trade,market; proyek memilih market public saja |
| `all` | Tidak dipakai; bahkan mengecualikan hidden broker/instloan |
| Surface | intent default; full menambah endpoint tools, bukan58fixedtools |
| Flags | --read-only, --paper-trading, --surface, --modules ada di installed CLI |
| Drift | SDK internal SERVER_VERSION3.1.0 tidak sama manifest3.3.1; installed OAuth fallback tidak sama source main yang dibaca |

MCP registry integrity: `sha512-utv4kyO3xyx5O4PCTwl0hE1UL0J9ShwWun1Wiq34obujplENu9B0I8CHiezzq4MK/TGOcNqYiKgllPcz9vQFRA==`.
SDK: `sha512-NrIzr6HovbD68cSPMlyvDImZXkgamcg55uBVcB6IxjIvH7Y5alZ1q8/7dSg53Lndhvqdg+qZIyvCesxKrGv8pw==`.
Lockfile adalah referensi executable exact, bukan URL source main. Audit package bukan jaminan bebas bug.

## Matriks seluruh bagian substantif Academy

| Bagian Academy (judul diparafrase) | Penanganan proyek / perbedaan |
|---|---|
| Pembukaan, temuan utama | 58tools9modules V2 tidak dijadikan kontrak3.3.1; tabel audit di atas |
| Cara kerja MCP | architecture.md memisahkan client/server/SDK/REST/WebSocket; bukan autonomous strategy |
| Persiapan akun/client/Node/npx | setup.md versi aktual, Node>=20; public tanpa akun; local pinned Node bukan auto-npx |
| Membuat API key | safety.md dedicated key, API passphrase, least privilege, IP/rotation |
| Tiga tier permission | Public/account-read/trading-review terpisah; semua profil readOnly; withdrawal disabled |
| Startup server | Artikel `npx -y bitget-mcp-server --modules all` TIDAK dijalankan; scoped package3.3.1 executable lokal, minimal modules |
| Claude Desktop/Code | setup.md project .mcp.json untuk Code; Desktop bukan config yang sama; activation blocked dilaporkan |
| Cursor project config | .cursor/mcp.json hanya konteks; tidak ditulis/diinstal semua client |
| VS Code/OpenClaw/Windsurf/client lain | Periksa custom transport/environment/reload masing-masing; tidak klaim teruji |
| Public verification | instruments/ticker/book/candles spot+futures, funding/OI futures; schema aktual discovery.md; live NOT RUN |
| Private-read verification | overview+positions opt-in, partial status, confidential UI cross-check; NOT RUN |
| Trading verification | Local preview saja, explicit review safety.md; tidak eksekusi/cancel/modify/leverage |
| Best practices config | Environment nyata bukan .env otomatis, key terpisah, merge config, approval, reload, sanitized logs |
| Troubleshooting | setup.md seluruh12kategori: startup/tools/env/auth/permission/public-private/trading/IP/rate/timeout/result/JSON |
| Security controls | safety.md secret hygiene, logs, no withdrawals/blanket approval, human review semua writes |
| Penutup/batas MCP | architecture.md tidak mengganti strategi, backtest, risk management/sizing/liquidation assessment |
| Contoh market | BTC/ETH, spot-vs-futures, book/candle/funding/OI melalui exact schema; smoke BTCUSDT hanya probe |
| Contoh account | Balances/assets/collateral/exposure/positions via private overview; tidak membocorkan angka/log |
| Contoh trading prep/conditional | Payload review, schema+metadata+mode+risk wajib; conditional writes tidak diimplementasikan |
| Copy/convert/earn/P2P/broker usecases | Kemampuan artikel V2 bukan bukti UTA package; tidak enable modul tak dibutuhkan |
| Future uses/related reading | Research/reporting/exposure saja konteks; link CCXT/REST/WS atau CFD tidak menambah capability terverifikasi |
| Disclaimer | Bukan saran investasi; API/permission dapat berubah, audit ulang saat upgrade; iklan/nav/bonus/footer bukan requirement |

## Status bukti

Verifikasi ulang 2026-11-01: validasi frontmatter/link/pin/wrapper PASS; typecheck PASS; 3 tes Bitget mock PASS; 4 tes farm PASS; production build PASS dengan warning chunk 3D >500 kB; npm audit 0 vulnerabilities. MCP handshake kembali BLOCKED oleh izin lingkungan untuk eksekusi paket eksternal. Tidak dicoba lewat jalur lain. Public HTTPS/API metadata aktual belum dijalankan; private dan Demo NOT RUN. Ketiga credential env vars missing. `.mcp.json` belum dibuat; contoh tetap inactive. Discovery prototype terdahulu bukan bukti koneksi, bukan hasil handshake final. Tidak ada order atau mutasi dikirim.
