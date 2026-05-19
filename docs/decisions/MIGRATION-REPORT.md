# 合规审计与迁移报告

| 项目 | 说明 |
|------|------|
| 审计基准 | [`AGENTS.md`](../../AGENTS.md)、[`product-spec.md`](../requirements/product-spec.md)、[`docs/README.md`](../README.md) |
| 审计日期 | 2026-05-19 |
| 实施完成 | 2026-05-19（TASK-001 … TASK-010） |
| 范围 | 应用源码（`src/`、`functions/`、`tests/`），不含 `node_modules` |
| 结论摘要 | 审计项已通过串行迁移任务修复；见下方「实施后状态」 |

---

## 实施后状态（TASK-001 … TASK-010 已完成）

| 违规 ID | 处理 |
|---------|------|
| V-001–V-004 | `functions/api/data/due-tasks.ts` 统一待办/计数/日历；`care-logs/date` 支持 `tzOffsetMinutes` |
| V-101 | `getUserSettings` / `setUserSettings` 并入 `storage-api.ts` |
| V-102 | 删除 `POST /api/data/import` |
| V-103 | AI 接口需登录 + `credentials: 'include'` |
| V-104 | `care-plan` 支持 `intervalDays: 0` |
| V-201–V-202 | 中文标签与归档对话框 |
| V-301–V-302 | 更新 `docs/architecture/api-contracts.md`、`docs/decisions/PLAN-historical.md` 横幅 |
| V-204 | 新增 `npm run dev:full` |

---

## 1. 审计方法

对照 AGENTS.md 与 requirements 中的硬性约定，逐项检查：

- 数据仅经 D1 + `storage-api`（禁止 localStorage 主存储）
- 业务规则：`variety_key`、归档、时区、`tpl:`/`plant:` 计划 ID
- 待办算法：`computeDueFromLast` / `computeNextDue`（见 `docs/architecture/schedule-algorithm.md`）
- 安全：OpenAI Key 不暴露、敏感 API 鉴权
- 语言：面向用户文案中文

工具：全库 grep、`functions/api/data/[[path]].ts` 与页面对照阅读。

---

## 2. 违规与差距清单

严重程度：**P0** 用户可见错误 / 需求不符 · **P1** 架构或安全风险 · **P2** 体验/可维护性 · **P3** 文档或非阻塞技术债

### 2.1 P0 — 业务逻辑与 requirements 不一致

| ID | 位置 | 违规说明 | 对照规则 |
|----|------|----------|----------|
| V-001 | `functions/api/data/[[path]].ts` — `GET /tasks/due`（today） vs `GET /tasks/today-count` | **今日待办列表**使用 `computeDueFromLast`（保留逾期日），**今日计数**使用 `computeNextDue` 再判断 `<= today`。当任务已逾期且 `computeDueFromLast < today < computeNextDue` 时，仪表盘数字小于待办页实际条数。 | requirements §3.8 TASK-01、DASH-02；`docs/architecture/schedule-algorithm.md` |
| V-002 | 同上 — `GET /tasks/due/:date`（日历） | 仅当 `computeNextDue(...) === dateStr` 时列入，**不会在历史日期格展示逾期任务**（逾期日被滚到“下一次”）。与待办页“今日含逾期”语义不一致。 | requirements §3.9 CAL-02、§3.7.4 |
| V-003 | 同上 — 待办三处循环（due / today-count / due/:date） | 合并共享计划时使用 `normalizeVarietyKey(plant.name, plant.variety)`，而 `GET /plants/:id/schedules` 使用 `resolveVarietyKeyFromPlantRow`（**优先 DB 中 `variety_key`**）。用户改品种展示但未勾选 `syncVarietyKey` 时：详情页仍能看到旧 key 下的共享计划，**待办/日历可能匹配不到同一批模板**。 | AGENTS §3 业务规则；`docs/architecture/db-schema.md` |
| V-004 | `GET /care-logs/date/:date` | 用 `strftime('%Y-%m-%d', cl.done_at)`（SQLite 默认 UTC），**未使用** `tzOffsetMinutes`。非 UTC 时区下，日历「已完成」可能落在错误日期格。 | requirements §3.10 SET-03、CARE-04；AGENTS 时区约定 |

