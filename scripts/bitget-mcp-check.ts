import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { fileURLToPath } from 'node:url'

const client = new Client({ name: 'farm-bitget-check', version: '1.0.0' })
const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('./bitget-mcp.mjs', import.meta.url)), 'public'], stderr: 'pipe' })
// Never forward upstream stderr, which can contain unsanitized SDK errors.
transport.stderr?.on('data', () => {})
try {
  await client.connect(transport, { timeout: 15_000 })
  const listed = await client.listTools({}, { timeout: 10_000 })
  for (const name of ['market', 'discover']) if (!listed.tools.some(tool => tool.name === name)) throw new Error('Required tool missing')
  const result = await client.callTool({ name: 'discover', arguments: { tool: 'market', action: 'instruments' } }, undefined, { timeout: 10_000 })
  if (result.isError) throw new Error('Discovery failed')
  console.log(JSON.stringify({ ok: true, mode: 'LOCAL_MCP_HANDSHAKE', timestamp: new Date().toISOString(), server: client.getServerVersion(), tools: listed.tools.map(tool => tool.name), discovery: result }))
} catch {
  console.error(JSON.stringify({ ok: false, mode: 'LOCAL_MCP_HANDSHAKE', error: 'MCP startup/discovery failed; secrets suppressed' }))
  process.exitCode = 1
} finally {
  await client.close().catch(() => {})
  await transport.close().catch(() => {})
}
