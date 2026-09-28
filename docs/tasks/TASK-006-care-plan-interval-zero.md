# TASK-006：care-plan 支持 intervalDays = 0

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | D |
| 关联违规 | V-104 |
| 状态 | ✅ 已完成 |
| 依赖 | 可与 TASK-005 同 PR |

## 目标

AI 生成的养护计划可包含**一次性任务**（`intervalDays: 0`），与 `src/types/plant.ts` 及 schedule 算法一致。

## 范围

- `functions/api/ai/care-plan.ts` L54–57
- OpenAI system prompt 文案
- `docs/requirements/product-spec.md` §10.1（完成后删除「AI 下限为 1」限制说明）

## 实施步骤

1. 将 `Math.max(1, Number(...))` 改为：`const n = Number(...); intervalDays: Number.isFinite(n) && n >= 0 ? n : 7`
2. system prompt 增加：`intervalDays 可为 0 表示一次性`
3. 前端 PlantDetail 确认展示「一次性」无误（已有 `formatScheduleInterval`）

## 验收标准

- [ ] Mock 或手工：AI 返回 `intervalDays: 0` 时 API 原样返回 0
- [ ] 用户确认添加后，待办行为符合 schedule-algorithm 一次性规则
- [ ] requirements §10.1 更新

## 参考

- requirements §3.7.1、§3.12.3
