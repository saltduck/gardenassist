# 花园助手（Garden Assist）业务需求文档

| 项目 | 说明 |
|------|------|
| 文档版本 | 1.1 |
| 生成依据 | `README.md`、历史 `docs/decisions/PLAN-historical.md`、源代码、数据库迁移、API 实现 |
| 文档位置 | [`docs/requirements/product-spec.md`](./product-spec.md)（原 `docs/requirements/product-spec.md`） |
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
- 花园平面图以外的 CAD/GIS 专业制图（见 §3.15，仅轻量示意图）

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
| AUTH-07 | 找回密码 | ✅ 见 §3.14.1；需 `RESEND_API_KEY` 发信 |
| AUTH-08 | 密码重置令牌 | 🟡 单次 token、1h 过期；**待**全量作废与其它 token、IP 限流（TASK-019） |

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
| `/forgot-password` | 忘记密码 | 公开 ✅ |
| `/reset-password` | 重置密码（带 token） | 公开 ✅ |
| `/garden-map` | 花园平面图 | 需登录 ✅ |
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
| location | string | 否 | 种植位置描述（如阳台、客厅）；与 suburb / 平面图坐标互补 |
| suburb | string | 否 | 郊区/街区；🟡 分组与 geocode 见 TASK-022 |
| mapX / mapY | number | 否 | 花园平面图归一化坐标 0–1 ✅ |
| gardenMapId | string | 否 | 关联花园平面图 ID ✅ |
| externalPlantId | string | 否 | Plant.id 植物 ID；🟡 识别后入库见 TASK-020 |
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
| PLANT-02 | 列表按位置分组；🟡 按 suburb **筛选**已实现，**分组**见 TASK-022 |
| PLANT-03 | 可选「显示已归档植物」；默认不展示归档植株 |
| PLANT-04 | 添加植物：表单提交后跳转详情页 |
| PLANT-05 | 编辑植物：可更新各字段；可选「同步更新养护计划关联键」 |
| PLANT-06 | 删除植物：二次确认；级联删除关联的生长/养护/计划等数据 |
| PLANT-07 | 归档：输入原因 death/moved/other；写入 `archivedAt`；自动添加一条生长记录说明归档 |
| PLANT-08 | 取消归档：清除归档字段 |
| PLANT-09 | 归档植物不参与待办、今日计数、日历到期计算 |

#### 3.2.3 拍照识别（添加/编辑页）

