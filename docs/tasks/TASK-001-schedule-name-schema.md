# TASK-001 计划与记录的名称持久化

- Status: done
- Owner: agent
- Source: docs/migration-report.md

## Objective

为植株计划、共享计划模板和养护记录持久化名称；执行来源写入 `schedule_id`。

## Scope

- `migrations/0012_schedule_name.sql`
- `src/types/plant.ts`
- `functions/api/data/[[path]].ts` 的读写与导入

## Out Of Scope

- 到期匹配规则
- 页面文案

## Dependencies

无

## Implementation Checklist

- [x] 迁移加列，并用任务类型中文标签回填已有计划名称
- [x] 类型增加 `CareSchedule.name`、`CareLog.name`、`CareLog.scheduleId`
- [x] 创建、更新、导入读写这些字段；空计划名称回落到类型标签
- [x] 更新记录时，未提交的名称和来源 id 保持原值

## Acceptance Criteria

- 新建计划可以保存自定义名称
- 旧计划读出来的名称是对应类型的中文标签
- 养护记录可以保存名称快照和来源计划 id
