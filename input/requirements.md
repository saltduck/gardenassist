# 花园助手（Garden Assist）业务需求文档

| 项目 | 说明 |
|------|------|
| 文档版本 | 1.0 |
| 生成依据 | `README.md`、`PLAN.md`、源代码、数据库迁移、API 实现 |
| 产品定位 | 个人花园植物生长与养护跟踪 Web 应用 |
| 目标用户 | 拥有私人花园/阳台/室内植物的个人爱好者 |

---

## 1. 项目背景与目标

### 1.1 背景

用户需要在一处集中管理多株植物：记录档案与生长变化、安排并执行浇水/施肥等养护、回顾历史，并在需要时获得 AI 辅助（识别品种、养护建议、自动生成周期计划）。

### 1.2 业务目标

1. **可追溯**：每株植物有完整档案、生长快照、养护执行记录与时间线。
2. **可提醒**：根据养护计划自动计算「今日/本周」待办，减少遗漏。
3. **可协作于自身**：同品种多株植物可共享养护计划模板，减少重复配置。
4. **可辅助决策**：结合所在地/季节与植物状态，通过 AI 获取建议或一键生成计划。
5. **可跨设备**：数据存于云端（Cloudflare D1），需登录后使用，支持多终端访问。

### 1.3 非目标（当前版本）

- 多租户/团队共享花园
- 社交、商城、病虫害百科库
- 推送通知 / PWA 离线提醒（规划中，未实现）
- 数据导入导出（规划中，未实现）

---

## 2. 用户与权限

### 2.1 用户角色

| 角色 | 说明 |
|------|------|
| 访客 | 仅可访问登录、注册页 |
| 已登录用户 | 可访问全部业务功能；数据按 `user_id` 隔离 |

### 2.2 认证与会话

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| AUTH-01 | 邮箱 + 密码注册 | 注册成功后建立会话并进入首页 |
| AUTH-02 | 邮箱 + 密码登录 | Cookie `ga_session`，HttpOnly，SameSite=Lax，有效期 30 天 |
| AUTH-03 | 退出登录 | 清除会话 Cookie，跳转登录页 |
| AUTH-04 | 未登录访问受保护路由 | 重定向至 `/login`，保留 `from` 状态 |
| AUTH-05 | 修改密码 | 需验证当前密码；新密码至少 6 位；两次输入一致 |
| AUTH-06 | 密码存储 | 服务端 SHA-256(salt + password)，每用户独立 salt |

### 2.3 数据隔离

- 植物、生长记录、养护记录、养护计划、天气、用户设置均归属当前登录用户。
- 所有 `/api/data/*` 接口须已登录，否则返回 401。

---

## 3. 功能需求

