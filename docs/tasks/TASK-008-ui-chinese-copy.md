# TASK-008：中文文案与归档交互

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | E |
| 关联违规 | V-201, V-202 |
| 状态 | ✅ 已完成 |

## 目标

面向用户的文案符合 AGENTS.md「中文」约定；归档原因不以英文枚举展示。

## 范围

- `src/types/plant.ts` — `CARE_TASK_TYPES` 中 `mulch` 标签
- `src/pages/PlantDetail.tsx` — 归档徽章、归档交互
- 可选：抽取 `archiveReasonLabel(reason)` 工具函数

## 实施步骤

1. `mulch` label 改为「铺盖」或「覆盖物」（与园艺习惯一致，requirements 表可同步）
2. 展示：`archiveReason` 映射为 死亡/迁走/其他
3. 归档 UI：用 `<select>` 或三个按钮替代 `prompt('death=...')`
4. 校验非法输入逻辑可删除（由 select 保证）

## 验收标准

- [ ] 植物详情归档徽章为中文
- [ ] 任务类型列表无英文 Mulch（除非品种学名等例外）
- [ ] 归档流程无需用户记忆 death/moved/other 英文 code

## 参考

- requirements PLANT-07、§3.6
- V-201、V-202
