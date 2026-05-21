# API 参考

与 [`../requirements/product-spec.md`](../requirements/product-spec.md) §5 对齐。

- **已实现**：§5.1～5.4 中未标注「规划」的接口。
- **规划（v1.1）**：见 [§6 规划接口](#6-规划接口v11)；权威定义 product-spec §3.14。

所有 `/api/data` 与上传接口需登录（Cookie `ga_session`），否则 401。**例外（当前）**：`GET /api/assets/*` 尚无会话校验，见 §3.14.2。

## 通用约定

- **Base**：同源 `/api/...`
- **凭证**：`credentials: 'include'`
- **JSON**：`Content-Type: application/json`（上传除外）
- **CORS**：带 Cookie 时响应须回显请求 `Origin`
- **错误**：JSON `{ error: string }` 或 AI 接口 `{ success: false, error }`

### 时区参数

待办相关 GET 支持 `tzOffsetMinutes`（与 `Date.getTimezoneOffset()` 一致）。服务端用其将 ISO 时间转为本地 YYYY-MM-DD 计算 `today` 与 `nextDue`。

---

## 认证 ` /api/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/me` | 当前用户 `{ id, email }` |
| POST | `/register` | `{ email, password }` |
| POST | `/login` | 设置会话 Cookie |
| POST | `/logout` | 清除 Cookie |
| POST | `/change-password` | `{ currentPassword, newPassword }` |
| POST | `/forgot-password` | **规划** §3.14.1 |
| POST | `/reset-password` | **规划** `{ token, newPassword }` |

---

## 数据 ` /api/data/*`

### 植物

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/plants?includeArchived=0\|1` | 列表 |
| POST | `/plants` | 创建 |
| GET | `/plants/:id` | 详情 |
| PUT | `/plants/:id` | 更新；可选 `syncVarietyKey` |
| DELETE | `/plants/:id` | 删除（级联） |

### 生长 / 养护 / 跳过

| 方法 | 路径 |
|------|------|
| GET/POST | `/plants/:id/growth` |
| DELETE | `/growth/:id` |
| GET/POST | `/plants/:id/care-logs` |
| PUT/DELETE | `/care-logs/:id` |
| GET/POST | `/plants/:id/care-skips` |

### 养护计划

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/plants/:id/schedules` | POST body 含 `scope`, `taskType`, `intervalDays`, … |
| PUT/DELETE | `/schedules/:id` | id 为 `tpl:...` 或 `plant:...` |

### 其它

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/plants/:id/timeline` | 生长+养护时间线 |
| GET | `/tasks/due?range=today\|week&tzOffsetMinutes=` | 待办列表 |
| GET | `/tasks/today-count?tzOffsetMinutes=` | 今日待办数 |
| GET | `/tasks/due/:date?tzOffsetMinutes=` | 指定日到期任务 |
| GET | `/recent-care-logs?limit=` | 仪表盘最近养护 |
| GET | `/care-logs/date/:date?tzOffsetMinutes=` | 指定日已完成养护（本地日） |
| GET | `/settings` | `{ location, timeZone, suburb, latitude, longitude }` |
| PUT | `/settings` | 保存 `{ location, timeZone, suburb, latitude?, longitude? }`；若未手动指定坐标且 suburb/location 可解析，服务端自动 geocode 并返回最终坐标 |
| GET | `/weather/range?from=&to=` | 日期范围天气 |
| PUT/DELETE | `/weather/:date` | upsert / 删除；**规划** `source`, `fetchedAt` |
| POST | `/weather/sync?from=&to=` | 从 Open-Meteo 拉取写入；坐标来源：settings 经纬度 → geocode(suburb) → geocode(location) |
| GET/PUT | `/garden-map` | **规划** 花园平面图元数据 §3.14.7 |
| PUT | `/plants/:id/map-position` | **规划** `{ mapX, mapY, gardenMapId? }` |

### 待办响应形状（DueTask）

```ts
{
  plant: Plant
  schedule: CareSchedule
  nextDue: string      // YYYY-MM-DD
  lastDoneAt: string | null
}
```

---

## AI ` /api/ai/*`

需登录（Cookie `ga_session`）；Key 在服务端，不暴露给前端。

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| POST | `/advice` | `{ plantSummary, userQuestion, userLocation? }` | `{ success, text? }` |
| POST | `/identify` | **当前** OpenAI；multipart / base64 → `{ success, name?, variety?, raw? }` |
| POST | `/identify-plantid` | **规划** Plant.id 代理 §3.14.3 |
| POST | `/care-plan` | `{ variety, location? }` | `{ success, items: [{ taskType, intervalDays, note? }] }` |

**care-plan 注意**：`intervalDays` 可为 `0`（一次性任务）；非法值默认 `7`。

---

## 上传与资源

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | multipart 字段 `file`，≤5MB → `{ url }` |
| GET | `/api/assets/*` | R2 对象流；**当前无鉴权** |
| POST | `/api/upload/garden-map` | **规划** 花园平面图 §3.14.7 |

`url` 形如 `/api/assets/{userId}/{uuid}.jpg`，可直接作 `photoUrl`。

**安全（规划 ASSET-01～04）**：`GET /api/assets/*` 须 Cookie 会话，且 path 中 `userId` 必须等于当前用户 id；否则 404。

---

## 6. 规划接口（v1.1）

汇总见 [`../requirements/planned-v1.1.md`](../requirements/planned-v1.1.md)。实现后移入上文对应章节并删除「规划」标记。

| 领域 | 规划端点 |
|------|----------|
| 认证 | `forgot-password`, `reset-password` |
| 资源 | assets 鉴权（行为变更，非新路径） |
| AI | `identify-plantid` 或替换 `identify` |
| 天气 | `POST /weather/sync` |
| 地图 | `GET/PUT /garden-map`, `PUT /plants/:id/map-position` |

---

## 实现入口

- 数据路由：`functions/api/data/[[path]].ts`
- 认证：`functions/api/auth/[[path]].ts`
- 会话共享：`functions/api/_shared/session.ts`
- 前端封装：`src/lib/storage-api.ts`、`src/lib/auth-api.ts`、`src/lib/api.ts`
