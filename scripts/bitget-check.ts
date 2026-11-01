import { readFile } from 'node:fs/promises'
import { createReader, credentialStatus, preview, summarize, validateMarket } from './bitget.js'

const [mode = '--discover', file] = process.argv.slice(2)
if (!['--discover', '--public', '--account', '--preview'].includes(mode) || (mode === '--preview' ? !file || process.argv.length !== 4 : process.argv.length > 3)) {
  console.error('Usage: bitget-check.ts [--discover|--public|--account|--preview file.json]')
  process.exit(1)
}

try {
  if (mode === '--preview') {
    const result = await preview(JSON.parse(await readFile(file, 'utf8')))
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) process.exitCode = 1
  } else {
    const reader = createReader(mode === '--account' ? 'account' : 'public')
    if (mode === '--discover') {
      console.log(JSON.stringify({ mode: 'LOCAL_DISCOVERY', timestamp: new Date().toISOString(), credentials: credentialStatus(), tools: reader.tools.map(tool => tool.name) }))
      for (const args of [
        { tool: 'market', action: 'instruments' }, { tool: 'market', action: 'tickers' },
        { tool: 'market', action: 'orderbook' }, { tool: 'market', action: 'candles' },
        { tool: 'market', action: 'fundingRate' }, { tool: 'market', action: 'openInterest' },
        { tool: 'account_overview' }, { tool: 'position', action: 'info' }, { tool: 'order', action: 'place' },
      ]) console.log(JSON.stringify({ args, result: await reader.read('discover', args) }))
    } else if (mode === '--public') {
      for (const category of ['SPOT', 'USDT-FUTURES']) {
        const symbol = 'BTCUSDT'
        validateMarket(category, symbol)
        // Inspect contracts before actual reads; no endpoint guessing.
        for (const action of ['instruments', 'tickers', 'orderbook', 'candles', ...(category === 'SPOT' ? [] : ['fundingRate', 'openInterest'])]) {
          const contract = await reader.read('discover', { tool: 'market', action })
          if (!contract.ok) throw new Error('Discovery failed')
          const args = action === 'fundingRate' ? { action, symbol } : { action, category, symbol, ...(action === 'orderbook' ? { limit: '5' } : {}), ...(action === 'candles' ? { interval: '1m', limit: '5' } : {}) }
          const result = await reader.read('market', args)
          console.log(JSON.stringify({ mode: 'LIVE_PUBLIC_READ', category, symbol, action, observedAt: new Date().toISOString(), result: result.ok ? { ...result, data: summarize(result.data, true) } : result }))
          // Success requires data as well as SDK success. Does not certify order precision/minimum.
          if (!result.ok || result.data == null || Array.isArray(result.data) && !result.data.length) process.exitCode = 1
        }
      }
    } else {
      console.log(JSON.stringify({ mode: 'LIVE_ACCOUNT_READ', credentials: credentialStatus() }))
      for (const [tool, args] of [
        ['account_overview', { category: 'USDT-FUTURES', symbol: 'BTCUSDT' }],
        ['position', { action: 'info', category: 'USDT-FUTURES', symbol: 'BTCUSDT' }],
      ] as const) {
        const result = await reader.read(tool, args)
        // No account balances, identifiers or position values in terminal logs.
        const partialFailure = result.ok && JSON.stringify(summarize(result.data)).includes('"ok":false')
        console.log(JSON.stringify({ tool, observedAt: new Date().toISOString(), ok: result.ok && !partialFailure, ...(result.ok ? { requestTime: result.requestTime, sections: summarize(result.data) } : { error: result.error }) }))
        if (!result.ok || partialFailure) process.exitCode = 1
      }
    }
  }
} catch {
  console.error(JSON.stringify({ ok: false, timestamp: new Date().toISOString(), error: 'Check failed. Inspect configuration, credential presence and current discovery schema; secrets suppressed.' }))
  process.exitCode = 1
}
