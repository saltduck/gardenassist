# 花园助手 — 项目文档

AI 助手请先读根目录 [`AGENTS.md`](../AGENTS.md)。

## 目录结构

```
docs/
├── requirements/          # 产品需求（What / Why）
│   ├── product-spec.md
│   ├── auth-flow.md
│   └── billing-rules.md
├── architecture/          # 技术实现（How）
│   ├── overview.md
│   ├── db-schema.md
│   ├── api-contracts.md
│   ├── event-model.md
│   └── schedule-algorithm.md
├── decisions/             # ADR 与历史决策
│   ├── ADR-001-use-cloudflare-d1.md
│   ├── ADR-002-no-microservices.md
│   ├── MIGRATION-REPORT.md
│   └── PLAN-historical.md
└── tasks/                 # 可执行任务
    └── TASK-*.md
```

## 文档索引

| 文档 | 说明 |
|------|------|
| [requirements/product-spec.md](./requirements/product-spec.md) | 完整业务需求、需求 ID、验收清单 |
| [requirements/auth-flow.md](./requirements/auth-flow.md) | 注册/登录/会话/鉴权 |
| [requirements/billing-rules.md](./requirements/billing-rules.md) | 计费（当前无） |
| [architecture/overview.md](./architecture/overview.md) | 系统架构、技术栈、本地开发 |
| [architecture/db-schema.md](./architecture/db-schema.md) | D1 表、variety_key、共享计划 |
| [architecture/api-contracts.md](./architecture/api-contracts.md) | HTTP 接口 |
| [architecture/event-model.md](./architecture/event-model.md) | 请求/响应与逻辑事件 |
| [architecture/schedule-algorithm.md](./architecture/schedule-algorithm.md) | 待办到期日算法 |
| [decisions/MIGRATION-REPORT.md](./decisions/MIGRATION-REPORT.md) | 合规审计与 TASK 实施记录 |
| [decisions/PLAN-historical.md](./decisions/PLAN-historical.md) | 早期开发计划（历史） |
| [tasks/README.md](./tasks/README.md) | 任务清单 TASK-001 … |

## 维护约定

行为、API 或表结构变更时同步更新：

1. `requirements/product-spec.md`（若产品语义变化）
2. `architecture/` 对应文件
3. `AGENTS.md` 要点
