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
}

