import type { Plant, GrowthRecord, CareLog, CareSchedule } from './plant'

export type TimelineItem =
  | { kind: 'growth'; id: string; date: string; data: GrowthRecord }
  | { kind: 'care'; id: string; date: string; data: CareLog }

/** 待办项：根据养护计划 + 最近完成时间计算下次到期日 */
export interface DueTask {
  plant: Plant
  schedule: CareSchedule
  nextDue: string // YYYY-MM-DD
  lastDoneAt: string | null // ISO
}

export interface AppSettings {
  location: string
  /** IANA 时区，如 Asia/Shanghai；空则按所在地推断，再退回浏览器时区 */
  timeZone: string
  suburb?: string
  latitude?: number | null
  longitude?: number | null
}

export interface GardenMapMeta {
  id: string
  imageUrl: string
  name: string
  createdAt: string
  updatedAt: string
}

/** 某日气温与降水（YYYY-MM-DD，与日历格一致） */
export interface DailyWeather {
  date: string
  tempMaxC: number | null
  tempMinC: number | null
  precipitationMm: number | null
  source?: 'auto' | 'user'
  fetchedAt?: string
  updatedAt: string
}