### 2.2 P1 — 架构与安全

| ID | 位置 | 违规说明 | 对照规则 |
|----|------|----------|----------|
| V-101 | `src/lib/user-settings.ts` | 直接 `fetch('/api/data/settings')`，未复用 `storage-api.ts` 的 `fetchJson`，形成**第二条数据访问路径**。 | `docs/architecture/overview.md`「唯一数据入口」 |
| V-102 | `POST /api/data/import` | 保留「从 localStorage 同步到 D1」批量 `INSERT OR REPLACE` 接口；与「不使用 localStorage 主存储」产品立场冲突，且具**批量覆写**能力（虽需登录）。前端无调用，属遗留攻击面/误用面。 | AGENTS 禁止恢复 localStorage；requirements §10.1 |
| V-103 | `functions/api/ai/*.ts` | AI 路由**无会话校验**，`Access-Control-Allow-Origin: *`，可被匿名刷 OpenAI 配额。Key 未暴露，但违反「敏感能力应受控」的合理推断；`docs/architecture/api-contracts.md` 写明无需登录。 | AGENTS 禁止事项（间接）；运维成本 |
| V-104 | `functions/api/ai/care-plan.ts` L56 | `intervalDays: Math.max(1, …)`，AI 无法生成**一次性任务**（interval=0），与 requirements §3.7、§10.1 已知限制一致但属**实现与需求差距**。 | requirements §3.12.3 |

### 2.3 P2 — 体验与可维护性

| ID | 位置 | 违规说明 | 对照规则 |
|----|------|----------|----------|
| V-201 | `src/types/plant.ts` | 任务类型 `mulch` 标签为 **「Mulch」**（英文）。 | AGENTS §语言 |
| V-202 | `src/pages/PlantDetail.tsx` | 归档徽章展示 `archiveReason` 原始枚举（如 `death`），非中文。归档 `prompt` 要求输入英文 code。 | requirements PLANT-07；AGENTS §语言 |
| V-203 | `functions/api/data/[[path]].ts` | 待办/计数/按日 due 三段**重复** ~80 行逻辑，后续修算法易漏改一处。 | AGENTS §5 测试与算法单一来源 |
| V-204 | `npm run dev` | 仅 Vite，不启动 Functions；本地易出现「API 404」 unless 另跑 `wrangler pages dev`。与 `docs/architecture/overview.md` 描述一致但**易误导**新贡献者。 | `docs/architecture/overview.md` |
| V-205 | `src/pages/Tasks.tsx` L177 | `taskType` 使用 `as any`，削弱类型安全。 | 编码质量（非 AGENTS 明文禁止） |

### 2.4 P3 — 文档漂移（非运行时代码）

| ID | 位置 | 说明 |
|----|------|------|
| V-301 | `docs/architecture/api-contracts.md` | 写的是 `GET /care-logs/recent`，实现为 `GET /recent-care-logs`；天气写的是 `GET /weather?from=`，实现为 `GET /weather/range?from=`。 |
| V-302 | `docs/decisions/PLAN-historical.md` | 仍推荐 localStorage/IndexedDB、目录含 `storage.ts`，与当前 D1-only 实现不符。AGENTS 已标注「以 requirements 为准」。 |

### 2.5 已通过项（无违规）

| 检查项 | 结果 |
|--------|------|
| `localStorage` / `sessionStorage` 业务读写 | **未发现**（仅注释提及） |
| 前端 `OPENAI_API_KEY` / 直连 OpenAI | **未发现** |
| 业务数据绕过 `/api/data` | 页面均使用 `storage-api`（设置除外，见 V-101） |
| `schedule-algorithm.ts` 单元测试 | **存在** `tests/schedule-algorithm.test.ts` |
| 归档植物排除待办 | **已实现** `archived_at IS NULL` |
| 共享/植株计划删除确认文案 | **已实现** PlantDetail / Tasks |
| 计划 ID 前缀 `tpl:` / `plant:` | **已实现** `toSchedule` / `parseScheduleRef` |

