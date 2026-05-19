# TASK-004：用户设置 API 并入 storage-api

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | C |
| 关联违规 | V-101 |
| 状态 | ✅ 已完成 |

## 目标

符合 `docs/architecture/overview.md`：**唯一业务数据入口**为 `src/lib/storage-api.ts`。

## 范围

- `src/lib/storage-api.ts` — 新增或迁入 settings 方法
- `src/lib/user-settings.ts` — 改为 re-export 或删除
- 调用方：`Settings.tsx`、`Dashboard.tsx`、`Tasks.tsx`、`Calendar.tsx`、`PlantDetail.tsx`（仅 `getUserSettings`）

## 实施步骤

1. 将 `user-settings.ts` 中 `fetchJson` 逻辑合并到 `storage-api.ts` 的私有 `fetchJson`（勿重复实现）
2. 导出 `getUserSettings` / `setUserSettings`
3. `user-settings.ts` 保留一行：`export { getUserSettings, setUserSettings } from './storage-api'`，或批量改 import 路径
4. grep 确认无其它 `/api/data/settings` 直连

## 验收标准

- [ ] 仅 `storage-api.ts` 内存在 `/api/data` 路径常量（settings 子路径）
- [ ] 设置页保存/读取正常
- [ ] 待办/日历时区行为不变

## 参考

- AGENTS.md — 目录要点 `storage-api`
- V-101
