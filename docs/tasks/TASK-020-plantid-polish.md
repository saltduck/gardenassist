# TASK-020：Plant.id 识别补齐

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | N |
| 关联差距 | ID-02 置信度、ID-04、PLANT-AI-06/08、US-13 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-015 |

## 目标

识别结果可追溯、可感知：展示置信度（若有）；识别成功时将 `plantId` 写入 `external_plant_id`（创建/更新植物时）。

## 范围

- `functions/api/ai/identify-plantid.ts`（解析 `probability` 等）
- `src/lib/api.ts`、`src/pages/PlantForm.tsx`
- `IdentifyResult` 类型

## 实施步骤

1. API 返回 `confidence?: number`（0–1 或百分比，与 Plant.id 字段对齐）。
2. `PlantForm` 识别成功后：`setForm` 含 `externalPlantId`；`createPlant`/`updatePlant` 提交该字段。
3. UI：识别成功旁显示「置信度 xx%」（低于阈值可提示「请核对」）。
4. OpenAI 回退路径不填 `externalPlantId`。

## 验收标准

- [ ] 识别后保存植物，DB `external_plant_id` 有值
- [ ] 用户可见置信度或「仅供参考」提示
- [ ] §11「Plant.id 主路径」在 staging 用真实 key 验证通过

## 不在范围

- 病虫害库查询（仅存 ID）
