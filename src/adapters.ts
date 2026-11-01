import { createDemo, reduceFarm, type Command } from './state'
import { type FarmState } from './types'

export interface FarmSnapshot { farm: FarmState; connection: 'connecting' | 'connected' | 'disconnected'; error: string | null; mode: 'demo' | 'live' }
export interface FarmAdapter {
  getSnapshot: () => FarmSnapshot
  subscribe: (listener: () => void) => () => void
  send: (command: Exclude<Command, { type: 'tick' }>) => void
  reconnect: () => void
  disconnect: () => void
  dispose: () => void
}
const emptyFarm = (): FarmState => ({ agents: [], tasks: [], activities: [], now: Date.now() })

export function createDemoAdapter(): FarmAdapter {
  let snapshot: FarmSnapshot = { farm: createDemo(), connection: 'connected', error: null, mode: 'demo' }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(fn => fn())
  const timer = window.setInterval(() => {
    if (snapshot.connection !== 'connected') return
    snapshot = { ...snapshot, farm: reduceFarm(snapshot.farm, { type: 'tick', now: Date.now() }) }
    emit()
  }, 500)
  return {
    getSnapshot: () => snapshot,
    subscribe: fn => { listeners.add(fn); return () => { listeners.delete(fn) } },
    send: command => { if (snapshot.connection !== 'connected') throw new Error('Koneksi terputus. Hubungkan kembali sebelum mengubah tugas.'); snapshot = { ...snapshot, farm: reduceFarm(snapshot.farm, command) }; emit() },
    disconnect: () => { snapshot = { ...snapshot, connection: 'disconnected' }; emit() },
    reconnect: () => { snapshot = { ...snapshot, connection: 'connected', farm: { ...snapshot.farm, now: Date.now() } }; emit() },
    dispose: () => { clearInterval(timer); listeners.clear() },
  }
}

// Trust boundary: reject invalid snapshots, never fabricate backend progress.
export function parseSnapshot(value: unknown): FarmState {
  if (!value || typeof value !== 'object') throw new Error('Snapshot harus berupa objek.')
  const s = value as Record<string, unknown>
  if (!Array.isArray(s.agents) || !Array.isArray(s.tasks) || !Array.isArray(s.activities) || s.agents.length > 100 || s.tasks.length > 10000 || s.activities.length > 500) throw new Error('Daftar snapshot tidak valid atau terlalu besar.')
  const text = (v: unknown, max = 1000): v is string => typeof v === 'string' && v.length > 0 && v.length <= max
  const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  const ids = new Set<string>()
  for (const a of s.agents) {
    if (!a || !text(a.id, 128) || ids.has(a.id) || !text(a.name, 32) || !['Coding', 'Riset', 'Data', 'Monitoring', 'Design'].includes(a.role) || (typeof a.color !== 'string' || !/^#[\da-f]{6}$/i.test(a.color)) || !['water', 'hoe', 'basket', 'rake', 'shovel'].includes(a.tool) || !/^p[1-6]$/.test(a.plotId)) throw new Error('Data agent tidak valid.')
    ids.add(a.id)
  }
  const taskIds = new Set<string>()
  for (const t of s.tasks) {
    if (!t || !text(t.id, 128) || taskIds.has(t.id) || !ids.has(t.agentId) || !text(t.title, 160) || !['walking', 'running', 'waiting', 'paused', 'completed', 'cancelled', 'error'].includes(t.status) || (t.progress != null && (!number(t.progress) || t.progress > 100)) || !number(t.startedAt) || !number(t.updatedAt) || !Array.isArray(t.logs) || t.logs.length > 100 || t.logs.some((l: { at: unknown; message: unknown }) => !l || !number(l.at) || !text(l.message))) throw new Error('Data tugas tidak valid.')
    taskIds.add(t.id)
  }
  for (const e of s.activities) if (!e || !text(e.id, 128) || !ids.has(e.agentId) || !number(e.at) || !text(e.message) || !['info', 'success', 'error'].includes(e.kind)) throw new Error('Data aktivitas tidak valid.')
  return { agents: s.agents, tasks: s.tasks.map(t => ({ ...t, progress: t.progress ?? null, elapsed: 0, duration: 1 })), activities: s.activities, now: Date.now() }
}

export function createWebSocketAdapter(address: string): FarmAdapter {
  const url = new URL(address)
  if (!['ws:', 'wss:'].includes(url.protocol) || (location.protocol === 'https:' && url.protocol !== 'wss:') || url.username || url.password) throw new Error('Gunakan URL WebSocket ws:// atau wss:// yang valid, tanpa kredensial.')
  let snapshot: FarmSnapshot = { farm: emptyFarm(), mode: 'live', connection: 'connecting', error: null }
  const listeners = new Set<() => void>()
  let socket: WebSocket | undefined
  let disposed = false
  let timeout = 0
  const update = (patch: Partial<FarmSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn()) }
  const connect = () => {
    if (disposed) return
    socket?.close()
    clearTimeout(timeout)
    update({ connection: 'connecting', error: null })
    const ws = new WebSocket(url)
    socket = ws
    timeout = window.setTimeout(() => { if (socket === ws) { update({ connection: 'disconnected', error: 'Snapshot belum diterima dalam 12 detik.' }); ws.close() } }, 12000)
    ws.onopen = () => { if (socket === ws) ws.send(JSON.stringify({ type: 'subscribe' })) }
    ws.onmessage = e => {
      if (socket !== ws || disposed) return
      try {
        if (typeof e.data !== 'string' || e.data.length > 2_000_000) throw new Error('Pesan terlalu besar atau bukan JSON teks.')
        const message = JSON.parse(e.data)
        if (message.type === 'error') { update({ error: typeof message.message === 'string' ? message.message.slice(0, 1000) : 'Perintah ditolak backend.' }); return }
        if (message.type !== 'snapshot') return
        const farm = parseSnapshot(message.data)
        clearTimeout(timeout)
        update({ farm, connection: 'connected', error: null })
      } catch (error) { clearTimeout(timeout); update({ connection: 'disconnected', error: error instanceof Error ? error.message : 'Pesan backend tidak valid.' }); ws.close() }
    }
    ws.onclose = () => { if (socket === ws && !disposed) { clearTimeout(timeout); update({ connection: 'disconnected' }) } }
    ws.onerror = () => { if (socket === ws && !disposed) update({ connection: 'disconnected', error: 'Backend tidak dapat dihubungi. Periksa alamat dan izin koneksi.' }) }
  }
  connect()
  return {
    getSnapshot: () => snapshot,
    subscribe: fn => { listeners.add(fn); return () => { listeners.delete(fn) } },
    send: command => { if (socket?.readyState !== WebSocket.OPEN || snapshot.connection !== 'connected') throw new Error('Backend tidak terhubung.'); socket.send(JSON.stringify({ type: 'command', requestId: crypto.randomUUID(), command })) },
    reconnect: connect,
    disconnect: () => { socket?.close(); update({ connection: 'disconnected' }) },
    dispose: () => { disposed = true; clearTimeout(timeout); socket?.close(); listeners.clear() },
  }
}
