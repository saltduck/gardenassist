# 花园助手 — 项目文档

AI 助手请先读根目录 [`AGENTS.md`](../AGENTS.md)。

**需求版本**：[`requirements/product-spec.md`](./requirements/product-spec.md) **v1.1**（§1～§13 为已实现或现行约定；**§3.14～§3.15 为规划、未实现**）。

## 目录结构

```
docs/
├── requirements/
│   ├── product-spec.md      # 权威业务需求
│   ├── planned-v1.1.md      # v1.1 七项规划速查
│   ├── auth-flow.md
│   └── billing-rules.md
├── architecture/
│   ├── overview.md
│   ├── db-schema.md
│   ├── api-contracts.md
│   ├── event-model.md
│   └── schedule-algorithm.md
├── decisions/
└── tasks/                   # TASK-001…010（已完成）
```

## 文档索引

| 文档 | 说明 |
|------|------|
| [requirements/product-spec.md](./requirements/product-spec.md) | 完整业务需求、验收清单 |
| [requirements/planned-v1.1.md](./requirements/planned-v1.1.md) | **v1.1 规划**：找回密码、assets 鉴权、Plant.id、季节浇水、suburb、天气同步、花园平面图 |
| [requirements/auth-flow.md](./requirements/auth-flow.md) | 注册/登录/会话/鉴权 |
| [requirements/billing-rules.md](./requirements/billing-rules.md) | 计费（当前无） |
| [architecture/overview.md](./architecture/overview.md) | 系统架构、技术栈、本地开发 |
| [architecture/db-schema.md](./architecture/db-schema.md) | D1 表（含规划字段说明） |
| [architecture/api-contracts.md](./architecture/api-contracts.md) | HTTP 接口（含规划 API） |
| [architecture/event-model.md](./architecture/event-model.md) | 请求/响应与逻辑事件 |
| [architecture/schedule-algorithm.md](./architecture/schedule-algorithm.md) | 待办算法（含规划季节调整） |
| [decisions/MIGRATION-REPORT.md](./decisions/MIGRATION-REPORT.md) | 合规审计与 TASK 实施记录 |
| [decisions/PLAN-historical.md](./decisions/PLAN-historical.md) | 早期开发计划（历史） |
| [tasks/README.md](./tasks/README.md) | 任务索引：TASK-001～017 ✅；**TASK-019～027** 验收补齐 |

## v1.1 规划摘要

| 功能 | 详见 |
|------|------|
| 找回密码 | product-spec §3.14.1 |
| assets API 鉴权 | §3.14.2 |
| Plant.id 识别 | §3.14.3 |
| 季节浇水频率 | §3.14.4 |
| suburb 位置 | §3.14.5 |
| 天气自动填入 | §3.14.6 |
| 花园平面图 | §3.14.7、§3.15 |

## 维护约定

1. **产品语义变化** → 先改 `requirements/product-spec.md`
2. **实现落地** → 同步 `architecture/` 对应文件，并将规划项标为已实现
3. **助手默认假设** → 更新 `AGENTS.md`
4. **新规划 backlog** → 写入 product-spec §3.14 或扩展 `planned-v1.1.md`，避免只在 issue 中描述
