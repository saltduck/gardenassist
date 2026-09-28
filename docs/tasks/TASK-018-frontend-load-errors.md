# TASK-018：前端加载错误处理与 ApiError 统一

| 字段 | 值 |
|------|-----|
| 优先级 | P3 |
| 阶段 | M |
| 关联违规 | V-401, V-402, V-403, V-405, V-406（部分） |
| 状态 | ⬜ 未开始 |

## 目标

符合 AGENTS §7：主要页面加载失败可见；`getUserSettings` 不静默失败；AI 层使用 `ApiError`。

## 范围

- **修改**：`src/pages/Calendar.tsx`、`PlantList.tsx`、`PlantDetail.tsx`
- **修改**：`src/lib/api.ts`
- **可选**：`Tasks.tsx` 去掉 `as any`（改用 `CareTaskType`）

## 不在范围

- 全站 Error Boundary
- 重试/离线模式

## 实施步骤

1. `Calendar`：增加 `loadError`；`getUserSettings` 失败写入错误；`getAllPlants` 与 due/logs `Promise.all` 加 `.catch`。
2. `PlantList`：`getAllPlants` 失败显示红色提示。
3. `PlantDetail`：移除 `getUserSettings` 空 catch，失败不影响主内容时可 toast 或次要提示。
4. `api.ts`：`postJson` / `identifyPlant` 抛 `ApiError`；调用方沿用 `getErrorMessage`。
5. `Tasks.tsx`：`taskType` select 使用正确 union 类型。

## 验收标准

- [ ] 断网或 500 时日历/列表显示错误文案，非永久空白
- [ ] 设置加载失败在日历有时区回退说明或错误条
- [ ] `npm run build` 无类型错误
- [ ] 与 Dashboard/Tasks 错误 UX 风格一致

## 依赖

- 无（建议 TASK-011 后、大功能开发前）

## 参考

- AGENTS.md §7
- `src/lib/api-error.ts`
