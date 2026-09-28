# TASK-025：前端错误处理收尾

| 字段 | 值 |
|------|-----|
| 优先级 | P3 |
| 阶段 | N |
| 关联差距 | TASK-018 残留、§7.2、PlantDetail 静默失败 |
| 状态 | ✅ 已完成 |

## 目标

消除剩余静默 `catch`；与 §7.2「API 错误红色文案」一致。

## 范围

- `src/pages/PlantDetail.tsx` — `getUserSettings` 失败提示（不影响主内容可用 location 空）
- 确认 Calendar/PlantList/Dashboard 已覆盖（TASK-018 大部分已完成）

## 实施步骤

1. `PlantDetail`：`settingsError` 状态，设置加载失败显示条提示。
2. grep `catch(() => {})` 全 `src/`，逐项改为 `getErrorMessage` 或合理降级。
3. `npm run build` 通过。

## 验收标准

- [ ] `src/` 无业务 `getUserSettings().catch(() => {})` 空实现
- [ ] 断网时 PlantDetail 设置区有提示，AI 仍可用（location 可选）
