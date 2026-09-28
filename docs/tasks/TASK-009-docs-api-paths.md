# TASK-009：修正 API 文档与 PLAN 漂移

| 字段 | 值 |
|------|-----|
| 优先级 | P3 |
| 阶段 | E |
| 关联违规 | V-301, V-302 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-003、TASK-005 完成后更新对应 API 说明 |

## 目标

`docs/architecture/api-contracts.md`、`docs/decisions/PLAN-historical.md` 与实现一致，避免按文档集成时 404。

## 范围

- `docs/architecture/api-contracts.md`
- `docs/decisions/PLAN-historical.md`（顶部警告 + 可选精简 §3 技术栈一句指向 requirements）
- `docs/README.md` — 链到 MIGRATION-REPORT（可选）

## 修正清单

| 文档写法 | 实际实现 |
|----------|----------|
| `GET /care-logs/recent?limit=` | `GET /recent-care-logs?limit=` |
| `GET /weather?from=&to=` | `GET /weather/range?from=&to=` |
| AI 无需登录 | TASK-005 后改为需登录 |
| `care-logs/date/:date` 无时区 | TASK-003 后补充 `tzOffsetMinutes` |

## 验收标准

- [ ] `docs/architecture/api-contracts.md` 每个路径与 `[[path]].ts` 路由 grep 一致
- [ ] `docs/decisions/PLAN-historical.md` 首段标明历史文档，链接 requirements + AGENTS.md
- [ ] 完成 TASK 后勾选 MIGRATION-REPORT §8 文档同步项

## 参考

- V-301、V-302
