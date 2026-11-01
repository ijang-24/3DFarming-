import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = path => readFile(resolve(root, path), 'utf8')
const pkg = JSON.parse(await read('package.json'))
const lock = JSON.parse(await read('package-lock.json'))
for (const [name, version] of [['@bitget-ai/bitget-agent-sdk', '3.3.1'], ['@bitget-ai/bitget-agent-mcp', '3.3.1'], ['@modelcontextprotocol/sdk', '1.32.2']]) {
  assert.equal(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name], version)
  assert.equal(lock.packages[`node_modules/${name}`].version, version)
}
const base = '.claude/skills/bitget-connect/'
const skill = await read(`${base}SKILL.md`)
assert.match(skill, /^---\r?\nname: bitget-connect\r?\ndescription: .+\r?\n---/)
for (const file of ['SKILL.md', 'references/setup.md', 'references/architecture.md', 'references/safety.md', 'references/discovery.md', 'references/sources.md']) {
  const path = `${base}${file}`
  for (const [, link] of (await read(path)).matchAll(/\]\(([^)]+)\)/g)) if (!/^https?:/.test(link)) await access(resolve(root, dirname(path), link))
}
const wrapper = await read('scripts/bitget-mcp.mjs')
assert.match(wrapper, /--read-only/)
assert.match(wrapper, /process\.env\.HOME = home/)
assert.match(wrapper, /delete process\.env\[name\]/)
try {
  const mcp = JSON.parse(await read('.mcp.json'))
  const entry = mcp.mcpServers?.['bitget-public']
  assert.equal(entry?.command, 'node')
  assert.deepEqual(entry?.args, ['scripts/bitget-mcp.mjs', 'public'])
  console.log('PASS project MCP configuration shape (not a startup check)')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  console.log('NOT RUN active MCP configuration: absent, activation permission blocked')
}
console.log('PASS package pins, lockfile, skill frontmatter, local reference links, wrapper safety shape')
console.log(JSON.stringify(Object.fromEntries(['BITGET_API_KEY', 'BITGET_SECRET_KEY', 'BITGET_PASSPHRASE'].map(name => [name, process.env[name]?.trim() ? 'present' : 'missing']))))
