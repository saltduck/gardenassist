import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getDueTasksForDate,
  getCareLogsForDate,
  getAllPlants,
} from '../lib/storage-api'
import type { DueTask } from '../lib/storage-api'
import type { CareLog, Plant } from '../types/plant'
import { CARE_TASK_TYPES } from '../types/plant'

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startWeekday = first.getDay()
  const daysInMonth = last.getDate()
  const grid: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return grid
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateOnly(now))
  const [plants, setPlants] = useState<Plant[]>([])
  const [dueTasksByDate, setDueTasksByDate] = useState<Record<string, DueTask[]>>({})
  const [logsByDate, setLogsByDate] = useState<Record<string, CareLog[]>>({})

  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  useEffect(() => {
    getAllPlants().then(setPlants)
  }, [])

  useEffect(() => {
    const days = grid.filter((d): d is string => d !== null)
    if (days.length === 0) return
    Promise.all(
      days.map(async (d) => {
        const [due, logs] = await Promise.all([getDueTasksForDate(d), getCareLogsForDate(d)])
        return { d, due, logs }
      })
    ).then((results) => {
      const dueMap: Record<string, DueTask[]> = {}
      const logsMap: Record<string, CareLog[]> = {}
      results.forEach(({ d, due, logs }) => {
        dueMap[d] = due
        logsMap[d] = logs
      })
      setDueTasksByDate(dueMap)
      setLogsByDate(logsMap)
    })
  }, [grid])

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }
  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
    setSelectedDate(toDateOnly(t))
  }

  const todayStr = toDateOnly(new Date())

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">日历</h1>
      <p className="text-stone-600 mb-6">按日查看计划与已完成的养护</p>

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium text-stone-800">
              {year} 年 {month + 1} 月
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100"
              >
                今天
              </button>
              <button
                type="button"
                onClick={prevMonth}
                className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100"
              >
                上月
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100"
              >
                下月
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-xs font-medium text-stone-500">
                {w}
              </div>
            ))}
            {grid.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const dueCount = dueTasksByDate[day]?.length ?? 0
              const doneCount = logsByDate[day]?.length ?? 0
              const isToday = day === todayStr
              const isSelected = day === selectedDate
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[72px] rounded border p-1 text-left text-sm transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : isToday
                        ? 'border-amber-400 bg-amber-50/50'
                        : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className={isToday ? 'font-semibold text-amber-700' : 'text-stone-700'}>
                    {day.slice(8)}
                  </span>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dueCount > 0 && (
                      <span className="rounded bg-amber-200 px-1 text-[10px] text-amber-800" title="到期">
                        {dueCount}
                      </span>
                    )}
                    {doneCount > 0 && (
                      <span className="rounded bg-emerald-200 px-1 text-[10px] text-emerald-800" title="已完成">
                        {doneCount}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedDate && (
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm min-w-[280px]">
            <h2 className="text-lg font-medium text-stone-800 mb-3">
              {selectedDate}（{new Date(selectedDate + 'T12:00:00').toLocaleDateString('zh-CN', { weekday: 'long' })}）
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-amber-700 mb-2">到期任务</h3>
                {(dueTasksByDate[selectedDate] ?? []).length === 0 ? (
                  <p className="text-stone-500 text-sm">无</p>
                ) : (
                  <ul className="space-y-1">
                    {(dueTasksByDate[selectedDate] ?? []).map((t) => (
                      <li key={t.schedule.id}>
                        <Link
                          to={`/plants/${t.plant.id}`}
                          className="text-sm text-stone-700 hover:text-emerald-600 hover:underline"
                        >
                          {t.plant.name}
                        </Link>
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          {CARE_TASK_TYPES.find((x) => x.value === t.schedule.taskType)?.label ?? t.schedule.taskType}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-emerald-700 mb-2">已完成</h3>
                {(logsByDate[selectedDate] ?? []).length === 0 ? (
                  <p className="text-stone-500 text-sm">无</p>
                ) : (
                  <ul className="space-y-1">
                    {(logsByDate[selectedDate] ?? []).map((log) => {
                      const plant = plants.find((p) => p.id === log.plantId)
                      return (
                        <li key={log.id} className="text-sm">
                          <Link
                            to={`/plants/${log.plantId}`}
                            className="text-stone-700 hover:text-emerald-600 hover:underline"
                          >
                            {plant?.name ?? log.plantId}
                          </Link>
                          <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                            {CARE_TASK_TYPES.find((x) => x.value === log.taskType)?.label ?? log.taskType}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
