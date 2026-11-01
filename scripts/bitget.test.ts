import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allowedRead, createConfig, createReader, preview, validateMarket } from './bitget.js'

test('public config ignores secrets and blocks write surfaces', () => {
  const config = createConfig('public')
  assert.equal(config.hasAuth, false)
  assert.equal(config.apiKey, undefined)
  assert.equal(config.readOnly, true)
  assert.equal(config.paperTrading, false)
  assert.deepEqual(config.modules, ['market'])
  for (const tool of ['raw', 'order', 'transfer_funds', 'withdraw', 'authorize_start', 'account_overview']) assert.equal(allowedRead('public', tool, { action: 'place' }), false)
  assert.equal(allowedRead('account', 'position', { action: 'info' }), true)
  assert.equal(allowedRead('account', 'position', { action: 'close' }), false)
  assert.throws(() => validateMarket('MARGIN', 'BTCUSDT'))
  assert.throws(() => validateMarket('SPOT', '../BTC'))
})

test('discovery and SDK reads use no real network in this test', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (input, init) => {
    calls++
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://api.bitget.com')
    assert.equal(init?.method, 'GET')
    assert.equal(url.pathname, '/api/v3/market/tickers')
    assert.equal(url.searchParams.get('category'), 'SPOT')
    const headers = new Headers(init?.headers)
    assert.equal(headers.has('ACCESS-KEY'), false)
    return new Response(JSON.stringify({ code: '00000', requestTime: 1_800_000_000_000, data: [{ symbol: 'BTCUSDT', lastPr: '1' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const reader = createReader('public')
    const contract = await reader.read('discover', { tool: 'market', action: 'tickers' })
    assert.equal(contract.ok, true)
    assert.equal(calls, 0)
    assert.equal((await reader.read('market', { action: 'tickers', category: 'SPOT', symbol: 'BTCUSDT' })).ok, true)
    assert.equal(calls, 1)
    await assert.rejects(reader.read('raw', { operationId: 'placeOrder' }))
    globalThis.fetch = async () => new Response(JSON.stringify({ code: '40009', msg: 'DO_NOT_PRINT_SECRET', data: null }), { status: 200 })
    const error = await reader.read('market', { action: 'tickers', category: 'SPOT', symbol: 'BTCUSDT' })
    assert.equal(error.ok, false)
    assert.equal(JSON.stringify(error).includes('DO_NOT_PRINT_SECRET'), false)
  } finally { globalThis.fetch = original }
})

test('preview cannot make network calls, never claims exchange validation', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Test forbids network') }
  const order = { category: 'SPOT', symbol: 'BTCUSDT', qty: '0.001', side: 'buy', orderType: 'limit', price: '1', clientOid: 'local-preview-1' }
  try {
    const result = await preview(order)
    assert.equal(result.ok, true)
    assert.equal('executionReady' in result && result.executionReady, false)
    assert.match(JSON.stringify(result), /dryRun/)
    await assert.rejects(preview({ ...order, dryRun: false }))
    await assert.rejects(preview({ ...order, qty: '-1' }))
    await assert.rejects(preview({ ...order, clientOid: undefined }))
  } finally { globalThis.fetch = original }
})
