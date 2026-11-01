export type DayPeriod = 'morning' | 'day' | 'evening' | 'night'
export function dayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours()
  return hour < 5 || hour >= 18 ? 'night' : hour < 11 ? 'morning' : hour < 15 ? 'day' : 'evening'
}
export const periodLabel: Record<DayPeriod, string> = { morning: 'Pagi', day: 'Siang', evening: 'Sore', night: 'Malam' }
