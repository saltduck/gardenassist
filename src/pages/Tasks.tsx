import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDueTasks, addCareLog, addCareSkip, deleteCareSchedule, updateCareSchedule } from '../lib/storage-api'
import type { DueTask } from '../lib/storage-api'
import type { CareTaskType } from '../types/plant'
import { CARE_TASK_TYPES } from '../types/plant'
import { MarkdownView } from '../components/MarkdownView'
import { MarkdownTextarea } from '../components/MarkdownTextarea'
import { getUserSettings } from '../lib/user-settings'
import { getBrowserIanaTimeZone, getTimeZoneOffsetMinutes, resolveCalendarTimeZone, toYmdInTimeZone } from '../lib/calendar-timezone'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('zh-CN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function dueRowKey(task: DueTask): string {
  return `${task.schedule.id}-${task.nextDue}`
}

async function fetchDueTaskLists(tzOffsetMinutes: number, todayStr: string): Promise<{ today: DueTask[]; week: DueTask[] }> {
  const [today, week] = await Promise.all([getDueTasks('today', tzOffsetMinutes), getDueTasks('week', tzOffsetMinutes)])
  return { today, week: week.filter((t) => t.nextDue > todayStr) }
}

/**
 * 合并服务端列表：短时内隐藏「刚标记完成」的行，避免读滞后把旧数据 setState 回去。
 */
function consumeFetchedDueLists(
  todayRaw: DueTask[],
  weekRaw: DueTask[],
  hideRef: { current: Set<string> },
  setToday: (v: DueTask[]) => void,
  setWeek: (v: DueTask[]) => void
): void {
  const hide = hideRef.current
  for (const key of [...hide]) {
    const stillInResponse =
      todayRaw.some((t) => dueRowKey(t) === key) || weekRaw.some((t) => dueRowKey(t) === key)
    if (!stillInResponse) hide.delete(key)
  }
  setToday(todayRaw.filter((t) => !hide.has(dueRowKey(t))))
  setWeek(weekRaw.filter((t) => !hide.has(dueRowKey(t))))
}

/** 待办列表：任务种类标签配色（与「范围」蓝/灰标签区分，避免混淆） */
const CARE_TASK_BADGE: Record<CareTaskType, string> = {
  watering: 'bg-sky-100 text-sky-900 border border-sky-300',
  fertilizing: 'bg-amber-100 text-amber-900 border border-amber-300',
  pruning: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  repotting: 'bg-orange-100 text-orange-900 border border-orange-300',
  pest_control: 'bg-rose-100 text-rose-900 border border-rose-300',
  mulch: 'bg-stone-200 text-stone-900 border border-stone-400',
  mowing: 'bg-lime-100 text-lime-900 border border-lime-400',
  other: 'bg-violet-100 text-violet-900 border border-violet-300',
}

function careTaskTypeBadgeClass(taskType: string): string {
  return CARE_TASK_BADGE[taskType as CareTaskType] ?? 'bg-slate-100 text-slate-800 border border-slate-300'
}

