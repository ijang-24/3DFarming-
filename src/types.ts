export type Status = 'idle' | 'walking' | 'running' | 'waiting' | 'paused' | 'completed' | 'cancelled' | 'error'
export type Role = 'Coding' | 'Riset' | 'Data' | 'Monitoring' | 'Design'
export type Tool = 'water' | 'hoe' | 'basket' | 'rake' | 'shovel'
export interface Agent { id: string; name: string; role: Role; color: string; tool: Tool; plotId: string }
export interface Task {
  id: string; agentId: string; title: string; status: Exclude<Status, 'idle'>
  progress: number | null; startedAt: number; updatedAt: number; elapsed: number
  duration: number; dependencyId?: string; logs: { at: number; message: string }[]
}
export interface Activity { id: string; agentId: string; at: number; message: string; kind: 'info' | 'success' | 'error' }
export interface FarmState { agents: Agent[]; tasks: Task[]; activities: Activity[]; now: number }
export interface Plot { id: string; name: string; project: string; crop: string; position: [number, number, number] }
export const plots: Plot[] = [
  { id: 'p1', name: 'Lahan 01', project: 'Platform & API', crop: 'Wortel', position: [-6, 0, 1] },
  { id: 'p2', name: 'Lahan 02', project: 'Research lab', crop: 'Kubis', position: [0, 0, 1] },
  { id: 'p3', name: 'Lahan 03', project: 'Data pipeline', crop: 'Gandum', position: [6, 0, 1] },
  { id: 'p4', name: 'Lahan 04', project: 'System health', crop: 'Tomat', position: [-6, 0, 6] },
  { id: 'p5', name: 'Lahan 05', project: 'Design system', crop: 'Labu', position: [0, 0, 6] },
  { id: 'p6', name: 'Lahan 06', project: 'Proyek baru', crop: 'Siap ditanam', position: [6, 0, 6] },
]
export const statusText: Record<Status, string> = { idle: 'Istirahat', walking: 'Menuju lahan', running: 'Bekerja', waiting: 'Menunggu', paused: 'Dijeda', completed: 'Selesai', cancelled: 'Dibatalkan', error: 'Error' }
export const agentColors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
export const currentTask = (state: FarmState, agentId: string) => state.tasks.find(t => t.agentId === agentId)
export const agentStatus = (state: FarmState, agentId: string): Status => currentTask(state, agentId)?.status ?? 'idle'
export const activeStatuses: Status[] = ['walking', 'running', 'waiting', 'paused']
