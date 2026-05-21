# 系统架构

## 概览

```mermaid
flowchart LR
  Browser[浏览器 SPA]
  Pages[Cloudflare Pages 静态资源]
  Fn[Pages Functions]
  D1[(D1 SQLite)]
  R2[(R2 对象存储)]
  OpenAI[OpenAI API]
  PlantId[Plant.id 规划]
  Weather[Open-Meteo 等 规划]
  Mail[邮件服务 规划]

  Browser --> Pages
  Browser --> Fn
  Fn --> D1
  Fn --> R2
  Fn --> OpenAI
  Fn -.-> PlantId
  Fn -.-> Weather
  Fn -.-> Mail
```

花园助手是**纯前端 SPA + Edge API** 架构：无自建 Node 长驻服务。用户通过邮箱登录后，业务数据经 Cookie 会话访问 D1；图片经 R2 存储。

虚线表示 **v1.1 规划** 外部依赖，见 [`../requirements/planned-v1.1.md`](../requirements/planned-v1.1.md)。

## 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| UI | React 19 + Vite 8 + Tailwind 3 | `src/`，构建输出 `dist/` |
| 路由 | React Router 7 | `BrowserRouter`；Pages 配置 SPA 回退 |
| API | Cloudflare Pages Functions | `functions/api/**` |
| 数据库 | Cloudflare D1 | binding `DB` |
| 文件 | Cloudflare R2 | binding `BUCKET`，路径 `{userId}/{uuid}.ext` |
| AI | OpenAI Chat Completions | `gpt-4o-mini`，`OPENAI_API_KEY`；识别**规划**改 Plant.id |
| 邮件 | **规划** Resend/SendGrid 等 | 找回密码 |
| 天气 | **规划** Open-Meteo 等 | 日历自动填充 |

## 认证与数据隔离

- 会话：Cookie `ga_session`（HttpOnly，30 天）；共享逻辑 [`_shared/session.ts`](../../functions/api/_shared/session.ts)，`auth/` / `data/` / `upload` / `ai/` 复用。
- `/api/data/*`、`/api/upload`、`/api/ai/*` 须有效会话。
- **`GET /api/assets/*` 当前无会话校验**（规划 v1.1 修复，见 product-spec §3.14.2）。
- 植物及关联记录通过 `plants.user_id` 隔离；模板与天气按 `user_id` 存储。

## 前端页面与路由

| 路径 | 组件 | 认证 |
|------|------|------|
| `/login`, `/register` | Login, Register | 公开 |
| `/forgot-password`, `/reset-password` | — | **规划** §3.14.1 |
| `/` | Dashboard | 需登录 |
| `/plants` | PlantList | 需登录 |
| `/plants/new`, `/plants/:id/edit` | PlantForm | 需登录 |
| `/plants/:id` | PlantDetail | 需登录 |
| `/tasks` | Tasks | 需登录 |
| `/calendar` | Calendar | 需登录 |
| `/settings` | Settings | 需登录 |
| `/garden-map` | — | **规划** 花园平面图 §3.15 |

`App.tsx` 中 `RequireAuth` 包裹主布局；未登录重定向 `/login`。登录成功支持 `from` 回跳（`auth-redirect.ts`）。

## 后端模块划分

| 路径 | 职责 |
|------|------|
| `functions/api/_shared/session.ts` | Cookie、CORS、会话查询、Set-Cookie |
| `functions/api/_shared/interval-days.ts` | `normalizeIntervalDays` |
| `functions/api/auth/[[path]].ts` | 注册、登录、退出、/me、改密（规划：找回密码） |
| `functions/api/data/[[path]].ts` | 植物/记录/计划/待办/设置/天气 |
| `functions/api/data/due-tasks.ts` | 待办构建（列表/计数/日历） |
| `functions/api/data/schedule-algorithm.ts` | 待办日期纯函数（含 Vitest） |
| `functions/api/ai/*.ts` | advice、identify(OpenAI)、care-plan |
| `functions/api/upload.ts` | 图片上传 |
| `functions/api/assets/[[path]].ts` | R2 代理（规划：鉴权） |

