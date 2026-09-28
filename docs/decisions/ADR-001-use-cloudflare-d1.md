# ADR-001：使用 Cloudflare D1 作为主数据库

| 状态 | 已采纳 |
|------|--------|
| 日期 | 2026（产品 D1-only 迁移后） |
| 决策者 | 项目维护者 |

## 背景

个人花园应用需云端持久化、多设备访问，部署目标为 Cloudflare Pages，团队规模小、无专职 DBA。

## 决策

采用 **Cloudflare D1**（SQLite）作为唯一业务数据库，通过 Pages Functions binding `DB` 访问；**不使用** 自建 PostgreSQL/MySQL。

## 理由

- 与 Pages / R2 / Workers 同平台，运维简单
- 按量计费适合个人项目
- 关系模型足够表达植物、记录、计划、会话

## 后果

- 迁移通过 `migrations/*.sql` + `wrangler d1 migrations apply`
- 本地开发需 `wrangler pages dev` 或 `npm run dev:full` 才能访问 API
- 复杂分析、全文检索能力有限；当前产品无此需求

## 相关文档

- [`../architecture/db-schema.md`](../architecture/db-schema.md)
- [`../requirements/product-spec.md`](../requirements/product-spec.md) §4
