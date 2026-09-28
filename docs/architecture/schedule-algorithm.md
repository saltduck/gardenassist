# 待办到期日算法

与 [`../requirements/product-spec.md`](../requirements/product-spec.md) §3.7.4 对齐。

**源码**：`functions/api/data/schedule-algorithm.ts`  
**测试**：`tests/schedule-algorithm.test.ts`（修改算法必须跑 `npm test`）

## 输入

| 符号 | 含义 |
|------|------|
| `today` | 用户时区下的当前日期 YYYY-MM-DD |
| `last` | 匹配该计划的 CareLog，以及同 `plantId + taskType` 的 CareSkip，转本地日后的**最晚动作日**；无则为 null。带 `schedule_id` 的记录只匹配该计划；空 `schedule_id` 仍按 `task_type` |
| `interval` | `intervalDays`，0 表示一次性 |
| `startDate`, `endDate` | 计划有效窗口（可选） |

归档植株、窗口外、`nextDue` 为 null 的计划不进入待办列表。

## 核心函数

### `computeNextDue(today, last, interval, startDate?)`

用于**本周待办**：得到「下一次」到期日，会跳过已错过的周期直到 `≥ today`。

- `interval > 0` 且无 `last`：若 `startDate > today` 则返回 `startDate`，否则 `today`
- 有 `last` 且 `last < startDate`：返回 `startDate`
- 有 `last`：`next = last + interval`，while `next < today` 则继续加 interval

### `computeDueFromLast(today, last, interval, startDate?)`

用于**今日待办**：**不**向前推进周期，可能得到**已逾期**日期（`nextDue ≤ today`）。

- 有 `last`：`last + interval`（若 `< startDate` 逻辑同 computeNextDue 的 start 处理）

### `shouldIncludeInRange(range, today, endOfWeek, nextDue, startDate?, endDate?)`

| range | 条件 |
|-------|------|
| `today` | `nextDue !== null` 且在窗口内，且 `nextDue <= today` |
| `week` | `nextDue > today` 且 `nextDue <= today + 6` |

`endOfWeek` 在 API 中为 `addDays(today, 6)`。

### `inScheduleWindow(dateStr, startDate?, endDate?)`

`dateStr` 须在 `[startDate, endDate]` 内（边界含等号；缺省表示无界）。

## 一次性任务（interval = 0）

| 状态 | computeNextDue / computeDueFromLast |
|------|-------------------------------------|
| 无 last | 到期日为 `today` 或未来 `startDate` |
| 有 last | 返回 `null`，不再待办 |

## 列表合并逻辑（API 层）

对每株未归档植物：

1. 解析 `variety_key`，合并共享 templates + plant schedules
2. 对每条计划按 `range` 选用 `computeDueFromLast` 或 `computeNextDue`
3. `shouldIncludeInRange` 过滤
4. 按 `nextDue` 排序返回

**跳过与完成**：带 `schedule_id` 的完成记录只推进对应计划；无 `schedule_id` 的完成记录与全部跳过记录仍按 `plantId + taskType` 计入。取匹配记录里时间戳最大者转本地日作为 `last`。

## 前端时区

- 设置页 `time_zone`（IANA）经 `resolveCalendarTimeZone` → `getTimeZoneOffsetMinutes` 传给 API
- 日历月格用 `getMonthGridInTimeZone`、`toYmdInTimeZone`

## 回归用例（摘要）

| 场景 | 期望 |
|------|------|
| 无记录，interval=7，today=3/15 | nextDue=3/15 |
| last=3/1，interval=3，today=3/15 | computeNextDue → 3/16 |
| 今日列表 last=3/1，interval=7 | computeDueFromLast → 3/8（逾期仍显示） |
| 明天到期 | 在 week 不在 today |
| endDate 外 | 排除 |

完整断言见 `tests/schedule-algorithm.test.ts`。

## 统一构建（`due-tasks.ts`）

待办列表、今日计数、日历按日接口均调用 `buildDueTasks` / `countTodayDueTasks`，避免三处逻辑漂移。

### 日历按日 `GET /tasks/due/:date`

| 条件 | 规则 |
|------|------|
| `dateStr > today` | `computeNextDue(today, …) === dateStr` |
| `dateStr === today` | 与今日待办相同：`computeDueFromLast` 且 `nextDue <= today` |
| `dateStr < today` | `computeDueFromLast(today, …) === dateStr`（逾期停在该历史日） |

实现见 `resolveDueForCalendarDate`；测试见 `tests/due-tasks.test.ts`。

### 品种键

合并共享模板时使用 `resolveVarietyKeyFromPlantRow`（优先 DB `variety_key`），与 `GET /plants/:id/schedules` 一致。

---

## 规划：季节浇水调整（v1.1，未实现）

详见 product-spec **§3.14.4**。实现思路摘要：

1. 计划级开关 `seasonalWateringAdjust`（仅 `taskType = watering`）。
2. 按用户半球 + 当前月份查系数表，得 `effectiveInterval = max(1, round(baseInterval × factor))`。
3. 将 `effectiveInterval` 代入现有 `computeNextDue` / `computeDueFromLast`（在 `due-tasks.ts` 调用前解析 interval）。
4. UI 展示「基准间隔 / 当前季节有效间隔」。

**未实现前**：算法仍使用库中原始 `interval_days`，与季节无关。

实现后须扩展 `tests/schedule-algorithm.test.ts` 或新增 `tests/season-watering.test.ts`，并更新 `due-tasks` 集成测试。