function TaskRow({
  task,
  todayStr,
  onOpenComplete,
  onAfterChange,
}: {
  task: DueTask
  todayStr: string
  onOpenComplete: () => void
  onAfterChange: () => void
}) {
  const label = CARE_TASK_TYPES.find((t) => t.value === task.schedule.taskType)?.label ?? task.schedule.taskType
  const isOverdue = task.nextDue < todayStr
  const [editing, setEditing] = useState(false)
  const [taskType, setTaskType] = useState(task.schedule.taskType)
  const [intervalDays, setIntervalDays] = useState(String(task.schedule.intervalDays))
  const [startDate, setStartDate] = useState(task.schedule.startDate ?? '')
  const [endDate, setEndDate] = useState(task.schedule.endDate ?? '')
  const [note, setNote] = useState(task.schedule.note ?? '')

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/plants/${task.plant.id}`}
          className="font-medium text-stone-800 hover:text-emerald-600 hover:underline"
        >
          {task.plant.name}
        </Link>
        <span
          className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-sm font-medium ${careTaskTypeBadgeClass(task.schedule.taskType)}`}
        >
          {label}
        </span>
        <span className={`ml-2 rounded px-2 py-0.5 text-xs ${task.schedule.scope === 'plant' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
          {task.schedule.scope === 'plant' ? '仅此植株' : '同品种共享'}
        </span>
        {task.schedule.note && (
          <div className="ml-2 text-xs text-stone-500">
            <span>· </span>
            <MarkdownView value={task.schedule.note} />
          </div>
        )}
        <span className={`ml-2 text-sm ${isOverdue ? 'text-red-600' : 'text-stone-500'}`}>
          {formatDate(task.nextDue)}
          {isOverdue && '（已逾期）'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={onOpenComplete}
          className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          完成
        </button>
        <button
          type="button"
          onClick={async () => {
            const msg =
              task.schedule.scope === 'shared'
                ? '跳过本次到期任务（同品种共享计划）？跳过后会进入下一周期。'
                : '跳过本次到期任务（仅此植株计划）？跳过后会进入下一周期。'
            if (!window.confirm(msg)) return
            await addCareSkip({
              plantId: task.plant.id,
              taskType: task.schedule.taskType,
              skippedAt: `${task.nextDue}T12:00:00.000Z`,
            })
            onAfterChange()
          }}
          className="shrink-0 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          跳过
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 rounded border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          {editing ? '收起编辑' : '编辑任务'}
        </button>
        <button
          type="button"
          onClick={async () => {
            const msg =
              task.schedule.scope === 'shared'
                ? '删除该任务（同品种共享计划）？删除后会影响该品种的其它植株。'
                : '删除该任务（仅此植株计划）？删除后只影响当前植株。'
            if (!window.confirm(msg)) return
            await deleteCareSchedule(task.schedule.id)
            onAfterChange()
          }}
          className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          删除任务
        </button>
      </div>

      {editing && (
        <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs ${task.schedule.scope === 'plant' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
              {task.schedule.scope === 'plant' ? '仅此植株' : '同品种共享'}
            </span>
            <span className="text-xs text-stone-500">编辑仅修改周期与备注，不改变计划范围</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">类型</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
                className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              >
                {CARE_TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">间隔（天，0=一次性）</label>
              <input
                type="number"
                min={0}
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">开始日期（可选）</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">截止日期（可选）</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-stone-600 mb-1">备注（可选）</label>
            <MarkdownTextarea
              value={note}
              onChange={setNote}
              rows={2}
              placeholder="例如：夏天避开中午浇水；施肥先浇透水等"
              textareaClassName="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button
              type="button"
              onClick={async () => {
                const days = Number(intervalDays)
                if (!Number.isFinite(days) || days < 0) return
                await updateCareSchedule(task.schedule.id, {
                  taskType,
                  intervalDays: days,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  note: note || undefined,
                })
                setEditing(false)
                onAfterChange()
              }}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              保存修改
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskType(task.schedule.taskType)
                setIntervalDays(String(task.schedule.intervalDays))
                setStartDate(task.schedule.startDate ?? '')
                setEndDate(task.schedule.endDate ?? '')
                setNote(task.schedule.note ?? '')
                setEditing(false)
              }}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function Tasks() {
  const [calendarTz, setCalendarTz] = useState(getBrowserIanaTimeZone())
  const [tzOffsetMinutes, setTzOffsetMinutes] = useState(new Date().getTimezoneOffset())
  const [todayStr, setTodayStr] = useState(toYmdInTimeZone(new Date(), getBrowserIanaTimeZone()))
  const [todayTasks, setTodayTasks] = useState<DueTask[]>([])
  const [weekTasks, setWeekTasks] = useState<DueTask[]>([])
  const [completeTask, setCompleteTask] = useState<DueTask | null>(null)
  const [completeDate, setCompleteDate] = useState('')
  const [completeSubmitting, setCompleteSubmitting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  /** 刚完成但服务端读仍可能滞后的行键，合并任意一次拉列表时都会先隐藏 */
  const pendingHideRowKeysRef = useRef<Set<string>>(new Set())

  const applyFetched = useCallback(
    (todayRaw: DueTask[], weekRaw: DueTask[]) => {
      consumeFetchedDueLists(todayRaw, weekRaw, pendingHideRowKeysRef, setTodayTasks, setWeekTasks)
    },
    [setTodayTasks, setWeekTasks]
  )

  const refresh = useCallback(async () => {
    const { today, week } = await fetchDueTaskLists(tzOffsetMinutes, todayStr)
    applyFetched(today, week)
  }, [tzOffsetMinutes, todayStr, applyFetched])

  useEffect(() => {
    getUserSettings()
      .then((s) => {
        const tz = resolveCalendarTimeZone(s)
        setCalendarTz(tz)
        setTzOffsetMinutes(getTimeZoneOffsetMinutes(tz))
        setTodayStr(toYmdInTimeZone(new Date(), tz))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { today, week } = await fetchDueTaskLists(tzOffsetMinutes, todayStr)
        if (cancelled) return
        applyFetched(today, week)
      } catch {
        /* 忽略 */ 
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tzOffsetMinutes, todayStr, applyFetched])

  const submitComplete = async () => {
    const task = completeTask
    if (!task || !completeDate || completeSubmitting) return
    const rowKey = dueRowKey(task)
    setCompleteError(null)
    setCompleteSubmitting(true)
    try {
      await addCareLog({
        plantId: task.plant.id,
        taskType: task.schedule.taskType,
        doneAt: `${completeDate}T12:00:00.000Z`,
      })
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : '标记完成失败')
      setCompleteSubmitting(false)
      return
    }

    pendingHideRowKeysRef.current.add(rowKey)
    window.setTimeout(() => pendingHideRowKeysRef.current.delete(rowKey), 25_000)
    // 先做乐观隐藏，但保持弹窗在“提交中”状态，直到刷新完成再关闭
    setTodayTasks((prev) => prev.filter((t) => !pendingHideRowKeysRef.current.has(dueRowKey(t))))
    setWeekTasks((prev) => prev.filter((t) => !pendingHideRowKeysRef.current.has(dueRowKey(t))))

    try {
      let rowGone = false
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt))
        const { today, week } = await fetchDueTaskLists(tzOffsetMinutes, todayStr)
        applyFetched(today, week)
        const rawStill =
          today.some((t) => dueRowKey(t) === rowKey) || week.some((t) => dueRowKey(t) === rowKey)
        if (!rawStill) {
          rowGone = true
          break
        }
      }
      // 即便多次轮询仍读到旧数据，也不阻塞用户；hide 集会继续防止旧行被渲染回来
      if (!rowGone) {
        await refresh()
      }
      setCompleteTask(null)
    } catch {
      try {
        await refresh()
      } catch {
        /* 已由 hide 集保证列表不显式拉回完成任务 */
      }
      setCompleteTask(null)
    } finally {
      setCompleteSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">待办任务</h1>
      <p className="text-stone-600 mb-6">按养护计划生成的今日与本周到期任务</p>
      <p className="text-xs text-stone-500 mb-4">日期计算时区：{calendarTz}</p>

      <section className="mb-8">
        <h2 className="text-lg font-medium text-stone-800 mb-3">今日待办</h2>
        {todayTasks.length === 0 ? (
          <p className="text-stone-500 text-sm rounded-lg border border-stone-200 bg-white p-4">
            暂无今日到期的养护任务
          </p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((task) => (
              <TaskRow
                key={`${task.schedule.id}-${task.nextDue}`}
                task={task}
                todayStr={todayStr}
                onOpenComplete={() => {
                  setCompleteError(null)
                  setCompleteDate(todayStr)
                  setCompleteTask(task)
                }}
                onAfterChange={refresh}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-800 mb-3">本周待办</h2>
        {weekTasks.length === 0 ? (
          <p className="text-stone-500 text-sm rounded-lg border border-stone-200 bg-white p-4">
            暂无本周其余到期的养护任务
          </p>
        ) : (
          <ul className="space-y-2">
            {weekTasks.map((task) => (
              <TaskRow
                key={`${task.schedule.id}-${task.nextDue}`}
                task={task}
                todayStr={todayStr}
                onOpenComplete={() => {
                  setCompleteError(null)
                  setCompleteDate(todayStr)
                  setCompleteTask(task)
                }}
                onAfterChange={refresh}
              />
            ))}
          </ul>
        )}
      </section>

      {completeTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-task-title"
          onClick={() => {
            if (!completeSubmitting) setCompleteTask(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="complete-task-title" className="text-lg font-medium text-stone-800 mb-1">
              标记完成
            </h2>
            <p className="text-sm text-stone-600 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-stone-800">{completeTask.plant.name}</span>
              <span>·</span>
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${careTaskTypeBadgeClass(completeTask.schedule.taskType)}`}
              >
                {CARE_TASK_TYPES.find((t) => t.value === completeTask.schedule.taskType)?.label ??
                  completeTask.schedule.taskType}
              </span>
            </p>
            <label className="block text-xs font-medium text-stone-600 mb-1">完成日期</label>
            <input
              type="date"
              value={completeDate}
              onChange={(e) => setCompleteDate(e.target.value)}
              disabled={completeSubmitting}
              className="mb-2 w-full rounded border border-stone-300 px-2 py-1.5 text-sm disabled:opacity-60"
            />
            {completeError && <p className="mb-3 text-xs text-red-600">{completeError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={completeSubmitting}
                onClick={() => {
                  if (!completeSubmitting) setCompleteTask(null)
                }}
                className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={completeSubmitting}
                onClick={() => void submitComplete()}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {completeSubmitting ? '提交中…' : '确认完成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
