# TASK-017：花园平面图与植物落点

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | L |
| 关联违规 | V11-011 |
| 状态 | ⬜ 未开始 |

## 目标

用户上传花园俯视图，在图上标注植物位置；路由 `/garden-map`（§3.14.7、§3.15）。

## 范围

- **migration**：`garden_maps`；`plants.map_x`, `map_y`, `garden_map_id`
- **API**：`GET/PUT /garden-map`、`PUT /plants/:id/map-position`
- **upload**：`POST /api/upload/garden-map`（或复用 upload 加 type 参数）
- **页面**：`src/pages/GardenMap.tsx`、`App.tsx`、`Nav.tsx`
- **文档**：`overview.md`、`api-contracts.md`、`db-schema.md`

## 不在范围

- GIS/CAD、多楼层、缩放瓦片
- 与外部地图服务集成

## 实施步骤

1. Migration 与 R2 key 约定（如 `{userId}/garden-map.{ext}`）。
2. `garden_maps` CRUD；单用户 v1 可仅支持一张主图。
3. 前端：展示图片；拖拽或点击放置 marker；归一化坐标 0–1 存 `map_x`/`map_y`。
4. `PUT map-position` 更新植物；列表/详情可链到花园地图。
5. 图片读取走已鉴权的 `/api/assets`（依赖 TASK-011）。

## 验收标准

- [ ] 上传平面图后刷新仍显示
- [ ] 拖拽保存后植物坐标持久化
- [ ] 未登录不可访问地图 API 与图片
- [ ] product-spec §11「花园平面图」可勾选

## 依赖

- **必须** TASK-011（assets 鉴权）

## 参考

- product-spec §3.14.7、§3.15 MAP-01～05
