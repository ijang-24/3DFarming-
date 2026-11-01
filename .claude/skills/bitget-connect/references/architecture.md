# Arsitektur B: SDK Node, MCP untuk tooling

- Skill: instruksi prosedural; tidak menjalankan backend dengan sendirinya.
- MCP server: proses resmi Bitget yang menerima JSON-RPC lewat stdio, lalu memakai HTTPS REST Bitget.
- MCP client: Claude Code; `bitget-mcp-check.ts` juga client eksplisit untuk handshake. `.mcp.json` tidak membuat React menjadi client.
- SDK: `@bitget-ai/bitget-agent-sdk` dipanggil langsung di Node lewat `scripts/bitget.ts`; bukan MCP dan bukan LLM.
- REST: HTTP snapshot/request-response, signing private ditangani SDK.
- WebSocket: streaming event berbeda dari REST/MCP; belum ditambahkan exchange WebSocket.

## Jalur yang benar-benar ada

`Node CLI -> createReader -> buildTools/safeInvoke -> BitgetRestClient -> HTTPS UTA v3`.

`Claude Code -> stdio wrapper -> official MCP server -> SDK -> HTTPS` setelah izin/aktivasi. Saat audit aktivasi ditolak; jangan menyebut jalur ini sudah aktif.

UI farm tetap `src/adapters.ts` dengan demo reducer atau backend snapshot. Belum ada backend trading/scheduler, account dashboard, adapter SDK ke FarmSnapshot, atau strategi otomatis. Jangan import `scripts/bitget.ts` ke `src/`, jangan kirim credential/financial payload ke browser. Backend masa depan dapat mengimpor `createReader` lalu mengirim snapshot tersanitasi ke adapter UI yang ada. Tidak perlu MCP client tambahan bila backend menggunakan SDK langsung. Tidak ada loop LLM per tick.

## Lifecycle dan batas

`createConfig` eksplisit menghindari `loadConfig` OAuth fallback. Origin tetap `https://api.bitget.com`; tidak menerima URL pengguna/redirect konfigurasi. Public config tidak memuat auth. Account harus opt-in serta lengkap3vars. Allowlist aplikasi hanya market reads, discover, account_overview, position/info; raw/account_config/transfers/OAuth/order writes ditolak sebelum SDK.

SDK REST fetch-based tidak memiliki close/dispose publik yang ditemukan; bukan koneksi socket persisten yang wajib di-close. Reader dapat dipakai ulang pada proses server. Timeout10s per request, satu retry transport GET transient, serial smoke untuk menghindari burst. SDK memiliki rate limiter; jangan mengasumsikan satu limit universal semua endpoint. Account composite bisa mengeluarkan beberapa request. Error aplikasi hanya category/retryable/timestamp; upstream message tidak dicetak. Account CLI hanya status/section keys, tidak angka/account identifiers. Tidak ada HTTP server baru yang membuka private reads ke jaringan.

MCP check memiliki initialize/listTools/discover serta client+transport close di finally. Wrapper mengisolasi credential store via temporary home; cleanup exit sinkron. Jika proses dihentikan paksa, direktori kosong mungkin tersisa di temp. Tidak ada OAuth authorization otomatis; jangan menjalankan authorize_start/get_auth_status sebagai koneksi wajib.

`--modules` bukan security boundary: `raw` dapat menjangkau operation di luar modul. Official server readOnly memblokir mutasi walau verb write tetap terlihat, dryRun diizinkan sebelum gate. Key least-privilege adalah lapisan independen; wrapper bukan sandbox seluruh SDK. Approval manusia dan larangan OAuth tetap diperlukan. Tool annotations bukan enforcement izin.

Preview memakai SDK action `order/place`, hardcodes dryRun dan client dummy yang menolak semua callOperation. Tidak ada jalur submit order. `executionReady:false` tetap berlaku sampai metadata/risk/account review lengkap. Future writes membutuhkan desain baru, bukan sekadar mengganti boolean.
