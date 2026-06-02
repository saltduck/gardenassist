# AGENTS.md — 花园助手（Garden Assist）

本文件为 AI 编码助手提供项目级指引。**业务需求的权威来源**是 [`docs/requirements/product-spec.md`](docs/requirements/product-spec.md)（**v1.1** 含 §3.14 规划项）；实现细节见 [`docs/README.md`](docs/README.md)。

**Cursor 规则入口**（均指向本文件，请勿在三处重复维护矛盾内容）：

- [`.cursorrules`](.cursorrules)
- [`.cursor/rules/agents.mdc`](.cursor/rules/agents.mdc)

## 产品一句话

个人花园植物档案、生长/养护记录、周期待办与日历，以及 AI 养护建议与拍照识别；数据存 Cloudflare D1，需登录使用。

## 必读文档

| 文档 | 用途 |
|------|------|
| [`docs/requirements/product-spec.md`](docs/requirements/product-spec.md) | 完整业务需求、需求 ID、验收清单（**含 v1.1 规划 §3.14**） |
| [`docs/requirements/planned-v1.1.md`](docs/requirements/planned-v1.1.md) | v1.1 功能与验收补齐速查 |
| [`docs/requirements/auth-flow.md`](docs/requirements/auth-flow.md) | 认证与会话（含规划中的找回密码） |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | 技术栈、目录、部署、本地开发 |
| [`docs/architecture/db-schema.md`](docs/architecture/db-schema.md) | 实体、表、variety_key / 共享计划 |
| [`docs/architecture/api-contracts.md`](docs/architecture/api-contracts.md) | HTTP 接口（已实现 + 规划） |
| [`docs/architecture/schedule-algorithm.md`](docs/architecture/schedule-algorithm.md) | 待办到期日计算（修改待办逻辑前必读） |
| [`docs/decisions/MIGRATION-REPORT.md`](docs/decisions/MIGRATION-REPORT.md) | 合规审计与迁移说明 |
| [`docs/tasks/README.md`](docs/tasks/README.md) | 任务清单（TASK-011～017 ✅；**TASK-019～027** 验收补齐待办） |
| [`docs/decisions/PLAN-historical.md`](docs/decisions/PLAN-historical.md) | 历史开发计划（以 product-spec 为准） |

## 已实现 vs 规划（勿混淆）

| 类别 | 已实现（当前代码） | 仅 product-spec 规划、**勿当已上线** |
|------|-------------------|-------------------------------------|
| 认证 | 注册/登录/退出/改密/找回密码、`ga_session`、登录后 `from` 回跳 | — |
| 识别 | `POST /api/ai/identify-plantid`（主）；`identify` 为 OpenAI 兼容端点，不自动回退 | — |
| 图片 | `POST /api/upload`；`GET /api/assets/*` 须登录且 key 归属本人 | — |
| 位置 | `location` + **suburb**、经纬度、列表筛选；保存 suburb 可自动 geocode 回填坐标 | — |
| 天气 | 手填 + `POST /weather/sync`（Open-Meteo） | — |
| 浇水计划 | `seasonalWateringAdjust` + 月份系数（`season-watering.ts`） | — |
| 地图 | `/garden-map`、落点坐标 | — |

实现 v1.1 功能前：先更新 product-spec 状态 → 再改 `migrations/`、`api-contracts.md`、`db-schema.md` 与本文件。

## 技术栈（当前实现）

- **前端**：React 19、Vite 8、TypeScript、Tailwind、React Router 7
- **后端**：Cloudflare Pages Functions（`functions/api/`）
- **数据**：D1（`DB`）、图片 R2（`BUCKET`）
- **AI**：OpenAI `gpt-4o-mini`（advice、identify、care-plan）；Key 仅服务端 `OPENAI_API_KEY`
- **会话**：`functions/api/_shared/session.ts`（auth / data / upload / ai 共用）
- **持久化**：前端 `storage-api.ts` 等；**不使用 localStorage**

**外部服务**：Plant.id、邮件服务、Open-Meteo 天气与地理编码 API。

## 目录要点

```
src/pages/          # Dashboard, PlantList, PlantDetail, PlantForm, Tasks, Calendar, Settings, Login, Register
src/lib/            # storage-api, auth-api, api (AI), api-error, auth-redirect, calendar-timezone, upload-api
functions/api/
  _shared/          # session.ts, interval-days.ts
  auth/             # 会话（规划：forgot/reset password）
  data/             # [[path]].ts, due-tasks.ts, schedule-algorithm.ts
  ai/               # advice, identify (OpenAI), care-plan
  upload.ts, assets/
migrations/
tests/
docs/requirements/  # product-spec, planned-v1.1, auth-flow
docs/architecture/
docs/tasks/         # TASK-011…017 ✅；TASK-019…027 验收差距
```

## 编码约定

1. **最小改动**：只改与任务相关的文件；不重构无关代码。
2. **匹配现有风格**：`useEffect` + `storage-api`、Tailwind、中文 UI 文案。
3. **业务规则**：时区（`user_settings.time_zone`、`tzOffsetMinutes`）；`user_settings.suburb` 优先用于 geocode 回填经纬度；`variety_key` + 共享模板；归档植物不参与待办。
4. **计划 ID**：`tpl:{uuid}` / `plant:{uuid}`。
5. **测试**：改 `schedule-algorithm.ts` 或 `due-tasks.ts` 须 `npm test`；覆盖率 `npm run test:coverage`。
6. **依赖**：只改本仓库源码。
7. **错误**：数据 API 用 `ApiError`；页面加载失败应展示错误（见 Dashboard/Tasks/PlantDetail）；勿静默吞掉 `getUserSettings` 失败。
8. **提交**：用户明确要求时才 `git commit`。

## 常见任务指引

| 任务 | 建议阅读 |
|------|----------|
| v1.1 新功能 | `planned-v1.1.md` → product-spec §3.14 |
| 新页面/路由 | `App.tsx`、`Nav.tsx`、product-spec §3.1、§3.15 |
| 植物/记录 CRUD | `[[path]].ts`、`storage-api.ts` |
| 待办/完成/跳过 | `due-tasks.ts`、`schedule-algorithm.ts`、product-spec §3.7–3.8 |
| AI / 识别 | `api.ts`、`ai/*`；Plant.id 见 §3.14.3 |
| 认证 | `auth-flow.md`、`_shared/session.ts`、`auth/[[path]].ts` |
| assets 安全 | product-spec §3.14.2、`assets/[[path]].ts` |
| 数据库变更 | 新 `migrations/00xx_*.sql`，更新 `db-schema.md` |

## 禁止事项

- 在前端暴露 `OPENAI_API_KEY`、`PLANT_ID_API_KEY` 或邮件密钥
- 恢复 localStorage 作为主数据层
- 在未更新 product-spec 的情况下实现 v1.1 规划功能并当作「已完成」
- 破坏性 git 操作（除非用户明确要求）
- 修改 `git config` 或跳过 hooks（除非用户明确要求）

## 语言

- 思考可用英文；**面向用户的 UI 与文档说明使用中文**。
