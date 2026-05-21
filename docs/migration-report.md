# suburb 自动经纬度迁移报告

日期：2026-05-21

## 新增规则

设置页保存 suburb 后，应自动查询并写入 `user_settings.latitude` / `user_settings.longitude`。若用户手动填写了经纬度，以手动值为准；若 suburb 变更但前端仍提交旧坐标，服务端应按新 suburb 刷新坐标。保存成功后，前端展示服务端最终保存的经纬度；解析失败时展示错误。

## 现有不满足点

1. `src/lib/storage-api.ts` 的 `setUserSettings` 丢弃 `PUT /settings` 响应，设置页无法回填服务端 geocode 后的坐标。
2. `src/pages/Settings.tsx` 保存时总是提交当前经纬度字段。用户修改 suburb 后，如果字段仍是旧坐标，会继续把旧坐标提交给服务端。
3. `functions/api/data/[[path]].ts` 的 `PUT /settings` 仅在请求经纬度为空时 geocode，不能识别“suburb 已变但经纬度仍是旧值”的场景。

## 影响

- 天气同步会继续使用旧经纬度，导致日历天气与新 suburb 不匹配。
- 季节浇水通过纬度判断南北半球，旧坐标会影响有效浇水间隔。
- Plant.id 识别上传时会带 settings 经纬度，旧坐标会降低识别上下文准确性。
- 用户界面保存后看不到自动解析结果，无法确认系统是否已设置坐标。

## 迁移计划

1. 后端读取当前 settings，比较新旧 suburb/location 与经纬度。
2. 当 suburb/location 变化且请求坐标未被用户手动改动时，忽略旧坐标并按新 suburb 优先 geocode。
3. geocode 成功后写入新坐标；若 suburb 存在但解析失败，返回可展示的 400 错误。
4. 前端 `setUserSettings` 返回服务端保存后的 settings。
5. 设置页保存成功后回填 `latitude` / `longitude`，使用户立即看到自动设置结果。
6. 增加覆盖后端坐标刷新规则与前端类型契约的针对性验证。

## 任务

- `docs/tasks/TASK-028-suburb-auto-geocode-settings.md`
