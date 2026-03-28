export interface Plant {
  id: string
  name: string
  variety: string
  location: string
  plantedAt: string // ISO date
  photoUrl?: string
  notes?: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export type PlantInput = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

/** 养护任务类型 */
export const CARE_TASK_TYPES = [
  { value: 'watering', label: '浇水' },
  { value: 'fertilizing', label: '施肥' },
  { value: 'pruning', label: '修剪' },
  { value: 'repotting', label: '换盆' },
  { value: 'pest_control', label: '除虫' },
  { value: 'mulch', label: 'Mulch' },
  { value: 'mowing', label: '割草' },
  { value: 'other', label: '其他' },
] as const

export type CareTaskType = (typeof CARE_TASK_TYPES)[number]['value']

/** 展示养护间隔：0 天表示一次性任务 */
export function formatScheduleInterval(intervalDays: number): string {
  if (intervalDays === 0) return '一次性'
  return `每 ${intervalDays} 天`
}

/** 生长记录 */
export interface GrowthRecord {
  id: string
  plantId: string
  date: string // ISO date
  height?: number
  leafCount?: number
  healthScore?: number // 1-5
  photoUrl?: string
  notes?: string
  createdAt: string
}

/** 养护记录 */
export interface CareLog {
  id: string
  plantId: string
  taskType: CareTaskType
  doneAt: string // ISO
  notes?: string
  createdAt: string
}

/** 跳过养护任务的记录（用于推进到下一周期，但不视为“已完成”） */
export interface CareSkip {
  id: string
  plantId: string
  taskType: CareTaskType
  skippedAt: string // ISO
  notes?: string
  createdAt: string
}

/** 养护计划（周期） */
export interface CareSchedule {
  id: string
  plantId: string
  /** shared=同品种共享；plant=仅当前植株 */
  scope?: 'shared' | 'plant'
  taskType: CareTaskType
  intervalDays: number
  /** 可选：开始日期（YYYY-MM-DD）。为空则立即生效 */
  startDate?: string
  /** 可选：截止日期（YYYY-MM-DD）。为空则长期有效 */
  endDate?: string
  /** 可选：备注/注意事项（用于提醒） */
  note?: string
  createdAt: string
}
