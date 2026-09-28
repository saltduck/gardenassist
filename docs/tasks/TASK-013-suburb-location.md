# TASK-013：suburb 与地理坐标

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | H |
| 关联违规 | V11-005, V11-006 |
| 状态 | ⬜ 未开始 |

## 目标

支持 suburb 级位置与可选经纬度，为天气同步、Plant.id、季节规则提供输入（§3.14.5）。

## 范围

- **migration**：`user_settings` 增加 `suburb`, `latitude`, `longitude`；`plants` 增加 `suburb`
- **修改**：`functions/api/data/[[path]].ts` settings/plants 映射
- **修改**：`src/lib/storage-api.ts`、`src/types/plant.ts`、`Settings.tsx`、`PlantForm.tsx`、`PlantList.tsx`
- **文档**：`db-schema.md`、`api-contracts.md`

## 不在范围

- 完整地理编码服务（v1 可手填 suburb + 可选 lat/lon 数字输入）
- 按 suburb 的复杂地图 UI

## 实施步骤

1. 新增 migration，默认值 NULL。
2. `GET/PUT /settings` 读写新字段；植物创建/更新可写 `suburb`（空则继承 settings 默认，逻辑写在 API 或前端文档化）。
3. Settings 表单项：suburb、可选 lat/lon。
4. PlantList：筛选框增加 suburb；或分组模式切换（location / suburb）。
5. 类型与 `storage-api` 的 `UserSettings` 接口更新。

## 验收标准

- [ ] 设置保存后刷新仍存在 suburb/lat/lon
- [ ] 植物可单独覆盖 suburb
- [ ] 列表可按 suburb 筛选或分组（与 product-spec LOC-02 一致）
- [ ] `npm test` 全绿

## 依赖

- 无（建议先于 TASK-014、TASK-016）

## 参考

- product-spec §3.14.5、实体图 §4
