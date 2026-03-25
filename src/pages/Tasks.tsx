import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDueTasks, addCareLog, deleteCareSchedule, updateCareSchedule } from '../lib/storage-api'
import type { DueTask } from '../lib/storage-api'
import { CARE_TASK_TYPES } from '../types/plant'
import { MarkdownView } from '../components/MarkdownView'
import { MarkdownTextarea } from '../components/MarkdownTextarea'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('zh-CN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function TaskRow({
  task,
  onComplete,
  onAfterChange,
}: {
  task: DueTask
  onComplete: (doneAt: string) => void
  onAfterChange: () => void
}) {
  const label = CARE_TASK_TYPES.find((t) => t.value === task.schedule.taskType)?.label ?? task.schedule.taskType
  const isOverdue = task.nextDue < new Date().toISOString().slice(0, 10)
  const [editing, setEditing] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completeDate, setCompleteDate] = useState(() => new Date().toISOString().slice(0, 10))
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
        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
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
          onClick={() => {
            setCompleteDate(new Date().toISOString().slice(0, 10))
            setShowCompleteDialog(true)
          }}
          className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          完成
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

      {showCompleteDialog && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <label className="block text-sm font-medium text-stone-700 mb-2">完成日期</label>
          <input
            type="date"
            value={completeDate}
            onChange={(e) => setCompleteDate(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                const doneAt = new Date(completeDate + 'T12:00:00').toISOString()
                onComplete(doneAt)
                setShowCompleteDialog(false)
              }}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              确认完成
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteDialog(false)}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
            >
              取消
            </button>
          </div>
        </div>
      )}

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
  const [todayTasks, setTodayTasks] = useState<DueTask[]>([])
  const [weekTasks, setWeekTasks] = useState<DueTask[]>([])

  const refresh = async () => {
    const [today, week] = await Promise.all([getDueTasks('today'), getDueTasks('week')])
    const todayStr = new Date().toISOString().slice(0, 10)
    setTodayTasks(today)
    setWeekTasks(week.filter((t) => t.nextDue > todayStr))
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleComplete = async (task: DueTask, doneAt: string) => {
    await addCareLog({
      plantId: task.plant.id,
      taskType: task.schedule.taskType,
      doneAt,
    })
    refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">待办任务</h1>
      <p className="text-stone-600 mb-6">按养护计划生成的今日与本周到期任务</p>

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
                onComplete={(doneAt) => handleComplete(task, doneAt)}
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
                onComplete={(doneAt) => handleComplete(task, doneAt)}
                onAfterChange={refresh}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
