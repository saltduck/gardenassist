# TASK-028：设置 suburb 后自动设置经纬度

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | N |
| 关联差距 | SET-06、LOC-04、US-15 |
| 状态 | ✅ 已完成 |
| Owner | Codex |
| Source | `docs/migration-report.md` |

## 目标

设置页保存 suburb 后，系统自动查询并保存经纬度，前端展示服务端最终保存的坐标。

## 范围

- `functions/api/data/[[path]].ts`：`PUT /settings` 识别 suburb/location 变化，刷新旧坐标。
- `src/lib/storage-api.ts`：`setUserSettings` 返回保存后的 `AppSettings`。
- `src/pages/Settings.tsx`：保存成功后回填经纬度；解析失败时展示错误。
- 相关测试与文档状态更新。

## 不在范围

- 引入新的商业地理编码服务。
- 建立完整 suburb 预设库。
- 修改植物自身 `plants.suburb` 的经纬度模型。

## 依赖

- TASK-013：settings 与 plants 已有 suburb 字段。
- TASK-022：已有 Open-Meteo geocode helper 与天气坐标回退链。

## 实施清单

- [x] 后端比较当前 settings 与请求体，判断是否需要按新 suburb/location 刷新坐标。
- [x] 用户手动修改经纬度时保留手动坐标。
- [x] suburb 自动解析失败时返回明确错误。
- [x] 前端保存后使用 API 响应回填经纬度字段。
- [x] 运行类型检查与相关测试。

## 验收标准

- [x] 已有旧坐标时修改 suburb，保存后经纬度按新 suburb 更新。
- [x] 不填经纬度、仅填 suburb，保存后经纬度自动出现。
- [x] 手动填写经纬度时，保存后不被 geocode 覆盖。
- [x] suburb 无法解析时，设置页展示错误，不静默保存错误坐标。
