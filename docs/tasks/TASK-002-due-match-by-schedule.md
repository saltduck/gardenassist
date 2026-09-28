# TASK-002 按来源计划计算到期

- Status: done
- Owner: agent
- Source: docs/migration-report.md

## Objective

一次计划执行只推进那一条计划的下次到期日。

## Scope

- `functions/api/data/schedule-algorithm.ts`
- `functions/api/data/[[path]].ts` 中三处 `lastDone`
- `tests/schedule-algorithm.test.ts`

## Out Of Scope

- 页面展示

## Dependencies

- TASK-001

## Implementation Checklist

- [x] 抽出「记录是否属于该计划」的纯函数并加测试
- [x] 今日、本周、指定日期、今日数量都使用该匹配

## Acceptance Criteria

- 带 `schedule_id` 的记录不匹配其他计划
- 没有 `schedule_id` 的记录仍按 `task_type` 匹配
