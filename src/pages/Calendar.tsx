import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getDueTasksForDate,
  getCareLogsForDate,
  getAllPlants,
  getWeatherForRange,
  upsertDailyWeather,
  deleteDailyWeather,
} from '../lib/storage-api'
import type { DueTask } from '../lib/storage-api'
import type { DailyWeather } from '../types/data'
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

function formatPrecipMm(mm: number): string {
  return Math.abs(mm - Math.round(mm)) < 1e-6 ? String(Math.round(mm)) : mm.toFixed(1)
}

function tempLine(w: DailyWeather | undefined): string | null {
  if (!w) return null
  const { tempMinC: lo, tempMaxC: hi } = w
  if (lo != null && hi != null) return `${Math.round(lo)}–${Math.round(hi)}°`
  if (hi != null) return `${Math.round(hi)}°`
  if (lo != null) return `${Math.round(lo)}°`
  return null
}

export function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateOnly(now))
  const [plants, setPlants] = useState<Plant[]>([])
  const [dueTasksByDate, setDueTasksByDate] = useState<Record<string, DueTask[]>>({})
  const [logsByDate, setLogsByDate] = useState<Record<string, CareLog[]>>({})
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DailyWeather>>({})
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [tempMaxStr, setTempMaxStr] = useState('')
  const [tempMinStr, setTempMinStr] = useState('')
  const [precipStr, setPrecipStr] = useState('')
  const [weatherSaving, setWeatherSaving] = useState(false)
  const [weatherFormError, setWeatherFormError] = useState<string | null>(null)

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

  useEffect(() => {
    const days = grid.filter((d): d is string => d !== null)
    if (days.length === 0) return
    const from = days[0]
    const to = days[days.length - 1]
    setWeatherError(null)
    getWeatherForRange(from, to)
      .then((rows) => {
        const m: Record<string, DailyWeather> = {}
        for (const r of rows) m[r.date] = r
        setWeatherByDate(m)
      })
      .catch((e) => setWeatherError(e instanceof Error ? e.message : '天气数据加载失败'))
  }, [grid])

  useEffect(() => {
    if (!selectedDate) return
    const w = weatherByDate[selectedDate]
    setTempMaxStr(w?.tempMaxC != null ? String(w.tempMaxC) : '')
    setTempMinStr(w?.tempMinC != null ? String(w.tempMinC) : '')
    setPrecipStr(w?.precipitationMm != null ? String(w.precipitationMm) : '')
    setWeatherFormError(null)
  }, [selectedDate, weatherByDate])

  const parseWeatherField = (s: string): number | null => {
    const t = s.trim()
    if (t === '') return null
    const n = Number(t)
    if (!Number.isFinite(n)) throw new Error('气温与降水量须为有效数字')
    return n
  }

  const saveWeatherForSelected = async () => {
    if (!selectedDate) return
    setWeatherFormError(null)
    let tempMaxC: number | null
    let tempMinC: number | null
    let precipitationMm: number | null
    try {
      tempMaxC = parseWeatherField(tempMaxStr)
      tempMinC = parseWeatherField(tempMinStr)
      precipitationMm = parseWeatherField(precipStr)
    } catch (e) {
      setWeatherFormError(e instanceof Error ? e.message : '输入无效')
      return
    }
    setWeatherSaving(true)
    try {
      const updated = await upsertDailyWeather(selectedDate, {
        tempMaxC,
        tempMinC,
        precipitationMm,
      })
      const empty =
        updated.tempMaxC == null && updated.tempMinC == null && updated.precipitationMm == null
      setWeatherByDate((prev) => {
        const next = { ...prev }
        if (empty) delete next[selectedDate]
        else next[selectedDate] = updated
        return next
      })
    } catch (e) {
      setWeatherFormError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setWeatherSaving(false)
    }
  }

  const clearWeatherForSelected = async () => {
    if (!selectedDate) return
    setWeatherFormError(null)
    setWeatherSaving(true)
    try {
      await deleteDailyWeather(selectedDate)
      setWeatherByDate((prev) => {
        const next = { ...prev }
        delete next[selectedDate]
        return next
      })
      setTempMaxStr('')
      setTempMinStr('')
      setPrecipStr('')
    } catch (e) {
      setWeatherFormError(e instanceof Error ? e.message : '清除失败')
    } finally {
      setWeatherSaving(false)
    }
  }

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
      <p className="text-stone-600 mb-6">按日查看养护计划、完成记录，以及当日气温与降水</p>

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
              const w = weatherByDate[day]
              const tLine = tempLine(w)
              const precip = w?.precipitationMm
              const isToday = day === todayStr
              const isSelected = day === selectedDate
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[92px] rounded border p-1 text-left text-sm transition ${
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
                  {(tLine || precip != null) && (
                    <div className="mt-0.5 space-y-0.5 border-t border-stone-100 pt-0.5">
                      {tLine && (
                        <div className="text-[10px] font-medium leading-tight text-sky-800" title="气温">
                          {tLine}
                        </div>
                      )}
                      {precip != null && (
                        <div
                          className={`text-[10px] leading-tight ${precip > 0 ? 'text-blue-700' : 'text-stone-500'}`}
                          title="降水量"
                        >
                          {formatPrecipMm(precip)}mm
                        </div>
                      )}
                    </div>
                  )}
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
          {weatherError && <p className="mt-2 text-xs text-red-600">{weatherError}</p>}
          <p className="mt-2 text-xs text-stone-500">
            格内偏青蓝色为气温（°C），其下为降水量（mm）；可与到期、已完成标签同格显示。
          </p>
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
              <div className="border-t border-stone-100 pt-4">
                <h3 className="text-sm font-medium text-sky-800 mb-2">当日天气</h3>
                <p className="text-xs text-stone-500 mb-3">最高/最低气温（°C）与降水量（mm）；留空表示清除该项。</p>
                {weatherFormError && <p className="text-xs text-red-600 mb-2">{weatherFormError}</p>}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="block text-xs text-stone-600">
                    最高温
                    <input
                      type="number"
                      step="any"
                      value={tempMaxStr}
                      onChange={(e) => setTempMaxStr(e.target.value)}
                      className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                      placeholder="—"
                    />
                  </label>
                  <label className="block text-xs text-stone-600">
                    最低温
                    <input
                      type="number"
                      step="any"
                      value={tempMinStr}
                      onChange={(e) => setTempMinStr(e.target.value)}
                      className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                      placeholder="—"
                    />
                  </label>
                </div>
                <label className="block text-xs text-stone-600 mb-2">
                  降水量（mm）
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={precipStr}
                    onChange={(e) => setPrecipStr(e.target.value)}
                    className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                    placeholder="0 表示无雨"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveWeatherForSelected()}
                    disabled={weatherSaving}
                    className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    {weatherSaving ? '保存中…' : '保存天气'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearWeatherForSelected()}
                    disabled={weatherSaving || !weatherByDate[selectedDate]}
                    className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    清除当日
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
