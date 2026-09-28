# ADR-002：不采用微服务，SPA + Pages Functions 单体

| 状态 | 已采纳 |
|------|--------|
| 日期 | 2026 |
| 决策者 | 项目维护者 |

## 背景

功能边界清晰（CRUD + 待办算法 + 少量 AI 代理），用户量预期为个人/小规模。

## 决策

- **前端**：单仓库 Vite SPA（`src/`）
- **后端**：同仓库 `functions/api/`（Pages Functions），按路径分文件，**不**拆独立微服务或 BFF 集群
- **共享逻辑**：`schedule-algorithm.ts`、`due-tasks.ts`、`_shared/session.ts` 模块复用

## 理由

- 降低部署与调试成本
- Edge 冷启动可接受
- 业务规则集中，便于单测（`tests/`）

## 后果

- `functions/api/data/[[path]].ts` 体积较大，新功能优先抽到 `_shared` 或独立 `.ts` 再 import
- 水平扩展依赖 Cloudflare 平台，无自管 K8s

## 相关文档

- [`../architecture/overview.md`](../architecture/overview.md)
