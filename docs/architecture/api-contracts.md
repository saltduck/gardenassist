# API 参考

与 [`../requirements/product-spec.md`](../requirements/product-spec.md) §5 对齐。所有 `/api/data` 与上传接口需登录（Cookie `ga_session`），否则 401。

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
| GET/PUT | `/settings` | `{ location, timeZone }` |
| GET | `/weather/range?from=&to=` | 日期范围天气 |
| PUT/DELETE | `/weather/:date` | upsert / 删除 |

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
| POST | `/identify` | multipart `image` 或 `{ imageBase64 }` | `{ success, name?, variety?, raw? }` |
| POST | `/care-plan` | `{ variety, location? }` | `{ success, items: [{ taskType, intervalDays, note? }] }` |

**care-plan 注意**：`intervalDays` 可为 `0`（一次性任务）；非法值默认 `7`。

---

## 上传与资源

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | multipart 字段 `file`，≤5MB → `{ url }` |
| GET | `/api/assets/*` | R2 对象流 |

`url` 形如 `/api/assets/{userId}/{uuid}.jpg`，可直接作 `photoUrl`。

---

## 实现入口

- 数据路由：`functions/api/data/[[path]].ts`
- 认证：`functions/api/auth/[[path]].ts`
- 前端封装：`src/lib/storage-api.ts`、`src/lib/auth-api.ts`、`src/lib/api.ts`
