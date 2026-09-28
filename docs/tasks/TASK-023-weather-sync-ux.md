# TASK-023：天气同步范围与失败提示

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | N |
| 关联差距 | WEATHER-01、WEATHER-04、CAL-06、US-16 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-014、推荐 TASK-022（坐标回退） |

## 目标

打开日历时按 spec 同步 **today−7 … today+7**（用户时区）；同步失败显示「天气暂不可用」，不静默。

## 范围

- `src/pages/Calendar.tsx`
- `functions/api/data/[[path]].ts` — `weather/sync` 可接受默认范围
- 可选：`src/lib/storage-api.ts` — `syncWeatherAroundToday(tz)`

## 实施步骤

1. 计算用户时区下 `today`，`from = today-7`，`to = today+7`（与月视图并行：进入月仍 sync 当月，**额外**或**改为**以 today±7 为主 — 产品决策写入注释：推荐日历加载时 sync `max(monthFrom, today-7)` 到 `min(monthTo, today+7)`）。
2. `syncWeatherRange(...).catch` → `setWeatherSyncWarning('天气暂不可用，可手填或稍后重试')`。
3. 成功后可 toast「已更新 x 天天气」。
4. （可选）服务端对 sync 按 user 限流 1 次/5 分钟。

## 验收标准

- [ ] 无坐标且未 geocode 时提示去设置；有坐标时 today±7 有 auto 数据
- [ ] Open-Meteo 失败时日历仍可用，顶部/天气区有明确文案
- [ ] 用户手填日期仍为 `source=user` 且不被覆盖
- [ ] §11「天气自动同步且用户可覆盖」可勾选
