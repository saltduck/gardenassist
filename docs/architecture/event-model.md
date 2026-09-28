# 事件与集成模型

## 当前架构

本系统为 **请求/响应式** 单体 SPA + Pages Functions，**无**独立消息队列、事件总线或 CDC。

| 类型 | 说明 |
|------|------|
| 用户操作 | HTTP → Function → D1 / R2 / OpenAI → JSON 响应 |
| 待办计算 | 读时计算（`due-tasks.ts` + `schedule-algorithm.ts`），无后台 Cron |
| 天气 | **当前** 用户手填；**规划** 打开日历或定时触发 `weather/sync`（§3.14.6） |
| 会话 | Cookie + D1 `sessions`；**规划** 找回密码 token 表 |

## 逻辑「事件」（非消息）

以下为领域侧可视为状态变化的时刻，均在同一请求内完成持久化，**不**向外发布异步事件：

| 逻辑事件 | 持久化 | 下游影响 |
|----------|--------|----------|
| 完成养护 | `care_logs` INSERT | 重算 `nextDue` |
| 跳过养护 | `care_skips` INSERT | 推进周期，不计入已完成 |
| 归档植物 | `plants.archived_at` | 排除待办/日历 |
| 更新计划 | `care_schedules` / `care_schedule_templates` | 下次 GET 待办时重算 |

## 前端副作用

| 场景 | 模式 |
|------|------|
| 待办「完成」 | 乐观隐藏 + 轮询刷新（`Tasks.tsx`，25s 防回弹） |
| 其余 CRUD | 请求成功后 `useEffect` 或局部 `setState` 重载 |

## 规划触发（v1.1）

| 触发 | 行为（规划） |
|------|----------------|
| 用户打开日历 / 每日首次访问 | 可选调用 `POST /weather/sync`，写入 `daily_weather` |
| 用户上传花园平面图 | R2 + `garden_maps` 记录 |
| 拖拽植物落点 | `PUT map-position`，无独立领域事件总线 |

仍建议在**同一 HTTP 请求**内完成读写，不引入消息队列，除非后续 ADR 另有说明。

## 扩展指引

若未来需要（推送提醒、审计日志、第三方 Webhook），应：

1. 在 `docs/decisions/` 新增 ADR
2. 明确事件 schema、投递语义（至少一次 / 恰好一次）
3. 更新本文件与 [`api-contracts.md`](./api-contracts.md)
