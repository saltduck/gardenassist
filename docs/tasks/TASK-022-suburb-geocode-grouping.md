# TASK-022：suburb 分组、继承与坐标回退

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | N |
| 关联差距 | LOC-02、LOC-03、SET-05/06、US-15 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-013 |

## 目标

suburb 不仅可存，且用于列表分组/筛选、天气与季节；无经纬度时能从 suburb/location 解析坐标。

## 范围

- `src/pages/PlantList.tsx` — 按 suburb 分组（可与 location 分组切换或二级）
- `src/pages/PlantForm.tsx`、`functions/api/data/[[path]].ts` — 新建植物默认继承 `user_settings.suburb`
- `functions/api/_shared/geocode.ts`（新）— 调用 Open-Meteo Geocoding 或 Nominatim（免 key）
- `functions/api/data/[[path]].ts` — `weather/sync` 无 lat/lon 时尝试 geocode(settings.suburb || settings.location)
- `src/pages/Settings.tsx` — 可选 suburb 预设列表（澳洲/中国城市示例）

## 实施步骤

1. `PUT /settings` 保存 suburb 时，若 lat/lon 为空则后台 geocode 写回（可选异步）。
2. `POST /plants`：suburb 空则用 settings.suburb。
3. PlantList：`groupMode: 'location' | 'suburb'`，suburb 空归入「未设置 suburb」。
4. 文档更新 LOC-03 回退链：lat/lon → geocode(suburb) → geocode(location)。

## 验收标准

- [ ] 仅填 suburb + 城市 location、不手填经纬度，日历天气 sync 可成功
- [ ] 列表可按 suburb 分组展示
- [ ] 新植物默认带出设置页 suburb
- [ ] §11「suburb 设置/展示/天气与季节联动」可勾选

## 不在范围

- 完整全球郊区数据库
