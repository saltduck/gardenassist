# 数据模型

与 [`../requirements/product-spec.md`](../requirements/product-spec.md) §4 对齐。物理表以 `migrations/` 为准。

## 逻辑关系

```
User
├── Session
├── UserSettings (location, suburb, latitude, longitude, time_zone)
├── Plant
│   ├── GrowthRecord
│   ├── CareLog
│   ├── CareSkip
│   └── CareSchedule (scope = plant)
├── CareScheduleTemplate (按 variety_key，语义 scope = shared)
└── DailyWeather (per date)
```

## 核心实体（应用层类型见 `src/types/plant.ts`）

### Plant

| 字段 | 说明 |
|------|------|
| id, name, variety, location, plantedAt | 档案 |
| photoUrl, notes | 可选；notes 支持 Markdown |
| archivedAt, archiveReason | 归档：`death` / `moved` / `other` |
| variety_key（仅库） | 小写：`trim(variety)` 或 `trim(name)`，匹配共享模板 |

**归档**：有 `archivedAt` 的植株不参与待办、今日计数、日历到期；列表默认隐藏（`includeArchived=1` 可查）。

**variety_key 更新**：编辑植物时默认**不**改 key；请求体 `syncVarietyKey: true` 时按新 name+variety 重算（影响共享模板匹配）。

### GrowthRecord

`plantId`, `date`, `height`, `leafCount`, `healthScore` (1–5), `photoUrl`, `notes`。

### CareLog

`plantId`, `taskType`, `doneAt` (ISO), `notes`。待办「完成」写入；日历「已完成」按 `doneAt` 的本地日展示。

### CareSkip

`plantId`, `taskType`, `skippedAt`。推进周期，**不算**已完成。与 CareLog 一起参与「最近动作」计算（取时间最晚者）。

### CareSchedule（应用层）

| 字段 | 说明 |
|------|------|
| taskType | 见下表 |
| intervalDays | 间隔天；**0 = 一次性** |
| startDate, endDate | 可选 YYYY-MM-DD 窗口 |
| note | 可选 Markdown |
| scope | `shared` \| `plant` |

**存储映射**：

| scope | D1 表 | API id 前缀 |
|-------|--------|-------------|
| shared | `care_schedule_templates` | `tpl:{id}` |
| plant | `care_schedules` | `plant:{id}` |

同一 `variety_key` 下可有多条共享计划（含同 taskType 多条，见 migration 0011）。

**植物生效计划** = 该植株 `variety_key` 的全部共享模板 + 该 `plant_id` 的 plant 计划。

### DailyWeather

主键 `(user_id, date)`：`tempMaxC`, `tempMinC`, `precipitationMm`（均可 null）；全 null 时删除记录。

### UserSettings

`location`（AI 与计划上下文）、`suburb`（郊区/街区）、`latitude` / `longitude`（天气、Plant.id 与季节规则坐标）、`time_zone`（IANA，空则自动推断）。

保存设置时若用户未手动提供经纬度，服务端优先按 `suburb` 自动 geocode，失败再回退 `location`；解析成功后写入 `latitude` / `longitude`。

## 养护任务类型 taskType

| 值 | 标签 |
|----|------|
| watering | 浇水 |
| fertilizing | 施肥 |
| pruning | 修剪 |
| repotting | 换盆 |
| pest_control | 除虫 |
| mulch | Mulch |
| mowing | 割草 |
| other | 其他 |

## 迁移文件索引

| 文件 | 内容 |
|------|------|
| 0001_initial | plants, growth_records, care_logs, care_schedules |
| 0003–0004 | schedule start/end, note |
| 0005–0006 | users, sessions, plants.user_id |
| 0007, 0014, 0017 | user_settings, time_zone, suburb, latitude, longitude |
| 0009–0011 | variety_key, templates, 取消同类型唯一约束 |
| 0012 | daily_weather |
| 0013 | care_skips |
| 0015 | archived_at, archive_reason |

新增 schema 请添加 `migrations/00xx_描述.sql`，勿修改已发布迁移。

## 术语

| 术语 | 含义 |
|------|------|
| variety_key | 共享养护模板分组键 |
| nextDue | 算法得出的应执行日期 YYYY-MM-DD |
| 共享计划 | templates 表，同 key 多株共用 |
| 仅此植株计划 | care_schedules 表，单 plantId |

---

## 规划扩展（v1.1，未迁移）

权威定义见 product-spec **§3.14** 与 [`../requirements/planned-v1.1.md`](../requirements/planned-v1.1.md)。实现时需**新增迁移**，并更新上表。

### 认证

| 表（规划） | 字段 | 说明 |
|------------|------|------|
| `password_reset_tokens` | `id`, `user_id`, `token`, `expires_at`, `used_at` | 找回密码一次性 token |

### Plant（扩展）

| 字段（规划） | 说明 |
|--------------|------|
| `suburb` | 可继承 settings 默认 |
| `map_x`, `map_y` | 花园平面图归一化坐标 0–1 |
| `garden_map_id` | FK → garden_maps |
| `external_plant_id` | Plant.id 返回的植物 ID（可选） |

### CareSchedule / Template（扩展）

| 字段（规划） | 说明 |
|--------------|------|
| `seasonal_watering_adjust` | boolean，仅影响 watering 的有效 interval |

季节系数可存 `season_month_factors` 配置表或 Workers KV JSON，见 product-spec §3.14.4。

### DailyWeather（扩展）

| 字段（规划） | 说明 |
|--------------|------|
| `source` | `auto` \| `user` |
| `fetched_at` | ISO，自动抓取时间 |

### GardenMap（新表，规划）

| 字段 | 说明 |
|------|------|
| `id`, `user_id`, `image_url`, `name`, `created_at` | 用户花园俯视图；图存 R2 |

### 逻辑 ER（规划后）

```
User
├── PasswordResetToken
├── UserSettings
├── GardenMap
├── Plant (+ map_x, map_y, external_plant_id)
├── …（其余同现网）
└── DailyWeather (+ source, fetched_at)
```
