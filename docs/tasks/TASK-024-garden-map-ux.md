# TASK-024：花园平面图交互与入口

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | N |
| 关联差距 | MAP-02/05、§3.15 入口、US-17 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-017 |

## 目标

平面图支持移动端查看（缩放/平移）；植物可拖拽落点；从仪表盘或植物列表可进入。

## 范围

- `src/pages/GardenMap.tsx`
- `src/pages/Dashboard.tsx`、`src/pages/PlantList.tsx`
- 可选轻量依赖：`react-zoom-pan-pinch` 或 CSS `touch-action` + transform（评估 bundle）

## 实施步骤

1. 图容器外包一层 pan/zoom（双指缩放、拖拽平移）。
2. 已落点 marker 支持 **drag end** 更新坐标（`updatePlantMapPosition`）。
3. Dashboard 卡片「花园平面图」；PlantList 顶部链接。
4. 「只读模式」：无选植物时仅查看+跳转，有选植物时进入放置模式（满足 MAP-03）。

## 验收标准

- [ ] 手机浏览器可缩放查看全图
- [ ] 拖拽 marker 后刷新坐标持久化
- [ ] 从 `/` 或 `/plants` 可进入 `/garden-map`
- [ ] §11「花园平面图」可勾选

## 不在范围

- MAP-04 多图层（v2）
