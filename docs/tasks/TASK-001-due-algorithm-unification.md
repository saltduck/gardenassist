# TASK-001：统一待办 / 今日计数 / 日历 due 算法

| 字段 | 值 |
|------|-----|
| 优先级 | P0 |
| 阶段 | A |
| 关联违规 | V-001, V-002, V-203 |
| 状态 | ✅ 已完成 |

## 目标

`GET /tasks/due?range=today`、`GET /tasks/today-count`、`GET /tasks/due/:date` 使用**同一套**到期日计算与过滤逻辑，符合 `docs/architecture/schedule-algorithm.md` 与 requirements §3.7.4、§3.8、§3.9。

## 范围

- **修改**：`functions/api/data/[[path]].ts`（建议抽取 `buildDueTaskList` 或类似函数）
- **可选新建**：`functions/api/data/due-tasks.ts`（纯函数 + 类型）
- **测试**：`tests/due-tasks.test.ts` 或扩展现有 schedule 测试夹具

## 不在范围

- variety_key 解析（见 TASK-002）
- 养护记录时区（见 TASK-003）

## 实施步骤

1. 在 `due-tasks.ts`（或 `[[path]].ts` 顶部）实现：
   - 输入：`plants`（含 variety_key 行）、`templates`、`plantSchedules`、`logs`、`skips`、`opts: { mode: 'today' | 'week' | 'date' | 'count', date?: string }, tzOffsetMinutes`
   - 输出：`DueTask[]` 或 `number`（count 模式）
2. **today 模式**：`nextDue = computeDueFromLast(...)` + `shouldIncludeInRange('today', ...)`
3. **today-count**：与 today 列表 `length` 一致（不要单独用 `computeNextDue` + `<= today`）
4. **date 模式**（日历）：
   - 产品决策写入代码注释：`dateStr === today` 时与 today 列表一致；
   - `dateStr < today`：包含 `computeDueFromLast === dateStr` 的逾期项（推荐）；
   - `dateStr > today`：包含 `computeNextDue === dateStr` 的未来项
5. 删除三处重复循环，改为调用统一函数
6. 添加表驱动测试：覆盖 V-001 场景（last=3/10, interval=3, today=3/15）

## 验收标准

- [ ] 同一用户、同一时区下，`today-count` === `GET due?range=today` 条数
- [ ] 逾期任务在待办页与仪表盘计数同时出现
- [ ] 日历选「今天」与待办今日列表一致（在 TASK-003 前可先比对待办）
- [ ] `npm test` 全绿
- [ ] 更新 `docs/architecture/schedule-algorithm.md` 中「日历按日」小节（若语义有明确决策）

## 参考

- `tests/schedule-algorithm.test.ts` — `computeDueFromLast` vs `computeNextDue`
- `docs/decisions/MIGRATION-REPORT.md` §2.1 V-001、V-002
