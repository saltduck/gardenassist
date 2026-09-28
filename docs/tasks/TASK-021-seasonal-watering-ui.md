# TASK-021：季节浇水 UI 与计划编辑

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | N |
| 关联差距 | SEASON-04、SCHED-04～06、US-14 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-016（算法已实现） |

## 目标

用户可见「基准间隔」与「当前季节有效间隔」；可在详情/待办内联编辑中开关 `seasonalWateringAdjust`。

## 范围

- `src/types/plant.ts` — 辅助函数 `formatScheduleIntervalWithSeason(base, effective?)`
- `src/pages/PlantDetail.tsx` — 计划列表、ScheduleForm、内联编辑
- `src/pages/Tasks.tsx` — 内联编辑计划
- 可选：导出 `effectiveWateringIntervalDays` 到共享 util 供前端预览（或 `GET` 计划时 API 返回 `effectiveIntervalDays`）

## 实施步骤

1. 前端根据 `schedule.intervalDays`、`seasonalWateringAdjust`、`taskType`、用户 `latitude`、当前月计算展示用有效间隔（与 `season-watering.ts` 逻辑一致，可抽 `src/lib/season-watering.ts` 复用后端规则）。
2. 计划卡片展示：`每 7 天（本季有效 5 天）` 或分两行。
3. `updateCareSchedule` / 内联表单增加「按季节调整浇水」checkbox（仅 watering）。
4. 待办页编辑计划同步支持该字段。

## 验收标准

- [ ] 开启季节调整的浇水计划在 UI 显示有效间隔 ≠ 基准（当系数≠1）
- [ ] 待办到期日与展示一致（仍由 `due-tasks` 计算）
- [ ] §11「季节调整与待办一致」可勾选

## 参考

- `functions/api/_shared/season-watering.ts`
