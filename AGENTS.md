# 花园助手

个人花园的植物档案、生长记录、养护计划与养护记录。前端在 `src/`，Pages Functions 在 `functions/`，D1 迁移在 `migrations/`。

## 养护计划名称

- 计划名称存在 `care_schedules` 与 `care_schedule_templates` 的 `name`。
- 执行待办写入 `care_logs` 时保存名称快照和 `schedule_id`。
- 展示养护记录时优先用名称；没有名称才用任务类型标签。
- 到期计算不得把一次具名执行算到同类型的其他计划上。无 `schedule_id` 的旧记录仍按 `task_type` 匹配。

## 分层

- 页面只通过 `src/lib/storage-api.ts` 访问 `/api/data/*`。
- 到期日算法放在 `functions/api/data/schedule-algorithm.ts`，由数据接口调用。页面不直接依赖 `functions/`。
- 数据库访问只在 `functions/api/data/[[path]].ts`。