### 3.1 导航与信息架构

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/` | 仪表盘 | 需登录 |
| `/plants` | 植物列表 | 需登录 |
| `/plants/new` | 添加植物 | 需登录 |
| `/plants/:id` | 植物详情 | 需登录 |
| `/plants/:id/edit` | 编辑植物 | 需登录 |
| `/tasks` | 待办任务 | 需登录 |
| `/calendar` | 日历 | 需登录 |
| `/settings` | 设置 | 需登录 |

顶部导航固定展示：仪表盘、植物、添加植物、待办、日历、设置；右侧显示邮箱与退出。

---

### 3.2 植物档案（Plant）

#### 3.2.1 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 系统生成 | UUID |
| name | string | 是 | 植物名称 |
| variety | string | 否 | 品种；用于 AI 养护计划、品种关联键 |
| location | string | 否 | 种植位置（如阳台、客厅） |
| plantedAt | ISO 日期 | 是 | 种植日期 |
| photoUrl | string | 否 | 照片 URL（R2 或外链） |
| notes | string | 否 | 备注，支持 Markdown 展示 |
| archivedAt | ISO 时间 | 否 | 归档时间；存在则视为已归档 |
| archiveReason | enum | 否 | `death` / `moved` / `other` |
| createdAt / updatedAt | ISO 时间 | 系统 | 创建/更新时间 |

服务端另有 `variety_key`（小写）：优先取 `variety`  trim 后值，为空则取 `name`，用于匹配「同品种共享」养护模板。

#### 3.2.2 功能列表

| 需求 ID | 描述 |
|---------|------|
| PLANT-01 | 植物列表：卡片展示名称、品种、位置、缩略图；支持按名称/品种/位置文本筛选 |
| PLANT-02 | 列表按位置分组展示，未设置位置归入「未设置位置」 |
| PLANT-03 | 可选「显示已归档植物」；默认不展示归档植株 |
| PLANT-04 | 添加植物：表单提交后跳转详情页 |
| PLANT-05 | 编辑植物：可更新各字段；可选「同步更新养护计划关联键」 |
| PLANT-06 | 删除植物：二次确认；级联删除关联的生长/养护/计划等数据 |
| PLANT-07 | 归档：输入原因 death/moved/other；写入 `archivedAt`；自动添加一条生长记录说明归档 |
| PLANT-08 | 取消归档：清除归档字段 |
| PLANT-09 | 归档植物不参与待办、今日计数、日历到期计算 |

#### 3.2.3 拍照识别（添加/编辑页）

| 需求 ID | 描述 |
|---------|------|
| PLANT-AI-01 | 「拍照识别」：上传 jpg/png/webp，最大 30MB；大于 1MB 时客户端压缩 |
| PLANT-AI-02 | 调用 `POST /api/ai/identify`，回填名称、品种 |
| PLANT-AI-03 | 识别同时尝试上传照片至 R2，成功则写入 `photoUrl` |
| PLANT-AI-04 | 识别失败展示错误信息，不阻断手动填写 |

#### 3.2.4 照片上传

| 需求 ID | 描述 |
|---------|------|
| PLANT-UP-01 | `POST /api/upload`，multipart 字段 `file`，最大 5MB |
| PLANT-UP-02 | 存储路径 `{userId}/{uuid}.{ext}`，返回 `/api/assets/{key}` |
| PLANT-UP-03 | 支持粘贴外链或上传后自动填入 |

---

### 3.3 生长记录（GrowthRecord）

| 字段 | 说明 |
|------|------|
| plantId | 所属植物 |
| date | 记录日期 |
| height | 高度（cm），可选 |
| leafCount | 叶片数，可选 |
| healthScore | 健康度 1–5，可选 |
| photoUrl | 照片，可选 |
| notes | 备注（Markdown） |

| 需求 ID | 描述 |
|---------|------|
| GROW-01 | 详情页添加、列表展示、单条删除 |
| GROW-02 | 参与该植物「时间线」（与养护记录合并按时间排序） |

---

### 3.4 养护记录（CareLog）

| 字段 | 说明 |
|------|------|
| plantId | 所属植物 |
| taskType | 养护类型（见 3.6） |
| doneAt | 完成时间（ISO，可精确到时分） |
| notes | 备注（Markdown） |

| 需求 ID | 描述 |
|---------|------|
| CARE-01 | 详情页手动添加养护记录 |
| CARE-02 | 待办页「完成」时写入 CareLog，`doneAt` 为用户选择的完成日期（中午 UTC 锚点） |
| CARE-03 | 支持编辑类型、完成时间、备注；支持删除 |
| CARE-04 | 参与时间线；日历「已完成」列表按完成日期的本地日展示 |

---

### 3.5 跳过记录（CareSkip）

用于将某次到期任务推进到下一周期，**不计入**「已完成」。

| 需求 ID | 描述 |
|---------|------|
| SKIP-01 | 待办任务可「跳过」；确认后写入 `skippedAt`（对应当次 `nextDue` 日期） |
| SKIP-02 | 计算下次到期时，取该植物+任务类型下，养护完成与跳过记录中**时间最晚**的一条作为基准 |

---

### 3.6 养护任务类型

| 值 | 中文标签 |
|----|----------|
| watering | 浇水 |
| fertilizing | 施肥 |
| pruning | 修剪 |
| repotting | 换盆 |
| pest_control | 除虫 |
| mulch | Mulch |
| mowing | 割草 |
| other | 其他 |

待办列表中各类型有独立配色标签，与同品种/仅此植株的范围标签区分。

---

### 3.7 养护计划（CareSchedule）

#### 3.7.1 计划属性

| 字段 | 说明 |
|------|------|
| taskType | 任务类型 |
| intervalDays | 间隔天数；**0 表示一次性任务** |
| startDate | 可选，YYYY-MM-DD；未开始则不生效 |
| endDate | 可选；超过则不再产生待办 |
| note | 可选，Markdown；展示在待办/详情 |
| scope | `shared` 同品种共享 / `plant` 仅此植株 |

#### 3.7.2 同品种共享机制

- **共享计划**存于 `care_schedule_templates`，按 `user_id + variety_key` 关联。
- 某植物生效计划 = 其 `variety_key` 下所有共享模板 + 该植物 `scope=plant` 的独立计划。
- 同一品种、同一任务类型可存在**多条**共享计划（迁移 0011 已取消唯一约束）。
- 删除共享计划时提示：会影响同品种其它植株。
- 编辑植物品种名称**默认不**改变 `variety_key`；勾选「同步更新养护计划关联键」时按新名称+品种重算。

#### 3.7.3 功能列表

| 需求 ID | 描述 |
|---------|------|
| SCHED-01 | 详情页添加、编辑、删除养护计划 |
| SCHED-02 | 待办页可内联编辑计划（类型、间隔、起止日期、备注），不改变 scope |
| SCHED-03 | 待办页可删除计划（含确认文案） |

#### 3.7.4 待办日期计算规则（核心业务规则）

设 `today` 为用户时区下的当前日期（由 `tzOffsetMinutes` 或 IANA 时区解析）。

**最近一次动作日期 `last`**：该 `plantId + taskType` 下，所有 CareLog.doneAt 与 CareSkip.skippedAt 转为本地日后，取时间最晚者对应的本地日。

| 场景 | 规则 |
|------|------|
| 周期性（interval > 0），无 last | 若 `startDate > today` 则到期日为 startDate，否则为 today |
| 周期性，有 last，且 last < startDate | 到期日为 startDate |
| 周期性，有 last | `last + interval`；若仍 < today，则按 interval 递增直到 ≥ today（`computeNextDue`） |
| 今日待办列表 | 使用 `computeDueFromLast`：可能保留**已逾期**的到期日（≤ today） |
| 本周待办 | 使用 `computeNextDue`：仅包含 `today < nextDue ≤ today+6` |
| 一次性（interval = 0） | 无 last 时到期一次；有 last 后不再出现 |
| 窗口外 | `nextDue` 不在 [startDate, endDate] 内则排除 |

归档植物、计划窗口外、一次性已完成均不产生待办。

---

### 3.8 待办任务（Tasks）

| 需求 ID | 描述 |
|---------|------|
| TASK-01 | 「今日待办」：到期日 ≤ 今日（含逾期），标红「已逾期」 |
| TASK-02 | 「本周待办」：到期日在今日之后至今日+6 天内 |
| TASK-03 | 展示植物名、任务类型、范围标签、计划备注、到期日 |
| TASK-04 | 完成：弹窗选择完成日期，写入 CareLog，乐观隐藏 + 轮询刷新防滞后 |
| TASK-05 | 跳过、编辑计划、删除计划 |
| TASK-06 | 日期计算使用设置中的 IANA 时区（见 3.10） |

---

### 3.9 日历（Calendar）

| 需求 ID | 描述 |
|---------|------|
| CAL-01 | 月视图网格，按用户时区对齐「今天」 |
| CAL-02 | 每格显示：气温区间、降水量、到期任务数、已完成任务数 |
| CAL-03 | 点击日期：右侧展示当日到期任务、已完成养护、天气编辑表单 |
| CAL-04 | 支持上月/下月/今天跳转 |
| CAL-05 | 天气数据按用户存储，字段：最高温、最低温、降水量（mm）；可部分留空；全空则删除记录 |

---

### 3.10 用户设置（Settings）

| 字段 | 说明 |
|------|------|
| location | 所在地文本，供 AI 建议与 care-plan 使用 |
| timeZone | IANA 时区；空表示自动推断 |

| 需求 ID | 描述 |
|---------|------|
| SET-01 | 快速选择预设城市（北京、上海、新加坡等），联动填充 location 与 timeZone |
| SET-02 | 时区「自动」：预设地名映射表匹配；否则用浏览器本机时区 |
| SET-03 | 影响：仪表盘今日待办数、待办页、日历月格与「今天」 |
| SET-04 | 修改密码（见 AUTH-05） |

---

### 3.11 仪表盘（Dashboard）

| 需求 ID | 描述 |
|---------|------|
| DASH-01 | 展示活跃植物总数（不含归档） |
| DASH-02 | 展示今日待办数量（含时区说明） |
| DASH-03 | 快捷「添加植物」 |
| DASH-04 | 最近 5 株植物链接 |
| DASH-05 | 最近 5 条养护记录（跨植物） |

---

### 3.12 AI 能力

所有 AI 接口为 `POST`，由 Cloudflare Pages Functions 代理 OpenAI（`gpt-4o-mini`），需配置 `OPENAI_API_KEY`。

#### 3.12.1 养护建议

| 项目 | 说明 |
|------|------|
| 接口 | `POST /api/ai/advice` |
| 入参 | `plantSummary`, `userQuestion`, `userLocation?` |
| 出参 | `{ success, text? }` 或 `{ success: false, error }` |
| 前端 | 植物详情页；展示结果；支持复制、追加到植物备注 |

#### 3.12.2 拍照识别

| 项目 | 说明 |
|------|------|
| 接口 | `POST /api/ai/identify` |
| 入参 | multipart `image` 或 JSON `imageBase64` |
| 出参 | `{ success, name?, variety?, raw? }` |

#### 3.12.3 自动养护计划

| 项目 | 说明 |
|------|------|
| 接口 | `POST /api/ai/care-plan` |
| 入参 | `variety`（必填）, `location?` |
| 出参 | `{ success, items: [{ taskType, intervalDays, note? }] }` |
| 前端 | 品种已填时可用；列表勾选后「确认添加」写入 CareSchedule（默认共享 scope，经 addCareSchedule） |
| 后端 | 非法 taskType 映射为 other；intervalDays 最小为 1（API 层） |

---

### 3.13 植物详情 — 时间线

| 需求 ID | 描述 |
|---------|------|
| TL-01 | 合并生长记录与养护记录，按日期降序 |
| TL-02 | 区分「生长」「养护」标签；展示关键指标或备注 Markdown |

---

## 4. 数据模型（逻辑 ER）

```
User
├── Session (token, expires_at)
├── UserSettings (location, time_zone)
├── Plant (variety_key, archived_at, archive_reason)
│   ├── GrowthRecord
│   ├── CareLog
│   ├── CareSkip
│   └── CareSchedule (scope=plant)
├── CareScheduleTemplate (variety_key, scope=shared 语义)
└── DailyWeather (date → temp_max/min, precipitation_mm)
```

### 4.1 存储与持久化

| 层级 | 技术 |
|------|------|
| 主库 | Cloudflare D1 (SQLite) |
| 图片 | Cloudflare R2，经 `/api/assets/*` 读取 |
| 前端 | React 19 + Vite + Tailwind；数据**仅**通过 `/api/data` 访问，不使用 localStorage |

---

## 5. API 需求摘要

### 5.1 认证 `/api/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /me | 当前用户 |
| POST | /register | 注册 |
| POST | /login | 登录 |
| POST | /logout | 退出 |
| POST | /change-password | 改密 |

### 5.2 数据 `/api/data/*`（均需登录 Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | /plants | 列表/创建 |
| GET/PUT/DELETE | /plants/:id | 详情/更新/删除 |
| GET/POST | /plants/:id/growth | 生长记录 |
| GET/POST | /plants/:id/care-logs | 养护记录 |
| GET/POST | /plants/:id/care-skips | 跳过记录 |
| GET/POST | /plants/:id/schedules | 养护计划 |
| GET | /plants/:id/timeline | 时间线 |
| PUT/DELETE | /care-logs/:id | 养护记录 |
| PUT/DELETE | /growth/:id | 生长记录 |
| PUT/DELETE | /schedules/:id | 计划（id 带 `tpl:` 或 `plant:` 前缀） |
| GET | /tasks/due?range=today\|week&tzOffsetMinutes= | 待办列表 |
| GET | /tasks/today-count?tzOffsetMinutes= | 今日待办数 |
| GET | /tasks/due/:date?tzOffsetMinutes= | 指定日到期任务 |
| GET/PUT | /settings | 用户设置 |
| GET | /weather?from=&to= | 日期范围天气 |
| PUT/DELETE | /weather/:date |  upsert / 删除当日天气 |
| GET | /care-logs/recent?limit= | 最近养护（仪表盘） |

### 5.3 AI `/api/ai/*`

| 方法 | 路径 |
|------|------|
| POST | /advice |
| POST | /identify |
| POST | /care-plan |

### 5.4 上传与静态资源

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload | 上传图片 |
| GET | /api/assets/* | R2 对象代理 |

---

## 6. 非功能需求

### 6.1 性能与体验

| 需求 ID | 描述 |
|---------|------|
| NFR-01 | 待办「完成」后乐观 UI，25 秒内防止陈旧列表回弹 |
| NFR-02 | 识别大图客户端压缩，降低上传与 API 延迟 |
| NFR-03 | 响应式布局，支持手机浏览器访问 |

### 6.2 安全

| 需求 ID | 描述 |
|---------|------|
| NFR-10 | OpenAI API Key 仅存在于服务端环境变量，不可暴露于前端 |
| NFR-11 | 会话 Cookie HttpOnly；生产环境建议 Secure |
| NFR-12 | 图片上传、数据 API 均需登录 |
| NFR-13 | CORS：带凭证请求须回显 `Origin` |

### 6.3 可用性与部署

| 需求 ID | 描述 |
|---------|------|
| NFR-20 | 构建产物为静态 SPA，部署 Cloudflare Pages |
| NFR-21 | SPA 路由回退至 `index.html`（`_redirects`） |
| NFR-22 | D1 未绑定时 API 返回 503 |
| NFR-23 | 环境变量：`OPENAI_API_KEY`；D1 binding `DB`；R2 binding `BUCKET` |

### 6.4 国际化

| 需求 ID | 描述 |
|---------|------|
| NFR-30 | 界面与 AI 回复以中文为主 |
| NFR-31 | 日期展示使用 `zh-CN` locale |

---

## 7. 界面与交互规范

### 7.1 视觉

- 主色：绿色系（emerald），待办/计划强调琥珀色，天气.sky 色。
- 植物无图时占位 emoji 🌱。
- Markdown：备注、计划说明、AI 计划 note 支持 GFM 渲染。

### 7.2 通用交互

- 破坏性操作（删除、归档、删除共享计划）需 `confirm`。
- 表单提交中按钮 disabled + 加载文案。
- API 错误以页面内红色文案展示。

---

## 8. 业务场景（用户故事）

| ID | 故事 | 涉及模块 |
|----|------|----------|
| US-01 | 作为用户，我注册并登录后，可以添加一株新植物并上传照片 | 认证、植物、上传 |
| US-02 | 我对未知植物拍照，系统自动填名称和品种 | 识别 |
| US-03 | 我为「绿萝」设置「每 7 天浇水」共享计划，所有绿萝植株都出现浇水待办 | 共享计划 |
| US-04 | 某株多肉需要单独施肥周期，我添加「仅此植株」计划 | plant scope |
| US-05 | 我今天浇水后标记完成，下次到期日为 7 天后 | CareLog、算法 |
| US-06 | 我暂时不做本次施肥，点跳过，系统推进到下一周期但不记为已完成 | CareSkip |
| US-07 | 植物死亡后我归档，待办中不再出现 | 归档 |
| US-08 | 我在日历查看上周降雨与未完成浇水，并补录天气 | 日历、天气 |
| US-09 | 叶片发黄时我向 AI 提问，并把建议存入备注 | advice |
| US-10 | 我根据品种一键生成养护计划并勾选后写入 | care-plan |
| US-11 | 我出差到上海，在设置中改所在地和时区，今日待办按上海日期计算 | 设置、时区 |

---

## 9. 约束与依赖

| 类型 | 说明 |
|------|------|
| 外部服务 | OpenAI API（计费按量） |
| 云平台 | Cloudflare Pages、D1、R2、Workers Functions |
| 浏览器 | 现代浏览器；需支持 Cookie、fetch、File API |
| 源码约束 | 仅修改本项目代码，不修改依赖库源码 |

---

## 10. 已知限制与后续扩展

### 10.1 当前限制

- 单用户个人账户，无家庭共享。
- README 提及 localStorage 回退；**当前实现已移除**，完全依赖 D1。
- AI 养护计划 API 将 `intervalDays` 下限钳制为 1，与前端「0=一次性」在 AI 生成场景不完全一致。
- 无邮件验证、找回密码。
- 无原生推送提醒。

### 10.2 规划扩展（来自 PLAN / README）

- 数据导入导出（JSON/CSV）
- 浏览器通知 / PWA
- 生长曲线图表
- 更多植物识别 API（Plant.id 等）
- 多设备以外的协作账号

---

## 11. 验收检查清单（发布前）

- [ ] 注册、登录、退出、改密流程正常
- [ ] 植物 CRUD、归档、筛选、分组列表
- [ ] 生长/养护/计划/时间线 CRUD
- [ ] 共享计划对同品种多株生效；删除提示正确
- [ ] 今日/本周待办与仪表盘计数符合时区
- [ ] 完成、跳过、逾期展示正确
- [ ] 日历月视图、选中日详情、天气读写
- [ ] 设置所在地与时区生效
- [ ] 拍照识别、养护建议、自动生成计划（需 OPENAI_API_KEY）
- [ ] 图片上传与展示（需 R2）
- [ ] 未登录跳转登录；用户 A 无法访问用户 B 数据

---

## 12. 术语表

| 术语 | 定义 |
|------|------|
| 品种关联键 (variety_key) | 用于关联共享养护模板的标准化字符串 |
| 待办到期日 (nextDue) | 按周期算法计算出的应执行日期（YYYY-MM-DD） |
| 归档 | 植物不再参与提醒，历史保留 |
| 共享计划 | 同用户、同 variety_key 下所有未归档植株共享的模板 |
| 仅此植株计划 | 仅绑定单一 plantId 的 care_schedules 记录 |

---

*本文档由代码库与 PLAN 自动归纳，若实现变更请同步更新。*
