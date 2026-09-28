# TASK-014：天气自动同步

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | I |
| 关联违规 | V11-007, V11-008 |
| 状态 | ⬜ 未开始 |

## 目标

从外部天气 API（建议 Open-Meteo）拉取数据写入 `daily_weather`，减少日历手填（§3.14.6）。

## 范围

- **migration**：`daily_weather` 增加 `source`（`auto`|`user`）、`fetched_at`
- **修改**：`functions/api/data/[[path]].ts` — `POST /weather/sync`
- **修改**：`src/pages/Calendar.tsx`、`src/lib/storage-api.ts`
- **文档**：`api-contracts.md`、`event-model.md`

## 不在范围

- 小时级预报、病虫害预警
- Cron Trigger（v1 仅请求触发）

## 实施步骤

1. Migration 新列；现有行 `source` 默认 `user` 或 NULL→user。
2. `POST /weather/sync?from=&to=`：读用户 settings 的 lat/lon（无则 geocode 简化或跳过并 400 提示先设置 suburb）。
3. 调用 Open-Meteo（或同类），upsert `daily_weather`；`source=auto`，`fetched_at=now`。
4. **不覆盖** `source=user` 的日期（或仅填空字段，产品决策写入注释）。
5. Calendar 在月 grid 加载后 debounce 调用 sync（避免每次选日重复）。
6. 失败展示 `weatherError`（已有 pattern）。

## 验收标准

- [ ] 有坐标用户打开日历后月格出现自动气温/降水
- [ ] 用户手填日期不被自动 sync 覆盖（按 spec 规则）
- [ ] 未配置坐标时提示去设置页
- [ ] product-spec §11「天气自动同步」可勾选

## 依赖

- **推荐** TASK-013（lat/lon）

## 参考

- product-spec §3.14.6、WEATHER-01～04
