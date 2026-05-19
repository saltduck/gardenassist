# TASK-003：日历「已完成」养护记录按时区归日

| 字段 | 值 |
|------|-----|
| 优先级 | P0 |
| 阶段 | B |
| 关联违规 | V-004 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-001（推荐先完成，避免并行改 `[[path]].ts` 冲突） |

## 目标

`GET /care-logs/date/:date` 与待办接口一致，使用 `tzOffsetMinutes` 将 `done_at` 转为本地日后比较。

## 范围

- `functions/api/data/[[path]].ts` — `care-logs/date/:date` 处理器
- `src/lib/storage-api.ts` — `getCareLogsForDate(date, tzOffsetMinutes?)`
- `src/pages/Calendar.tsx` — 传入与待办相同的 offset
- `docs/architecture/api-contracts.md`

## 实施步骤

1. API：接受 query `tzOffsetMinutes`，用现有 `isoToLocalDate(done_at, tz)` 过滤，**避免** `strftime` 直接比 UTC 日期
   - 实现方式可选：SQL 拉取用户当日相关 logs 后在 JS 过滤，或生成 UTC 边界（需与 `isoToLocalDate` 一致）
2. 前端：`getCareLogsForDate(d, tzOffsetMinutes)` 与 Calendar 月加载逻辑传参
3. 文档：补充 `care-logs/date/:date?tzOffsetMinutes=` 说明

## 验收标准

- [ ] 设置 `Asia/Shanghai`，本地 23:30 完成的记录在当日「已完成」列表
- [ ] 与待办使用同一 `calendarTz` 时，日期格不错位
- [ ] `npm run build` 通过

## 参考

- requirements CARE-04、SET-03
- `isoToLocalDate` — `[[path]].ts`
