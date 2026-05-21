# TASK-016：季节浇水间隔调整

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | K |
| 关联违规 | V11-010 |
| 状态 | ⬜ 未开始 |

## 目标

对启用 `seasonalWateringAdjust` 的 `watering` 计划，按月份系数计算有效 `intervalDays`，并用于待办算法（§3.14.4）。

## 范围

- **migration**：`care_schedules`、`care_schedule_templates` 增加 `seasonal_watering_adjust`（boolean，默认 0）
- **新建或扩展**：季节系数配置（`functions/api/_shared/season-watering.ts` 或 KV JSON）
- **修改**：`due-tasks.ts`、计划 CRUD API、`PlantDetail` 计划 UI
- **测试**：`tests/season-watering.test.ts` 或扩展 `schedule-algorithm` / `due-tasks` 测试
- **文档**：`schedule-algorithm.md`（移除「未实现」）

## 不在范围

- 非 watering 任务的季节规则（除非 spec 扩展）
- 用户自定义每月系数 UI（v1 可用内置表）

## 实施步骤

1. Migration + API 读写开关。
2. 根据用户半球（settings lat 或 timeZone 推断）+ 当前月查系数表 → `effectiveInterval = max(1, round(base * factor))`。
3. 在 `due-tasks` 构建任务前对 watering 且开关开启的计划替换 interval。
4. UI：计划表单 checkbox「按季节调整浇水」；展示「基准 / 当前有效」间隔。
5. 更新 `docs/architecture/schedule-algorithm.md` 实现说明。

## 验收标准

- [ ] 关闭开关时行为与现网一致
- [ ] 开启后夏季/冬季待办间隔与系数表一致（表驱动测试覆盖）
- [ ] `npm test` 全绿
- [ ] product-spec §11「季节调整」可勾选

## 依赖

- 推荐 TASK-013（半球/气候带）

## 参考

- product-spec §3.14.4、SCHED-04～06