**当前实现**：主通道 [Plant.id](https://plant.id/)（`POST /api/ai/identify-plantid`）；识别失败提示用户手动填写，前端不自动回退 OpenAI `identify`。

| 需求 ID | 描述 |
|---------|------|
| PLANT-AI-01 | 「拍照识别」：上传 jpg/png/webp，最大 30MB；大于 1MB 时客户端压缩 |
| PLANT-AI-02 | 调用 `identify-plantid`（主），成功后回填名称、品种；`identify` 仅作兼容端点 |
| PLANT-AI-03 | 识别同时尝试上传照片至 R2，成功则写入 `photoUrl` |
| PLANT-AI-04 | 识别失败展示错误信息，不阻断手动填写 |
| PLANT-AI-05 | ✅ 识别主通道 Plant.id；Key 仅存服务端 |
| PLANT-AI-06 | 🟡 映射 name/variety；置信度与 `external_plant_id` 入库见 TASK-020 |
| PLANT-AI-07 | ✅ 可带 settings 经纬度 |
| PLANT-AI-08 | ✅ 识别失败提示手动填写；不自动回退 OpenAI |

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
| mulch | 铺盖 |
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
| SCHED-04 | 🟡 新建计划可配置季节浇水；内联编辑见 TASK-021 |
| SCHED-05 | ✅ 南/北半球 + 月份系数（`season-watering.ts`） |
| SCHED-06 | 🟡 有效间隔参与待办算法；UI 展示基准/有效见 TASK-021 |

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

**规划（§3.14.4）**：对 `taskType = watering` 且启用季节调整的计划，计算 `intervalDays` 时先取**当月有效间隔**（可四舍五入为整数天），再代入现有公式；非浇水任务默认不受季节规则影响，除非用户显式启用。

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
| CAL-06 | 🟡 打开日历触发 sync；范围与失败提示见 TASK-023 |
| CAL-07 | ✅ `source=auto|user`、`fetched_at`；用户值不被 auto 覆盖 |

---

### 3.10 用户设置（Settings）

| 字段 | 说明 |
|------|------|
| location | 所在地文本（城市/区域），供 AI 建议与 care-plan 使用 |
| suburb | ✅ 文本字段；🟡 预设/geocode 见 TASK-022 |
| latitude / longitude | ✅ 可手填；保存设置时若 suburb/location 变化且未手动指定坐标，自动 geocode 并回填 |
| timeZone | IANA 时区；空表示自动推断 |

| 需求 ID | 描述 |
|---------|------|
| SET-01 | 快速选择预设城市（北京、上海、新加坡等），联动填充 location 与 timeZone |
| SET-02 | 时区「自动」：预设地名映射表匹配；否则用浏览器本机时区 |
| SET-03 | 影响：仪表盘今日待办数、待办页、日历月格与「今天」 |
| SET-04 | 修改密码（见 AUTH-05） |
| SET-05 | ✅ 设置页与 PlantForm 可填 suburb；列表可按 suburb 筛选 |
| SET-06 | ✅ 保存 suburb 后自动查询并设置经纬度；解析成功后前端回填显示，解析失败展示错误 |

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
| 后端 | 非法 taskType 映射为 other；`intervalDays` 可为 0（一次性，见 §3.7） |
| 识别（规划） | 见 §3.14.3；Plant.id 替代或优先于 OpenAI identify |

---

### 3.13 植物详情 — 时间线

| 需求 ID | 描述 |
|---------|------|
| TL-01 | 合并生长记录与养护记录，按日期降序 |
| TL-02 | 区分「生长」「养护」标签；展示关键指标或备注 Markdown |

---

### 3.14 v1.1 需求实现状态

> **2026-05-19**：v1.1 主干与验收补齐（TASK-011～027）已实现。权威验收表见 [§11](#11-验收检查清单发布前)。

| 状态 | 含义 |
|------|------|
| ✅ | 满足 product-spec 验收要点 |
| 🟡 | 部分满足，见 TASK-019～027 |
| ⬜ | 未实现（如 MAP-04 多图层为 v2） |

#### 3.14.1 找回密码（AUTH-07 / AUTH-08）

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| AUTH-07 | 登录页提供「忘记密码」入口 | 输入注册邮箱；无论是否存在账号，对外提示「若邮箱已注册将收到邮件」（防枚举） |
| AUTH-08 | 邮件含重置链接（带 signed token 或随机 token 存 D1） | token 有效期建议 ≤ 1 小时、单次有效；重置后作废同学号其它 token |
| — | `POST /api/auth/forgot-password` | body: `{ email }`；限流（IP + 邮箱） |
| — | `POST /api/auth/reset-password` | body: `{ token, newPassword }`；新密码规则同 AUTH-05 |
| — | 依赖外部邮件服务 | 如 Resend、SendGrid、Cloudflare Email Workers；`MAIL_*` 环境变量 |

#### 3.14.2 静态资源鉴权（`/api/assets/*`）

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| ASSET-01 | `GET /api/assets/{key}` 须已登录 | 未登录 401 |
| ASSET-02 | 路径须归属当前用户 | key 形如 `{userId}/{uuid}.ext}` 时，`userId` 必须等于会话用户 id |
| ASSET-03 | 越权访问返回 404（非 403 泄露存在性） | 用户 A 的 token 无法读取用户 B 的对象 |
| ASSET-04 | 与上传接口一致 CORS | 带 Cookie 回显 Origin；图片响应 Content-Type 来自 R2 元数据 |

#### 3.14.3 植物识别改用 Plant.id

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| ID-01 | 新增 `POST /api/ai/identify-plantid` 或改造现有 identify | 服务端持 `PLANT_ID_API_KEY` |
| ID-02 | 请求转发 Plant.id 识别接口（图片 multipart 或 base64） | 成功返回学名/俗名及置信度（可选展示） |
| ID-03 | 前端添加/编辑页默认走 Plant.id | 失败时可选手动填写或配置的回退通道 |
| ID-04 | 可选存储 `external_plant_id` | 便于日后查询病虫害库（非 v1.1 必须） |

#### 3.14.4 按季节自动调整浇水频率

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| SEASON-01 | 计划级开关 `seasonalWateringAdjust`（默认关） | 仅影响 `watering` |
| SEASON-02 | 用户设置或 suburb 坐标确定半球与气候带（简化：南/北半球 + 月份） | 内置月份→系数表（可配置 JSON） |
| SEASON-03 | 有效间隔 = max(1, round(基准 intervalDays × 当月系数))` | 待办/日历与手动改基准间隔并存 |
| SEASON-04 | UI 展示「基准 7 天 / 当前季节有效 5 天」 | 修改系数表版本需可追溯（可选） |

#### 3.14.5 位置精确到 suburb

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| LOC-01 | `user_settings.suburb` 与 `plants.suburb`（可继承默认） | 文本 + 可选从预设列表选择 |
| LOC-02 | 植物列表支持按 suburb 筛选/分组 | 与 PLANT-02 位置分组可并存 |
| LOC-03 | suburb 用于天气坐标解析与季节规则 | 无 suburb 时回退到 location 城市级 |
| LOC-04 | 设置页保存 suburb 后自动查询并写入 `user_settings.latitude/longitude` | suburb 变更时优先按新 suburb 解析；若用户手动输入经纬度则保留手动值；前端保存后展示服务端最终坐标 |

#### 3.14.6 自动填入天气数据

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| WEATHER-01 | 定时或按需（打开日历/每日首次访问）拉取未来 7 天与过去 7 天 | 数据源如 Open-Meteo（免费、无需 key）或 BOM 等 |
| WEATHER-02 | 写入 `daily_weather`：最高/最低温、降水量 | 与用户时区日期对齐 |
| WEATHER-03 | 日历格展示自动数据；用户编辑后标记 `source=user` | 用户值优先于自动值 |
| WEATHER-04 | 失败时不阻断日历；展示「天气暂不可用」 | 服务端缓存与限流 |

#### 3.14.7 花园平面图（Garden Map）

| 需求 ID | 描述 | 验收要点 |
|---------|------|----------|
| MAP-01 | 用户可上传一张花园平面图（俯视图照片或示意图） | 存 R2；限制大小与格式 |
| MAP-02 | 编辑模式：在图上点击放置/拖动植物点位 | 存归一化坐标 `mapX`,`mapY` |
| MAP-03 | 只读模式：点击点位跳转植物详情 | 未落位植物仍在列表中显示 |
| MAP-04 | 支持多个命名区域（可选 v2） | 如「前院」「阳台」多图层 |
| MAP-05 | 移动端可缩放平移查看 | 响应式 |

---

### 3.15 花园平面图（页面规划）

| 路由 | 页面 | 说明 |
|------|------|------|
| `/garden-map` | 花园平面图 | 需登录；展示/编辑植物落点（规划） |

导航是否在顶栏常驻由产品设计决定；至少从仪表盘或植物列表可进入。

---

## 4. 数据模型（逻辑 ER）

```
User
├── Session (token, expires_at)
├── PasswordResetToken (token, expires_at, used_at)   # 规划 §3.14.1
├── UserSettings (location, suburb, time_zone, lat, lon)   # suburb 等规划 §3.14.5
├── GardenMap (image_url, name)                         # 规划 §3.14.7
├── Plant (variety_key, suburb, map_x, map_y, garden_map_id, external_plant_id?)
│   ├── GrowthRecord
│   ├── CareLog
│   ├── CareSkip
│   └── CareSchedule (scope=plant, seasonal_watering_adjust?)  # 规划 §3.14.4
├── CareScheduleTemplate (variety_key, scope=shared, seasonal_…)
└── DailyWeather (date → temp_max/min, precipitation_mm, source, fetched_at)  # source 规划 §3.14.6
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
| POST | /forgot-password | 请求重置邮件（规划 §3.14.1） |
| POST | /reset-password | 凭 token 设置新密码（规划 §3.14.1） |

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
| GET | /weather/range?from=&to= | 日期范围天气（以实现为准） |
| PUT/DELETE | /weather/:date | upsert / 删除当日天气 |
| POST | /weather/sync?from=&to= | 从外部 API 拉取并写入（规划 §3.14.6） |
| GET | /care-logs/recent?limit= | 最近养护（以实现为准） |
| GET/PUT | /garden-map | 花园平面图元数据（规划 §3.14.7） |
| PUT | /plants/:id/map-position | 更新 mapX/mapY（规划 §3.14.7） |

### 5.3 AI `/api/ai/*`

| 方法 | 路径 |
|------|------|
| POST | /advice |
| POST | /identify | **当前** OpenAI；规划迁移 Plant.id（§3.14.3） |
| POST | /identify-plantid | Plant.id 代理（规划） |
| POST | /care-plan |

### 5.4 上传与静态资源

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload | 上传图片 |
| GET | /api/assets/* | R2 对象代理；**规划**须登录且校验路径归属（§3.14.2） |
| POST | /api/upload/garden-map | 上传花园平面图（规划 §3.14.7） |

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
| NFR-14 | **规划**：`GET /api/assets/*` 须登录且 key 归属当前用户（§3.14.2） |
| NFR-15 | **规划**：找回密码、邮件发送、Plant.id、天气 API 须限流与密钥仅存服务端 |

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
| US-12 | 我忘记密码，通过邮件重置后登录 | 找回密码（规划） |
| US-13 | 我拍照识别植物，系统用 Plant.id 给出品种 | 识别（规划） |
| US-14 | 夏天系统建议更频繁浇水，冬天自动拉长浇水间隔 | 季节调整（规划） |
| US-15 | 我填写 suburb 后，天气与识别更准确 | suburb（规划） |
| US-16 | 日历自动显示气温降水，我只需修正异常天 | 天气同步（规划） |
| US-17 | 我在花园平面图上点选位置管理各株植物 | 花园平面图（规划） |

---

## 9. 约束与依赖

| 类型 | 说明 |
|------|------|
| 外部服务 | OpenAI API（计费按量）；**规划** Plant.id、邮件投递、Open-Meteo（或同类天气 API） |
| 云平台 | Cloudflare Pages、D1、R2、Workers Functions |
| 浏览器 | 现代浏览器；需支持 Cookie、fetch、File API |
| 源码约束 | 仅修改本项目代码，不修改依赖库源码 |

---

## 10. 已知限制与后续扩展

### 10.1 当前限制

- 单用户个人账户，无家庭共享。
- README 提及 localStorage 回退；**当前实现已移除**，完全依赖 D1。
- ~~AI 养护计划 API 将 `intervalDays` 下限钳制为 1~~（已支持 0=一次性，见 TASK-006）。
- 无邮件验证。
- v1.1（§3.14、§11.2）**已实现**（TASK-011～027）。
- 无原生推送提醒。

### 10.2 规划扩展（来自 PLAN / README 及 v1.1 backlog）

| 优先级建议 | 功能 | 章节 |
|------------|------|------|
| P0 安全 | assets API 鉴权 | §3.14.2 |
| P1 账户 | 找回密码 | §3.14.1 |
| P1 体验 | 自动天气、suburb | §3.14.5–6 |
| P2 核心差异 | Plant.id 识别、季节浇水 | §3.14.3–4 |
| P2 可视化 | 花园平面图 | §3.14.7 |
| — | 数据导入导出（JSON/CSV） | — |
| — | 浏览器通知 / PWA | — |
| — | 生长曲线图表 | — |
| — | 多设备以外的协作账号 | — |

---

## 11. 验收检查清单（发布前）

审查日期：**2026-05-19**。状态：✅ 满足 · 🟡 部分满足 · ⬜ 未满足。补齐任务见 `docs/tasks/TASK-019` … `TASK-027`。

### 11.1 基线（v1.0）

| 验收项 | 状态 | 备注 |
|--------|------|------|
| 注册、登录、退出、改密 | ✅ | AUTH-01～06 |
| 植物 CRUD、归档、筛选、分组列表 | ✅ | 含按 suburb/位置分组 TASK-022 |
| 生长/养护/计划/时间线 CRUD | ✅ | |
| 共享计划、删除提示 | ✅ | |
| 今日/本周待办与仪表盘计数、时区 | ✅ | TASK-001 算法统一 |
| 完成、跳过、逾期展示 | ✅ | |
| 日历月视图、选中日、天气读写 | ✅ | today±7 自动同步 TASK-023 |
| 设置所在地与时区 | ✅ | |
| 拍照识别、养护建议、自动生成计划 | ✅ | 需 `OPENAI_API_KEY`；Plant.id 需 `PLANT_ID_API_KEY` |
| 图片上传与展示 | ✅ | 需 R2；assets 鉴权 TASK-011 |
| 未登录跳转；用户 A 无法访问 B 数据 | ✅ | 含 assets |

### 11.2 v1.1

| 验收项 | 状态 | 任务 |
|--------|------|------|
| 找回密码（邮件、token、限流） | ✅ | TASK-012、019、026 |
| `/api/assets` 仅本人可读 | ✅ | TASK-011 |
| Plant.id 识别主路径 | ✅ | TASK-015、020 |
| 季节浇水与待办一致 | ✅ | TASK-016、021 |
| suburb 与天气/季节联动；保存 suburb 自动设置经纬度 | ✅ | TASK-013、022、028 |
| 天气自动同步、用户可覆盖 | ✅ | TASK-014、023 |
| 花园平面图与落点 | ✅ | TASK-017、024 |
| 文档与 spec 一致 | ✅ | TASK-027 |

---

## 12. 术语表

| 术语 | 定义 |
|------|------|
| 品种关联键 (variety_key) | 用于关联共享养护模板的标准化字符串 |
| 待办到期日 (nextDue) | 按周期算法计算出的应执行日期（YYYY-MM-DD） |
| 归档 | 植物不再参与提醒，历史保留 |
| 共享计划 | 同用户、同 variety_key 下所有未归档植株共享的模板 |
| 仅此植株计划 | 仅绑定单一 plantId 的 care_schedules 记录 |
| suburb | 郊区/街区级居住地，比城市更细，用于天气与气候规则 |
| 有效浇水间隔 | 应用季节系数后的 intervalDays，用于待办计算 |
| 花园平面图 | 用户上传的俯视图，植物以坐标落点展示 |
| Plant.id | 第三方植物识别 SaaS，规划替代 OpenAI 识别主通道 |

---

## 13. 相关文档

| 文档 | 说明 |
|------|------|
| [`AGENTS.md`](../../AGENTS.md) | AI 编码助手项目指引 |
| [`docs/README.md`](../README.md) | 文档索引 |
| [`auth-flow.md`](./auth-flow.md) | 认证与会话 |
| [`billing-rules.md`](./billing-rules.md) | 计费（当前无） |
| [`../architecture/overview.md`](../architecture/overview.md) | 系统架构与本地开发 |
| [`../architecture/db-schema.md`](../architecture/db-schema.md) | 数据模型 |
| [`../architecture/api-contracts.md`](../architecture/api-contracts.md) | API 约定 |
| [`../architecture/schedule-algorithm.md`](../architecture/schedule-algorithm.md) | 待办算法 |
| [`planned-v1.1.md`](./planned-v1.1.md) | v1.1 规划需求速查（实现时同步 architecture/） |

*若产品行为变更请更新本文档，并同步 `docs/` 子目录与 `AGENTS.md`。*
