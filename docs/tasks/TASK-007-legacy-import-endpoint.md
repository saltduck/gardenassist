# TASK-007：处理遗留 POST /api/data/import

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | D |
| 关联违规 | V-102 |
| 状态 | ✅ 已完成 |

## 目标

消除与「D1-only、无 localStorage 主存储」冲突的遗留批量导入接口，或将其严格限定为可控的一次性迁移工具。

## 背景

`[[path]].ts` L232+ 实现 `POST /api/data/import`，注释为「从 localStorage 同步到 D1」。前端**无引用**。可 `INSERT OR REPLACE` 植物与旧版 `care_schedules`（非 templates）。

## 方案（二选一，PR 描述中须说明选择）

### 方案 A — 删除（推荐）

1. 删除 `import` 路由整块
2. grep 全库确认无调用
3. 若未来需要导入，按 requirements §10.2 单独立项（JSON 格式 + templates/skips/archived）

### 方案 B — 门禁保留

1. 仅当 `env.ENABLE_DATA_IMPORT === 'true'` 时注册路由
2. `docs/architecture/overview.md` 注明仅本地迁移、生产禁止开启
3. 扩展 import 支持 `care_schedule_templates`、`archivedAt`（否则仍不完整）

## 验收标准

- [ ] 生产默认无法批量 import（删除或 env 关闭）
- [ ] AGENTS.md / requirements 无「localStorage 同步」实现路径误导
- [ ] 无前端破坏性变更（本无调用）

## 参考

- V-102、migration-report 阶段 D
