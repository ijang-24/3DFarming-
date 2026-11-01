import { mkdtemp } from 'node:fs/promises'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const profile = process.argv[2]
if (process.argv.length !== 3 || !['public', 'account', 'trading-review'].includes(profile)) {
  process.stderr.write('Expected public, account, or trading-review profile\n')
  process.exit(1)
}
const names = ['BITGET_API_KEY', 'BITGET_SECRET_KEY', 'BITGET_PASSPHRASE']
if (profile === 'public') for (const name of names) delete process.env[name]
else if (names.some(name => !process.env[name]?.trim())) {
  process.stderr.write('All three Bitget credential variables must be present\n')
  process.exit(1)
}
// Keep installed loadConfig away from saved OAuth credentials. No user files read.
const home = await mkdtemp(join(tmpdir(), 'farm-bitget-mcp-'))
process.env.HOME = home
process.env.USERPROFILE = home
process.env.BITGET_API_BASE_URL = 'https://api.bitget.com'
process.env.BITGET_TIMEOUT_MS = '10000'
process.env.BITGET_MAX_RETRIES = '1'
process.on('exit', () => { try { rmSync(home, { recursive: true, force: true }) } catch { /* Temporary directory contains no credentials. */ } })
process.argv = [process.execPath, 'bitget-agent-mcp', '--modules', profile === 'public' ? 'market' : 'market,account,trade', '--surface', 'intent', '--read-only']
// Suppress upstream stderr payloads; startup errors can echo configuration values.
const stderrWrite = process.stderr.write.bind(process.stderr)
process.stderr.write = (...args) => {
  stderrWrite('Bitget MCP diagnostic suppressed; check configuration and /mcp status.\n')
  const callback = args.at(-1)
  if (typeof callback === 'function') callback()
  return true
}
// Uses the pinned local executable, never npx downloads. Stdout remains MCP JSON-RPC.
await import('../node_modules/@bitget-ai/bitget-agent-mcp/lib/index.js')