---

## 3. 影响分析

### 3.1 用户可见影响

| 违规 | 用户场景 | 影响 |
|------|----------|------|
| V-001 | 长期未浇水、周期较短 | 首页「今日待办 N」小于点进待办页看到的条数，**低估工作量** |
| V-002 | 在日历查看昨天/上周 | 到期格子上**看不到**应做未做的任务，仅今天待办页可见逾期 |
| V-003 | 改品种名未同步 key | 详情有养护计划，**待办不出现**同计划，用户以为系统坏了 |
| V-004 | 上海/纽约等非 UTC 用户 | 傍晚完成的养护可能显示在**相邻日期**的日历格 |
| V-201–202 | 中文用户 | 界面夹杂英文，**专业感与可读性**下降 |

### 3.2 运维与安全影响

| 违规 | 影响 |
|------|------|
| V-103 | 公网可匿名调用 AI，导致 **OpenAI 费用异常**、滥用 |
| V-102 | 若脚本或旧客户端误调 `/import`，可能 **覆写云端数据** |
| V-101 | 设置与主数据层错误处理不一致，增加 **回归测试面** |

### 3.3 开发维护影响

| 违规 | 影响 |
|------|------|
| V-203 | 修一处算法需改三处，**极易再次引入 V-001/V-002** |
| V-301 | 按文档集成会 **404**，浪费排障时间 |
| V-204 | 新开发者 `npm run dev` 后认为功能损坏 |

---

## 4. 迁移计划（分阶段）

原则：**先修 P0 数据正确性，再收敛架构与安全，最后文档与体验**；每阶段可独立发布；不改 `node_modules`；数据库变更仅新增 migration。

### 阶段 A — 待办与品种键正确性（P0，建议 1 个 PR）

**目标**：仪表盘、待办页、日历、详情页对「共享计划」与「今日/逾期」语义一致。

1. 抽取 `buildDueTasksForUser(env, user, { range | date | countOnly }, tzOffsetMinutes)`，单一调用 `schedule-algorithm.ts`。
2. `today-count` 与 `range=today` 共用同一过滤逻辑（`computeDueFromLast` + `shouldIncludeInRange('today', …)`）。
3. `due/:date`：对 `dateStr < today` 考虑逾期展示策略（产品决策：要么显示 `computeDueFromLast === dateStr`，要么在 UI 标注「仅显示当日下次到期」——**推荐**与 requirements 对齐为历史格显示该日应到期项）。
4. 三处植物循环统一使用 `resolveVarietyKeyFromPlantRow`（需在 `plants` 查询中选出 `variety_key, name, variety`）。
5. 补充 Vitest：**集成级**用例表驱动 today-count vs due today（可在 `tests/` 新建 `due-tasks.integration.test.ts` 或扩展现有算法测试夹具）。

**验收**：requirements §11 中待办/仪表盘/日历相关项；手工：改品种不 sync key 后待办与详情一致。

### 阶段 B — 日历时区（P0，建议 1 个 PR）

1. `GET /care-logs/date/:date` 增加 `tzOffsetMinutes`，用与 `isoToLocalDate` 相同逻辑过滤。
2. `Calendar.tsx` 传 `tzOffsetMinutes`（与待办一致）。
3. 更新 `docs/architecture/api-contracts.md` 与 `storage-api.getCareLogsForDate` 签名。

**验收**：在 `Asia/Shanghai` 设置下，23:00 完成的记录在当日格显示。

### 阶段 C — 数据访问层收敛（P1，可与 A 同 PR 或紧随）

1. 在 `storage-api.ts` 增加 `getUserSettings` / `setUserSettings`（或合并 settings 到统一 `fetchJson`）。
2. `user-settings.ts` 改为薄封装或删除，调用方改 import。
3. 禁止新增直连 `/api/data` 的模块（可在 AGENTS 中已写明）。

### 阶段 D — AI 与遗留 import（P1，建议独立 PR）

