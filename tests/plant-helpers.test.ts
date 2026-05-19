import { describe, expect, it } from 'vitest'
import { CARE_TASK_TYPES, archiveReasonLabel, formatScheduleInterval } from '../src/types/plant'

describe('plant helpers', () => {
  it('formatScheduleInterval', () => {
    expect(formatScheduleInterval(0)).toBe('一次性')
    expect(formatScheduleInterval(7)).toBe('每 7 天')
  })

  it('archiveReasonLabel maps all reasons', () => {
    expect(archiveReasonLabel('death')).toBe('死亡')
    expect(archiveReasonLabel('moved')).toBe('迁走')
    expect(archiveReasonLabel('other')).toBe('其他')
    expect(archiveReasonLabel(undefined)).toBe('其他')
  })

  it('CARE_TASK_TYPES includes mulch in Chinese', () => {
    const mulch = CARE_TASK_TYPES.find((t) => t.value === 'mulch')
    expect(mulch?.label).toBe('铺盖')
  })
})
