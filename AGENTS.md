# AGENTS.md — 花园助手（Garden Assist）

本文件为 AI 编码助手提供项目级指引。**业务需求的权威来源**是 [`docs/requirements/product-spec.md`](docs/requirements/product-spec.md)；实现细节见 [`docs/README.md`](docs/README.md)。

**Cursor 规则入口**（均指向本文件，请勿在三处重复维护矛盾内容）：

- [`.cursorrules`](.cursorrules) — 根目录遗留/通用 Cursor 规则文件
- [`.cursor/rules/agents.mdc`](.cursor/rules/agents.mdc) — `alwaysApply: true` 的项目规则

## 产品一句话

个人花园植物档案、生长/养护记录、周期待办与日历，以及 OpenAI 驱动的识别与养护建议；数据存 Cloudflare D1，需登录使用。

## 必读文档

| 文档 | 用途 |
|------|------|
| [`docs/requirements/product-spec.md`](docs/requirements/product-spec.md) | 完整业务需求、需求 ID、验收清单 |
| [`docs/requirements/auth-flow.md`](docs/requirements/auth-flow.md) | 认证与会话 |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | 技术栈、目录、部署、本地开发 |
| [`docs/architecture/db-schema.md`](docs/architecture/db-schema.md) | 实体、表、variety_key / 共享计划 |
| [`docs/architecture/api-contracts.md`](docs/architecture/api-contracts.md) | HTTP 接口约定 |
| [`docs/architecture/schedule-algorithm.md`](docs/architecture/schedule-algorithm.md) | 待办到期日计算（修改待办逻辑前必读） |
| [`docs/decisions/MIGRATION-REPORT.md`](docs/decisions/MIGRATION-REPORT.md) | 合规审计与迁移说明 |
| [`docs/tasks/README.md`](docs/tasks/README.md) | 任务清单（TASK-001 …） |
| [`docs/decisions/PLAN-historical.md`](docs/decisions/PLAN-historical.md) | 历史开发计划（以 product-spec 为准） |

## 技术栈（当前实现）

- **前端**：React 19、Vite 8、TypeScript、Tailwind、React Router 7
- **后端**：Cloudflare Pages Functions（`functions/api/`）
- **数据**：D1（`DB`）、图片 R2（`BUCKET`）
- **AI**：OpenAI `gpt-4o-mini`，Key 仅服务端 `OPENAI_API_KEY`
- **持久化**：前端仅调用 `/api/data/*`（`src/lib/storage-api.ts`），**不使用 localStorage**

## 目录要点

```
src/pages/          # 页面：Dashboard, PlantList, PlantDetail, PlantForm, Tasks, Calendar, Settings, Login, Register
src/lib/            # storage-api, auth-api, api (AI), calendar-timezone, upload-api
src/types/          # plant.ts, data.ts
functions/api/
  auth/             # 会话 Cookie ga_session
  data/             # CRUD + due-tasks.ts / schedule-algorithm.ts
  ai/               # advice, identify, care-plan
  upload.ts         # R2 上传
  assets/           # R2 读取
migrations/         # D1 迁移（按序号递增，勿改历史文件）
tests/              # 单元测试（含 schedule-algorithm、due-tasks 等）
docs/
  requirements/     # product-spec, auth-flow, billing-rules
  architecture/     # overview, db-schema, api-contracts, event-model, schedule-algorithm
  decisions/        # ADR, MIGRATION-REPORT, PLAN-historical
  tasks/            # TASK-*.md
```

## 编码约定

1. **最小改动**：只改与任务相关的文件；不重构无关代码。
2. **匹配现有风格**：命名、async 数据加载（`useEffect` + `storage-api`）、Tailwind 样式与现有页面一致。
3. **业务规则**：待办/日历日期涉及时区（`user_settings.time_zone`、`tzOffsetMinutes`）；共享养护计划用 `variety_key` + `care_schedule_templates`；归档植物（`archived_at`）不参与待办。
4. **计划 ID**：共享计划 `tpl:{uuid}`，植株计划 `plant:{uuid}`（见 `toSchedule` / `parseScheduleRef`）。
5. **测试**：修改 `schedule-algorithm.ts` 或 `due-tasks.ts` 时须跑 `npm test`（覆盖率见 `npm run test:coverage`）。
6. **依赖**：只改本仓库源码，不修改 `node_modules` 或上游包。
7. **注释**：仅对非显而易见的业务/算法逻辑添加简短注释。
8. **提交**：用户明确要求时才 `git commit`；不 force push `main`。

## 常见任务指引

| 任务 | 建议阅读 |
|------|----------|
| 新页面/路由 | `src/App.tsx`、`src/components/Nav.tsx`、product-spec §3.1 |
| 植物/记录 CRUD | `functions/api/data/[[path]].ts`、`src/lib/storage-api.ts` |
| 待办/完成/跳过 | `Tasks.tsx`、`due-tasks.ts`、`schedule-algorithm.ts`、product-spec §3.7–3.8 |
| AI 功能 | `functions/api/ai/*`、`src/lib/api.ts`、product-spec §3.12 |
| 认证 | `auth-flow.md`、`functions/api/auth/[[path]].ts` |
| 数据库变更 | 新增 `migrations/00xx_*.sql`，不编辑已应用迁移 |

## 禁止事项

- 在前端暴露 `OPENAI_API_KEY` 或绕过服务端调用 OpenAI
- 恢复 localStorage 作为主数据层（与 product-spec 冲突）
- 破坏性 git 操作（force push、hard reset）除非用户明确要求
- 修改 `git config` 或跳过 hooks（除非用户明确要求）

## 语言

- 思考可用英文；**面向用户的 UI 文案与文档说明使用中文**（与产品一致）。
