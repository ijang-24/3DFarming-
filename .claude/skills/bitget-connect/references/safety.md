# Autentikasi, izin, review

Public tidak membutuhkan akun atau key. Private menggunakan tiga variabel `BITGET_API_KEY`, `BITGET_SECRET_KEY`, `BITGET_PASSPHRASE`. API passphrase ditetapkan saat pembuatan API key; bukan password login. Jangan menempel secret ke chat/terminal/log/screenshot/Git. Jangan membaca file saved OAuth untuk pemeriksaan. Presence hanya present/missing. Key dedicated, read permission minimum, withdrawal disabled, whitelist IP egress stabil. Pisahkan public/read/trading/demo key/proses; rotasi/revoke bila bocor, audit akses dan update launcher secara privat.

Transfer, repayment, setting leverage/margin/account mode, API-key/subaccount management bukan read-only. Setup tidak memberi otorisasi memasang/membatalkan/mengubah order/posisi, transfer atau withdrawal. Jangan menyarankan perluasan permission sebagai solusi pertama error. Jangan blanket allow semua MCP tools.

## OAuth/Agentic Account

Installed SDK dapat mengambil credentials dari `~/.bitget` saat env kosong. Credential store dan tool OAuth terpisah dari key akun utama; bukan otomatis akun demo atau grant read-only. OAuth dapat membuat/menggunakan Agentic Account dengan scope/limit berbeda menurut alur resmi. Sebelum menawarkan: baca tampilan consent aktual, jelaskan akun/subaccount yang diakses, scope, spending/expiry/revocation dan custody; minta persetujuan eksplisit. Tidak ada OAuth flow dijalankan di setup ini, tidak ada klaim scope tertentu tanpa bukti consent. Wrapper mengisolasi home agar auth tidak diam-diam diwarisi.

## Mode

| Mode | Makna |
|---|---|
| Mock test | Respons buatan, global fetch diganti; tidak konek exchange |
| Demo farm/paper lokal | Simulasi aplikasi; bukan posisi Bitget |
| Local preview | SDK dryRun; tidak ada request order, bukan acceptance exchange |
| Demo exchange | SDK `--paper-trading`, Demo API key terpisah, signed request header `paptrading:1` |
| Live read | Production market/account snapshot, tidak mutasi |
| Live trading | Uang/posisi nyata; tidak diimplementasikan/diotorisasi |

Flag paper-trading terverifikasi di3.3.1, mutually exclusive dengan read-only; bukan jaminan semua endpoint mendukung demo. Endpoint/default host sama tidak berarti local sim. Belum menguji Demo API. Semua profil proyek tetap read-only.

## Review masa depan, tidak dieksekusi sekarang

1. Discover exact operation/schema versi terpasang. Ambil fresh instruments untuk kategori+simbol; identifikasi tradable status, base/quote, precision, multiplier/tick/step, min/max quantity/notional dan satuan quantity. Jangan asumsikan spot/futures sama. Gunakan decimal arithmetic, tidak pembulatan float sembarang. Metadata hilang/ambigu: berhenti.
2. Periksa actual account/position mode (one-way/hedge), available collateral, open orders/positions, leverage/liquidation, fee/slippage, risk limits strategi pengguna. Blueprint belum diberikan; jangan menetapkan strategi atau risk limits.
3. Rangkai preview dengan clientOid unik bila schema mendukung; futures hedge posSide, close intent/reduceOnly, limit price/TIF, TP/SL/trigger fields hanya bila schema cocok. Tampilkan kategori, simbol, side, unit qty, price/type, mode akun, potential cost/exposure.
4. Minta persetujuan pengguna untuk payload spesifik setiap write, termasuk cancel/modify. Approval setup bukan approval trade. `confirm:true` gate SDK hanya beberapa high-risk actions; ordinary writes dapat langsung execute tanpa flag. Jangan mengandalkannya sebagai human approval.
5. Jika suatu saat submit diimplementasikan dan timeout: hentikan retry; rekonsiliasi order via clientOid/order status/fills sebelum tindakan selanjutnya. Simpan audit tersanitasi; jangan double-submit. Transport retry SDK dengan clientOid bukan alasan retry order secara buta.

Withdrawal tetap disabled. Tidak ada aturan propfirm/cTrader dibawa ke proyek ini. Skill trader-broker lain tetap memiliki gate masing-masing; jangan menganggap instalasi skill memberikan izin eksekusi.

Contoh format preview lokal (nilai ilustrasi, bukan rekomendasi atau metadata valid):
```json
{"category":"SPOT","symbol":"BTCUSDT","side":"buy","orderType":"limit","qty":"0.001","price":"1","clientOid":"local-review-1"}
```
Tidak ada file ticket contoh yang diklaim sudah siap eksekusi. Runtime membatasi field, positive decimal strings, enum, clientOid; tidak menyatakan precision/minimum tervalidasi.
