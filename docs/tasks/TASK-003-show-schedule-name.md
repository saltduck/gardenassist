# TASK-003 展示计划名称

- Status: done
- Owner: agent
- Source: docs/migration-report.md

## Objective

计划与由其产生的养护记录展示名称，而不是任务类型标签。

## Scope

- 植物详情的计划表单、计划列表、养护记录、时间线
- 待办完成与编辑
- 日历到期任务与已完成记录
- 仪表盘最近养护
- AI 确认添加时写入类型中文标签作为初始名称

## Out Of Scope

- 改 AI 模型提示词以生成自定义名称
- 手动养护记录改为必填名称

## Dependencies

- TASK-001
- TASK-002

## Implementation Checklist

- [x] 新建和编辑计划有名称输入，提交空名称时用类型标签
- [x] 完成待办时把名称和计划 id 写入养护记录
- [x] 有名称的记录展示名称；无名称的记录展示类型

## Acceptance Criteria

- 完成名为「夏季浇水」的计划后，养护记录显示「夏季浇水」
- 手动添加的记录仍显示类型，例如「施肥」
