import { activeStatuses, agentColors, currentTask, type Agent, type FarmState, type Role, type Task } from './types'

export type Command =
  | { type: 'add'; name: string; role: Role }
  | { type: 'assign'; agentId: string; title: string; dependencyId?: string }
  | { type: 'pause' | 'resume' | 'cancel' | 'retry'; agentId: string }
  | { type: 'tick'; now: number }

export function createDemo(now = Date.now()): FarmState {
  const names = ['acong', 'jugar', 'oren', 'abu', 'paramengeow']
  const roles: Role[] = ['Coding', 'Riset', 'Data', 'Monitoring', 'Design']
  const tools: Agent['tool'][] = ['water', 'hoe', 'rake', 'shovel', 'basket']
  const agents = names.map((name, i) => ({ id: `a${i + 1}`, name, role: roles[i], color: agentColors[i], tool: tools[i], plotId: `p${i + 1}` }))
  const makeTask = (i: number, title: string, status: Task['status'], progress: number, duration: number, dependencyId?: string): Task => ({ id: `t${i}`, agentId: `a${i}`, title, status, progress, duration, elapsed: 0, dependencyId, startedAt: now - 120000, updatedAt: now, logs: [{ at: now - 10000, message: status === 'error' ? 'Layanan upstream tidak merespons. Coba ulang tugas.' : 'Workspace siap. Status agent tersinkron.' }] })
  return { agents, tasks: [makeTask(1, 'Membangun authentication API', 'running', 42, 190), makeTask(2, 'Riset arsitektur multi-agent', 'running', 68, 160), makeTask(3, 'Menyiapkan pipeline dataset', 'waiting', 12, 130, 't2'), makeTask(4, 'Memeriksa kesehatan endpoint', 'error', 27, 100)], activities: [
    { id: 'e1', agentId: 'a4', at: now - 10000, message: 'abu: koneksi endpoint timeout', kind: 'error' },
    { id: 'e2', agentId: 'a1', at: now - 45000, message: 'acong mulai membangun authentication API', kind: 'info' },
    { id: 'e3', agentId: 'a3', at: now - 70000, message: 'oren menunggu hasil riset jugar', kind: 'info' },
    { id: 'e4', agentId: 'a2', at: now - 120000, message: 'jugar memulai riset arsitektur', kind: 'info' },
  ], now }
}

function event(state: FarmState, agentId: string, message: string, now: number, kind: 'info' | 'success' | 'error' = 'info'): FarmState {
  const name = state.agents.find(a => a.id === agentId)?.name ?? 'Agent'
  return { ...state, activities: [{ id: crypto.randomUUID(), agentId, at: now, message: `${name}: ${message}`, kind }, ...state.activities].slice(0, 80) }
}

export function reduceFarm(state: FarmState, command: Command): FarmState {
  const now = command.type === 'tick' ? command.now : Date.now()
  if (command.type === 'add') {
    const name = command.name.trim()
    if (!name || name.length > 32 || state.agents.length >= 12) return state
    const index = state.agents.length
    const agent: Agent = { id: crypto.randomUUID(), name, role: command.role, color: agentColors[index] ?? '#7e8b83', tool: (['water', 'hoe', 'rake', 'shovel', 'basket'] as const)[index % 5], plotId: `p${index % 6 + 1}` }
    return event({ ...state, agents: [...state.agents, agent] }, agent.id, 'bergabung dengan farm', now)
  }
  if (command.type === 'tick') {
    const dt = Math.min(2, Math.max(0, (now - state.now) / 1000))
    let next = { ...state, now }
    next = { ...next, tasks: state.tasks.map(task => {
      let t = { ...task }
      if (t.status === 'waiting') {
        const dependency = state.tasks.find(d => d.id === t.dependencyId)
        if (dependency?.status === 'completed') t = { ...t, status: 'walking', elapsed: 0, updatedAt: now }
        else if (!dependency || ['cancelled', 'error'].includes(dependency.status)) {
          t = { ...t, status: 'error', updatedAt: now, logs: [...t.logs, { at: now, message: 'Dependensi gagal atau tidak ditemukan. Perbaiki, lalu coba ulang.' }] }
          next = event(next, t.agentId, 'dependensi tidak tersedia', now, 'error')
        }
      } else if (t.status === 'walking') {
        t.elapsed += dt
        if (t.elapsed >= 6) t = { ...t, status: 'running', elapsed: 0, updatedAt: now, logs: [...t.logs, { at: now, message: 'Tiba di lahan. Mulai mengerjakan tugas.' }] }
      } else if (t.status === 'running') {
        t.progress = Math.min(100, (t.progress ?? 0) + dt / t.duration * 100)
        t.elapsed += dt
        if (t.progress >= 100) {
          t = { ...t, status: 'completed', elapsed: 0, updatedAt: now, logs: [...t.logs, { at: now, message: 'Tugas selesai. Hasil panen dikirim ke gudang.' }] }
          next = event(next, t.agentId, 'tugas selesai, mengantar hasil panen', now, 'success')
        }
      }
      return t
    }) }
    return next
  }
  const agent = state.agents.find(a => a.id === command.agentId)
  if (!agent) return state
  const task = currentTask(state, agent.id)
  if (command.type === 'assign') {
    const title = command.title.trim()
    if (!title || title.length > 160 || (task && activeStatuses.includes(task.status))) return state
    const dependency = command.dependencyId ? state.tasks.find(t => t.id === command.dependencyId && t.agentId !== agent.id) : undefined
    if (command.dependencyId && !dependency) return state
    const newTask: Task = { id: crypto.randomUUID(), agentId: agent.id, title, status: dependency && dependency.status !== 'completed' ? 'waiting' : 'walking', progress: 0, elapsed: 0, duration: 90 + state.agents.indexOf(agent) * 15, startedAt: now, updatedAt: now, dependencyId: dependency?.id, logs: [{ at: now, message: 'Tugas diterima. Alat kerja disiapkan.' }] }
    return event({ ...state, tasks: [newTask, ...state.tasks] }, agent.id, `menerima tugas: ${title}`, now)
  }
  if (!task) return state
  let status = task.status
  if (command.type === 'pause' && ['running', 'walking', 'waiting'].includes(status)) status = 'paused'
  else if (command.type === 'resume' && status === 'paused') status = task.dependencyId && state.tasks.find(t => t.id === task.dependencyId)?.status !== 'completed' ? 'waiting' : 'walking'
  else if (command.type === 'cancel' && activeStatuses.includes(status)) status = 'cancelled'
  else if (command.type === 'retry' && status === 'error') status = task.dependencyId && state.tasks.find(t => t.id === task.dependencyId)?.status !== 'completed' ? 'waiting' : 'walking'
  else return state
  const message = { pause: 'tugas dijeda', resume: 'tugas dilanjutkan', cancel: 'tugas dibatalkan', retry: 'mencoba ulang tugas' }[command.type]
  return event({ ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, status, elapsed: 0, updatedAt: now, logs: [...t.logs, { at: now, message }].slice(-30) } : t) }, agent.id, message, now)
}