## 前端数据访问层

- **`src/lib/storage-api.ts`**：唯一数据入口，`fetch('/api/data/...', { credentials: 'include' })`。
- **`src/lib/auth-api.ts`**：认证 API。
- **`src/lib/api.ts`**：AI 接口（需登录，`credentials: 'include'`）。
- **`src/lib/user-settings.ts`**：重导出 `storage-api` 的设置读写（勿另开 fetch 路径）。
- **`src/lib/calendar-timezone.ts`**：IANA 时区、月历网格、YMD 转换。

> **注意**：README 中「D1 失败回退 localStorage」的描述已过时；当前实现**仅 D1**，见 requirements §4.1、§10.1。

## 部署配置（wrangler.toml）

- `pages_build_output_dir = "./dist"`
- `[[d1_databases]]` → `DB`
- `[[r2_buckets]]` → `BUCKET`

生产环境另需在 Cloudflare Dashboard 配置 `OPENAI_API_KEY` 及 Pages 与 D1/R2 绑定。

**规划环境变量**：`PLANT_ID_API_KEY`、邮件服务相关 `MAIL_*` 等（见 [`planned-v1.1.md`](../requirements/planned-v1.1.md)）。

## 关键跨切面

| 主题 | 实现位置 |
|------|----------|
| Markdown 备注 | `MarkdownView` / `MarkdownTextarea`，remark-gfm |
| 图片压缩（识别） | `src/lib/compress-image.ts`，>1MB 压缩 |
| 待办完成乐观 UI | `Tasks.tsx` + `pendingHideRowKeysRef` |
| 品种共享计划 | `care_schedule_templates` + `variety_key`，见 [db-schema.md](./db-schema.md) |
| 待办算法 | [schedule-algorithm.md](./schedule-algorithm.md) |
| 事件模型 | [event-model.md](./event-model.md)（无消息队列，读时计算） |

## 本地开发与部署

### 前置条件

- Node.js（与 `package.json` 兼容的 LTS）
- Cloudflare 账号（D1、R2、Pages）
- OpenAI API Key（AI 功能）

### 本地命令

```bash
npm install
npm run dev          # 仅 Vite 前端（API 不可用）
npm run dev:full     # 构建后 wrangler pages dev（含 Functions / D1 / R2，需 .dev.vars）
npm test             # Vitest
npm run test:coverage
npm run build        # tsc + vite build → dist/
npm run deploy       # build + wrangler pages deploy
```

调试 **API / D1 / R2** 建议使用 `npm run dev:full` 或 `npx wrangler pages dev dist`（需先 `npm run build`），并加载 `.dev.vars`。

### 环境变量

| 变量 | 位置 | 用途 |
|------|------|------|
| `OPENAI_API_KEY` | `.env` / `.dev.vars` / Pages Dashboard | AI 接口 |
| D1 `DB` | `wrangler.toml` binding | 数据 API |
| R2 `BUCKET` | `wrangler.toml` binding | 图片上传 |

### 数据库迁移

1. 在 `wrangler.toml` 配置 `database_id`
2. 执行：`npx wrangler d1 migrations apply <database_name>`

迁移文件按 `migrations/0001_*.sql` 递增；**不要修改已应用的历史文件**。

### 实现注意事项

1. **数据层**：仅通过 `src/lib/storage-api.ts` 访问后端。
2. **认证**：数据与 AI 请求带 `credentials: 'include'`。
3. **共享计划删除**：前端区分 `scope`，提示影响范围。
4. **测试**：改 `schedule-algorithm.ts` / `due-tasks.ts` 时跑 `npm test`；覆盖率门禁见 `vite.config.ts`。
