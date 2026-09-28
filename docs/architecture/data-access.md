# 数据访问

养护计划与养护记录只通过 `functions/api/data/[[path]].ts` 读写 D1。

- 计划写入前把空名称规范成任务类型中文标签。
- 完成待办时，客户端把计划 `name` 与带前缀的计划 id 交给 `POST /api/data/plants/:id/care-logs`。
- 更新记录时，请求体未提供 `name` 或 `scheduleId` 则保留原值。
- 到期查询在内存中用 `careLogMatchesSchedule` 选择最近一次匹配记录，不在 SQL 里按类型合并所有同类型计划。
