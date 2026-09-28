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
  { value: 'other', label: '其他' },
] as const

export type CareTaskType = (typeof CARE_TASK_TYPES)[number]['value']

export function careTaskTypeLabel(taskType: string): string {
  return CARE_TASK_TYPES.find((t) => t.value === taskType)?.label ?? taskType
}

/** 计划展示名：有名称用名称，否则用类型标签 */
export function scheduleDisplayName(schedule: { name?: string | null; taskType: string }): string {
  const name = schedule.name?.trim()
  return name || careTaskTypeLabel(schedule.taskType)
}

/** 养护记录展示名：执行计划时写入的名称优先，否则用类型标签 */
export function careLogDisplayName(log: { name?: string | null; taskType: string }): string {
  const name = log.name?.trim()
  return name || careTaskTypeLabel(log.taskType)
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
  /** 执行养护计划时的名称快照；手动记录为空，展示时回退到任务类型 */
  name?: string
  /** 来源计划 id（plant: / tpl:）；手动记录为空 */
  scheduleId?: string
  createdAt: string
}

/** 养护计划（周期） */
export interface CareSchedule {
  id: string
  plantId: string
  /** shared=同品种共享；plant=仅当前植株 */
  scope?: 'shared' | 'plant'
  /** 计划名称。空值在写入时回落到任务类型的中文标签 */
  name: string
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
