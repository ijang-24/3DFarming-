import { BitgetRestClient, buildTools, safeInvoke, type BitgetConfig } from '@bitget-ai/bitget-agent-sdk'

export const credentialNames = ['BITGET_API_KEY', 'BITGET_SECRET_KEY', 'BITGET_PASSPHRASE'] as const
export const credentialStatus = () => Object.fromEntries(credentialNames.map(name => [name, process.env[name]?.trim() ? 'present' : 'missing']))
export type Profile = 'public' | 'account'
type Args = Record<string, unknown>
const actions = new Set(['instruments', 'tickers', 'orderbook', 'candles', 'fundingRate', 'openInterest'])
const categories = new Set(['SPOT', 'USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'])

// Explicit config avoids loadConfig's implicit ~/.bitget OAuth credentials.
export function createConfig(profile: Profile): BitgetConfig {
  if (profile !== 'public' && profile !== 'account') throw new Error('Invalid profile')
  if (profile === 'account' && credentialNames.some(name => !process.env[name]?.trim())) throw new Error('Credentials missing')
  return {
    hasAuth: profile === 'account',
    ...(profile === 'account' ? { apiKey: process.env.BITGET_API_KEY!.trim(), secretKey: process.env.BITGET_SECRET_KEY!.trim(), passphrase: process.env.BITGET_PASSPHRASE!.trim() } : {}),
    baseUrl: 'https://api.bitget.com', timeoutMs: 10_000, userAgent: 'agent-farm-readonly/1.0',
    modules: profile === 'account' ? ['market', 'account', 'trade'] : ['market'],
    surface: 'intent', readOnly: true, paperTrading: false,
    retry: { maxRetries: 1, baseDelayMs: 500, maxDelayMs: 2000, retryableStatuses: [429, 500, 502, 503, 504] },
  }
}

export function allowedRead(profile: Profile, tool: string, args: Args): boolean {
  if (tool === 'discover') return true
  if (tool === 'market') return typeof args.action === 'string' && actions.has(args.action)
  return profile === 'account' && (tool === 'account_overview' || tool === 'position' && args.action === 'info')
}

export function validateMarket(category: string, symbol: string) {
  if (!categories.has(category) || !/^[A-Z0-9]{2,40}$/.test(symbol)) throw new Error('Invalid market')
}

export function createReader(profile: Profile) {
  const config = createConfig(profile)
  const tools = buildTools(config)
  const context = { config, client: new BitgetRestClient(config) }
  async function read(tool: string, args: Args) {
    if (!allowedRead(profile, tool, args)) throw new Error('Read surface denied')
    const spec = tools.find(item => item.name === tool)
    if (!spec) throw new Error('Tool unavailable')
    const result = await safeInvoke(spec, args, context)
    if (!result.ok) {
      // Do not log upstream error messages: they may echo request/account values.
      return { ok: false as const, timestamp: new Date().toISOString(), error: { category: result.error.category, retryable: result.error.retryable } }
    }
    return result
  }
  return { read, tools: tools.map(({ name, inputSchema }) => ({ name, inputSchema })) }
}

export function validatePreview(value: unknown): Args {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid preview')
  const args = value as Args
  const permitted = new Set(['category', 'symbol', 'qty', 'side', 'orderType', 'price', 'timeInForce', 'clientOid', 'posSide', 'reduceOnly'])
  if (Object.keys(args).some(key => !permitted.has(key))) throw new Error('Unknown preview field')
  validateMarket(String(args.category), String(args.symbol))
  if (!['buy', 'sell'].includes(String(args.side)) || !['limit', 'market'].includes(String(args.orderType))) throw new Error('Invalid order type')
  const positive = (v: unknown) => typeof v === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v) && /[1-9]/.test(v)
  if (!positive(args.qty) || args.orderType === 'limit' && !positive(args.price)) throw new Error('Invalid decimal')
  if (args.orderType === 'market' && args.price !== undefined) throw new Error('Market preview must omit price')
  if (typeof args.clientOid !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(args.clientOid)) throw new Error('Explicit clientOid required')
  if (args.timeInForce !== undefined && !['ioc', 'fok', 'gtc', 'post_only'].includes(String(args.timeInForce))) throw new Error('Invalid timeInForce')
  if (args.posSide !== undefined && !['long', 'short'].includes(String(args.posSide))) throw new Error('Invalid posSide')
  if (args.reduceOnly !== undefined && !['yes', 'no'].includes(String(args.reduceOnly))) throw new Error('Invalid reduceOnly')
  return { ...args, action: 'place', dryRun: true }
}

export async function preview(value: unknown) {
  const args = validatePreview(value)
  const config = { ...createConfig('public'), modules: ['market', 'trade'] as BitgetConfig['modules'] }
  const spec = buildTools(config).find(tool => tool.name === 'order')!
  // Independent no-network guard: even a future SDK regression cannot submit a preview.
  const client = { callOperation: async () => { throw new Error('Network forbidden in preview') } } as unknown as BitgetRestClient
  const result = await safeInvoke(spec, args, { config, client })
  if (!result.ok) return { ok: false, error: { category: result.error.category } }
  return { ok: true, mode: 'LOCAL_PREVIEW', executionReady: false, missing: ['fresh instrument precision/minimum/unit verification', 'account mode and risk review', 'explicit per-order authorization'], preview: result.data }
}

export function summarize(data: unknown, publicSample = false): unknown {
  if (Array.isArray(data)) return { rows: data.length, ...(publicSample ? { sample: data.slice(0, 1) } : {}) }
  if (data && typeof data === 'object') return { keys: Object.keys(data), sections: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value && typeof value === 'object' && 'ok' in value ? { ok: (value as { ok: unknown }).ok } : Array.isArray(value) ? { rows: value.length } : { present: value !== null }])) }
  return { present: data !== null && data !== undefined }
}