1. **AI 鉴权**：`functions/api/ai/*` 复用 `getCurrentUser`（与 upload 相同），未登录 401；CORS 改为回显 Origin（若需 Cookie）。
2. **care-plan**：允许 `intervalDays: 0`；prompt 中说明 0 为一次性。
3. **import 端点**：删除或加 `ENABLE_LEGACY_IMPORT` 环境变量 + 文档警告；若保留，仅允许 admin token（低优先级）。

**验收**：未登录无法调 AI；care-plan 可返回 interval 0。

### 阶段 E — 体验与文档（P2/P3）

1. i18n：`mulch` →「铺盖」等；归档原因映射中文展示；归档改用 select 而非英文 prompt。
2. 修正 `docs/architecture/api-contracts.md` 路径；`docs/decisions/PLAN-historical.md` 顶部加「历史文档」横幅指向 requirements。
3. （可选）`package.json` 增加 `"dev:full": "npm run build && wrangler pages dev dist"`。

---

## 5. 风险与回滚

| 阶段 | 风险 | 缓解 |
|------|------|------|
| A | 待办数量突变引起用户困惑 | 发布说明；可先打日志对比新旧计数 |
| B | 历史日历「已完成」日期位移 | 仅影响展示，不删数据；可一次性公告 |
| D | AI 必须登录导致旧书签失败 | 前端已 RequireAuth，影响面小 |
| D 删除 import | 无人用则无影响 | 部署前 grep 确认无调用方 |

回滚：每阶段独立 PR，按 PR revert；无 schema 变更阶段无需 D1 回滚。

---

## 6. 任务分解

详细可执行任务见 [`docs/tasks/README.md`](docs/tasks/README.md)。

| 任务 ID | 标题 | 阶段 | 优先级 |
|---------|------|------|--------|
| [TASK-001](docs/tasks/TASK-001-due-algorithm-unification.md) | 统一待办/计数/日历 due 算法 | A | P0 |
| [TASK-002](docs/tasks/TASK-002-variety-key-unification.md) | 待办循环改用 resolveVarietyKeyFromPlantRow | A | P0 |
| [TASK-003](docs/tasks/TASK-003-calendar-care-logs-timezone.md) | 日历已完成记录按时区过滤 | B | P0 |
| [TASK-004](docs/tasks/TASK-004-storage-api-settings.md) | 设置 API 并入 storage-api | C | P1 |
| [TASK-005](docs/tasks/TASK-005-ai-auth-and-cors.md) | AI 接口登录校验与 CORS | D | P1 |
| [TASK-006](docs/tasks/TASK-006-care-plan-interval-zero.md) | care-plan 支持 intervalDays=0 | D | P1 |
| [TASK-007](docs/tasks/TASK-007-legacy-import-endpoint.md) | 处理 /api/data/import 遗留端点 | D | P1 |
| [TASK-008](docs/tasks/TASK-008-ui-chinese-copy.md) | 中文文案与归档交互 | E | P2 |
| [TASK-009](docs/tasks/TASK-009-docs-api-paths.md) | 修正 docs/api 与 PLAN 漂移 | E | P3 |
| [TASK-010](docs/tasks/TASK-010-dev-workflow-script.md) | 可选 dev:full 本地联调脚本 | E | P2 |

---

## 7. 建议排期（参考）

| 周次 | 内容 |
|------|------|
| 第 1 周 | TASK-001 + TASK-002 + 测试 |
| 第 2 周 | TASK-003 + TASK-004 |
| 第 3 周 | TASK-005 + TASK-006 + TASK-007 |
| 第 4 周 | TASK-008 + TASK-009 + TASK-010（可选） |

---

## 8. 审计后文档同步

完成各 TASK 后更新：

- `docs/requirements/product-spec.md`（若产品语义变更）
- `docs/architecture/schedule-algorithm.md`、`docs/architecture/api-contracts.md`
- `AGENTS.md`（若新增 dev 脚本或禁止 import）

---

*本报告为静态代码审计结果；实施前请在 staging 用真实账号回归 requirements §11 检查清单。*
