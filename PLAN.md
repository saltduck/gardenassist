# 花园植物生长养护跟踪网站 — 开发计划

## 一、项目目标

做一个**个人花园管理网站**，用于：
- 记录并跟踪每株植物的生长状况
- 管理浇水、施肥、修剪等养护任务
- 查看养护历史和提醒待办事项

---

## 二、核心功能

### 2.1 植物档案
- **植物列表**：展示所有植物，支持按名称、位置、状态筛选
- **单株详情**：名称、品种、种植位置、种植日期、照片、备注
- **生长记录**：可添加多次「生长快照」（高度、叶片数、健康度、照片、备注）

### 2.2 养护任务
- **任务类型**：浇水、施肥、修剪、换盆、除虫、其他
- **周期设置**：按植物设定养护频率（如每 3 天浇水）
- **完成记录**：勾选完成并记录时间，便于回顾
- **待办提醒**：今日/本周到期任务列表

### 2.3 日历与时间线
- **日历视图**：按日期查看计划/已完成的养护
- **时间线**：单株植物的生长与养护历史时间线

### 2.4 统计与概览
- **仪表盘**：植物总数、本周待办数、最近生长记录
- **简单统计**：各位置植物数量、养护完成率等

### 2.5 AI 能力（养护建议、拍照识别、自动养护计划）

- **ChatGPT 养护建议**：针对某株植物或当前状况（如叶片发黄、长虫），输入问题或描述，调用 ChatGPT 获取浇水、施肥、光照、常见问题等文字建议，在页面展示并可复制/保存到备注。
- **拍照识别**：用户上传/拍摄植物照片，调用视觉模型或植物识别接口，识别植物名称/品种，并可将结果自动填入「添加植物」或「植物详情」的品种字段，便于建档。
- **自动生成养护计划**：在识别出植物种类（或用户已填写品种）后，一键请求 AI 根据该品种生成建议养护计划（如「浇水每 7 天」「施肥每 30 天」等），前端解析为结构化周期（taskType + intervalDays），用户确认后写入该植物的 `careSchedule`，即可参与「今日待办」计算。

---

## 三、技术方案建议

### 3.1 技术栈（推荐，兼容免费部署）

| 层级     | 技术选型        | 说明 |
|----------|-----------------|------|
| 前端     | **React** + **Vite** | 构建为**纯静态 SPA**，可直接部署到 Cloudflare Pages / Vercel / Netlify |
| UI       | **Tailwind CSS** 或 **shadcn/ui** | 现代样式、可定制 |
| 状态/数据 | **React Query**（可选）+ **localStorage / IndexedDB** | 仅前端存储，无需后端即可运行 |
| 路由     | **React Router**（使用 `BrowserRouter` + 托管侧 SPA 回退） | 多页面导航 |
| 数据持久化 | **IndexedDB (Dexie.js)** 或 **localStorage** | 数据存在用户浏览器，部署零后端成本 |

**部署约束**：整站为**静态资源**（HTML/CSS/JS），不依赖 Node 服务器运行，方便用 Cloudflare 等免费托管。

**AI 能力所需**（养护建议、拍照识别、自动养护计划）：
- **ChatGPT / 视觉接口**：使用 **OpenAI API**（如 `gpt-4o` / `gpt-4o-mini` 或带视觉的模型），API Key 不能暴露在前端，需通过**后端或 Edge 代理**转发请求。
- **推荐**：用 **Cloudflare Workers** 提供少量 API 路由（如 `/api/ai/advice`、`/api/ai/identify`、`/api/ai/care-plan`），在 Worker 内调用 OpenAI，前端只请求自己的域名。部署仍为 Pages（前端）+ Workers（API），均在 Cloudflare 免费/用量内。
- **拍照识别**：优先用 **OpenAI 视觉模型**（同一 API、统一鉴权）；可选替代如 Plant.id、PlantNet 等第三方植物识别 API（若需可再接入）。
- **成本说明**：Cloudflare Workers/Pages 免费额度足够个人使用；OpenAI API 按用量计费（可设用量上限），非「托管费」，无请求时不产生费用。

**可选进阶**：若日后需要多设备同步，可加 **Cloudflare D1**（免费额度内）存植物与养护数据，与上述 Workers 共用。

### 3.2 数据模型（核心实体）

```
Plant（植物）
├── id, name, variety, location, plantedAt, photoUrl?, notes?
├── careSchedule[]  // 养护周期：类型、间隔天数
└── 关联：GrowthRecord[], CareLog[]

GrowthRecord（生长记录）
├── plantId, date, height?, leafCount?, healthScore?, photoUrl?, notes?
└── 用于时间线、图表

CareLog（养护记录）
├── plantId, taskType, doneAt, notes?
└── 用于日历、完成历史

CareSchedule（养护计划 - 可选）
├── plantId, taskType, intervalDays, lastDoneAt?
└── 用于生成「今日待办」
```

---

## 四、页面结构

| 路由           | 页面       | 功能简述 |
|----------------|------------|----------|
| `/`            | 仪表盘     | 概览、今日待办、最近记录 |
| `/plants`      | 植物列表   | 列表/卡片，筛选，入口到详情 |
| `/plants/:id`  | 植物详情   | 档案 + 生长记录 + 养护历史 + 时间线 |
| `/plants/new`  | 添加植物   | 表单：名称、品种、位置、日期等 |
| `/calendar`    | 日历       | 按日查看养护计划与完成情况 |
| `/tasks`       | 待办任务   | 今日/本周到期养护列表，一键完成 |

**AI 能力入口**（不单独占路由，嵌入现有页面）：
- 植物详情页 / 添加植物页：**「拍照识别」**按钮，上传照片后调用 API，回填名称/品种。
- 植物详情页：**「获取养护建议」**输入框 + 发送，展示 ChatGPT 回复。
- 植物详情页 / 添加植物（已有品种时）：**「自动生成养护计划」**按钮，请求 AI 生成周期建议，确认后写入该植物的养护计划。

---

## 五、实施阶段

### Phase 1：基础框架与植物 CRUD（1–2 天）
- [ ] 使用 Vite 创建 React 项目，接入 Tailwind
- [ ] 定义 Plant 数据结构和本地存储（如 JSON + localStorage 或 Dexie）
- [ ] 实现：植物列表页、添加植物、植物详情（仅档案，无时间线）
- [ ] 简单路由与导航

### Phase 2：生长记录与养护记录（1–2 天）
- [ ] 定义 GrowthRecord、CareLog 数据结构并持久化
- [ ] 植物详情页：添加/展示生长记录、养护记录
- [ ] 单株时间线视图（按时间排序的生长+养护）

### Phase 3：养护计划与待办（1 天）
- [ ] 为植物配置养护周期（如每 N 天浇水）
- [ ] 根据周期 + 上次完成时间生成「今日/本周待办」
- [ ] 待办列表页：展示、勾选完成并写入 CareLog
- [ ] 仪表盘展示今日待办数量与列表入口

### Phase 4：日历与统计（约 1 天）
- [ ] 日历视图：按日显示计划/已完成的养护
- [ ] 仪表盘简单统计：植物数、待办数、最近记录

### Phase 5：AI 能力（养护建议、拍照识别、自动养护计划）
- [ ] **Cloudflare Workers**：新建 Workers 项目或 Pages Functions，提供 API 路由（见下节），在服务端保存 `OPENAI_API_KEY`，转发请求到 OpenAI。
- [ ] **养护建议**：`POST /api/ai/advice`，入参为 plantId 或 plant 摘要 + 用户问题，Worker 调用 ChatGPT 返回建议文案，前端展示并可写入备注。
- [ ] **拍照识别**：`POST /api/ai/identify`，入参为图片（base64 或 multipart），Worker 调用 OpenAI 视觉模型或植物识别 API，返回植物名称/品种，前端回填表单或详情。
- [ ] **自动养护计划**：`POST /api/ai/care-plan`，入参为植物品种（及可选地区/环境），Worker 调用 ChatGPT 要求返回结构化 JSON（如 `[{ taskType, intervalDays, note }]`），前端解析后展示确认 UI，确认后写入该植物的 `careSchedule`。
- [ ] 前端：在植物详情页、添加/编辑植物页加入「拍照识别」「获取养护建议」「自动生成养护计划」的入口与 loading/错误态。

#### Phase 5 详细：API 入参/出参与前端交互

**1. 养护建议 `POST /api/ai/advice`**

| 项目 | 说明 |
|------|------|
| 请求体 | `{ plantSummary: string, userQuestion: string }`。`plantSummary` 为前端组装的摘要，如「名称：绿萝，品种：常春藤属，位置：阳台，最近备注：叶片发黄」。可选带 `plantId` 仅用于前端追溯。 |
| 响应体 | `{ success: true, text: string }` 或 `{ success: false, error: string }`。`text` 为 ChatGPT 回复的养护建议纯文案。 |
| 前端流程 | 用户在详情页输入问题 → 点击发送 → 调用 API（带当前植物摘要 + 问题）→ 展示 `text`；提供「复制」「保存到该植物备注」按钮。Loading 期间禁用发送、显示加载态；错误时 toaster 提示并展示 `error`。 |

**2. 拍照识别 `POST /api/ai/identify`**

| 项目 | 说明 |
|------|------|
| 请求体 | `FormData` 含字段 `image`（File），或 JSON `{ imageBase64: string }`（如 base64 数据 URL 去掉前缀）。Worker 内转成 OpenAI 视觉 API 所需格式。 |
| 响应体 | `{ success: true, name?: string, variety?: string, raw?: string }`。`name` 为通用名称，`variety` 为品种/学名，`raw` 为模型原始补充说明（可选）。或 `{ success: false, error: string }`。 |
| 前端流程 | 添加/编辑页或详情页点击「拍照识别」→ 选择文件或调起相机 → 上传 → 调用 API → 成功则回填 `name`/`variety` 到表单（可 name→名称、variety→品种）；失败则提示 `error`。可限制图片大小（如 4MB）与格式（jpg/png/webp）。 |

**3. 自动养护计划 `POST /api/ai/care-plan`**

| 项目 | 说明 |
|------|------|
| 请求体 | `{ variety: string, location?: string }`。`variety` 必填（品种/名称），`location` 可选（如「阳台」「室内」）供 AI 微调建议。 |
| 响应体 | `{ success: true, items: Array<{ taskType: string, intervalDays: number, note?: string }> }`。`taskType` 与前端约定一致：如 `watering`、`fertilizing`、`pruning`、`repotting`、`pest_control`、`other`。或 `{ success: false, error: string }`。 |
| 前端流程 | 仅在品种已填时显示「自动生成养护计划」→ 点击后调用 API → 展示列表（任务类型、每 N 天、备注），用户可勾选/删减 → 确认后转为当前植物的 `careSchedule[]` 写入本地存储，并可选设置 `lastDoneAt` 为今天或空。若 API 返回的 `taskType` 与前端枚举不一致，前端做映射或丢弃无效项。 |

**4. 通用约定**

- 所有 API 均为 `POST`，Content-Type：JSON 或 `multipart/form-data`（仅 identify）。
- 错误 HTTP 状态码：4xx/5xx 时前端统一解析 body 中的 `error` 或 `message` 展示。
- 前端 `src/lib/api.ts` 封装 `getAdvice(plantSummary, userQuestion)`、`identifyPlant(file)`、`getCarePlan(variety, location?)`，内部拼 URL（同源或配置的 API 基址）、处理 body 与错误。

### Phase 6：体验与扩展（按需）
- [ ] 照片上传或本地上传预览（先 base64 或 File API 存本地）
- [ ] 响应式布局，支持手机查看
- [ ] 导出数据（JSON/CSV）或接入云端同步

---

## 六、目录结构建议

```
gardenassit/
├── package.json
├── vite.config.ts
├── index.html
├── PLAN.md                 # 本计划
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/         # 通用组件
    │   ├── Layout.tsx
    │   ├── Nav.tsx
    │   └── ...
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── PlantList.tsx
    │   ├── PlantDetail.tsx
    │   ├── PlantForm.tsx
    │   ├── Calendar.tsx
    │   └── Tasks.tsx
    ├── hooks/              # 自定义 hooks（数据、待办生成）
    ├── lib/                # 存储、工具函数
    │   ├── storage.ts      # localStorage / IndexedDB 封装
    │   ├── careSchedule.ts # 待办生成逻辑
    │   └── api.ts          # 调用 /api/ai/* 等接口
    └── types/              # TypeScript 类型
        └── plant.ts

# 若使用 Cloudflare Pages + Functions（或独立 Workers）：
# functions/                # 或 workers/
#   api/
#     ai/
#       advice.ts           # 养护建议
#       identify.ts         # 拍照识别
#       care-plan.ts        # 自动养护计划
```

---

## 七、免费部署（Cloudflare 等）

### 7.1 为何能免费部署

- 项目构建结果为**纯静态文件**（`dist/` 目录），无服务器端逻辑。
- **Cloudflare Pages**、**Vercel**、**Netlify** 等均提供免费静态站点托管，无需信用卡即可使用。

### 7.2 推荐：Cloudflare Pages

| 项目     | 说明 |
|----------|------|
| 免费额度 | 无限站点、无限请求、带宽充足，适合个人项目 |
| 部署方式 | 连 GitHub/GitLab 自动部署，或 `wrangler pages deploy dist` 手动上传 |
| 构建命令 | `npm run build`（Vite 默认输出到 `dist`） |
| 输出目录 | `dist` |
| 注意     | 需配置 **SPA 回退**：所有路径回退到 `index.html`，由 React Router 接管 |

**Cloudflare Pages 配置要点**：

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: 留空或 `/`（若仓库根目录即本项目）
- **SPA 回退**：在 Pages 项目设置中可启用「Single Page Application」或自定义 `_redirects` / `_routes.json`，让未匹配路径返回 `index.html`（Cloudflare Pages 对 SPA 有内置支持，按文档开启即可）。

### 7.3 其他免费托管（同样适用）

- **Vercel**：连 GitHub 部署，自动识别 Vite，需在项目里配置 `rewrites` 将 `/*` 指向 `/index.html`。
- **Netlify**：同上，在根目录添加 `public/_redirects` 内容：`/*    /index.html   200`。
- **GitHub Pages**：需在 Vite 中设置 `base: '/仓库名/'`，并配置 404 回退到 index（如用 `404.html` 复制 `index.html`）。

### 7.4 路由与构建配置

- **Vite**：使用默认 `build` 即可，无需服务端渲染。
- **React Router**：使用 `BrowserRouter`，`base` 与 Vite 的 `base` 一致（Cloudflare Pages 绑自定义域名时一般为 `base: '/'`）。
- 不依赖服务端接口：所有数据来自 localStorage/IndexedDB，部署后即可使用。

### 7.5 AI 功能与 Workers（推荐）

- **养护建议 / 拍照识别 / 自动养护计划** 需要调用 OpenAI API，API Key 必须放在服务端。
- **做法**：使用 **Cloudflare Workers**（或 **Pages Functions**）暴露若干接口（如 `/api/ai/advice`、`/api/ai/identify`、`/api/ai/care-plan`），在 Worker 内用 `OPENAI_API_KEY` 调用 OpenAI，前端只请求当前站点域名。
- **免费情况**：Workers 免费额度约 10 万次/天，足够个人使用；**OpenAI API 按用量计费**（非托管费），需在 OpenAI 后台设好用量或预算。
- 若使用 **Cloudflare Pages**，可启用 **Pages Functions**（基于 Workers），将 `functions/api/ai/*.ts` 放在仓库内，与前端一起部署，无需单独部署 Worker 项目。

### 7.6 可选：多设备同步与数据库

若将来需要多设备同步、账号体系，可在同一生态内扩展：

- **Cloudflare Workers**：与上述 AI 接口共用，增加 CRUD 接口。
- **Cloudflare D1**：SQLite 数据库，免费额度 5GB，可存植物与养护记录。
- 前端仍部署在 Pages，通过 `fetch` 调用 Workers 接口，全程在 Cloudflare 免费 tier 内。

---

## 八、后续可扩展

- **AI**：接入更多模型（如 Claude、本地模型）或专用植物识别 API（Plant.id、PlantNet）作为拍照识别备选。
- **多用户/账号**：Cloudflare Workers + D1，或 Supabase Auth / Firebase Auth
- **云端同步**：Cloudflare D1 / Workers API，或 Supabase / Firebase 存 Plant、GrowthRecord、CareLog
- **提醒**：浏览器通知或 PWA + 定时检查待办
- **数据可视化**：单株生长曲线（高度/健康度随时间）
- **导入/导出**：备份与迁移

---

## 九、总结

| 项目     | 内容 |
|----------|------|
| 定位     | 个人花园植物与养护跟踪网站，支持 AI 养护建议、拍照识别、自动养护计划，可免费部署 |
| 核心价值 | 植物档案 + 生长记录 + 养护计划与待办 + 日历 + **ChatGPT 建议 / 拍照识别 / 自动生成养护计划** |
| 推荐栈   | React + Vite + Tailwind，纯静态构建，数据存本地；AI 通过 Cloudflare Workers 代理 OpenAI API |
| 部署     | **Cloudflare Pages**（前端）+ **Pages Functions / Workers**（AI 接口），托管免费；OpenAI API 按用量计费 |
| 开发节奏 | 约 6 个阶段，Phase 1–4 为核心与日历，Phase 5 为 AI 能力，Phase 6 为体验扩展；可先完成 1–3 再加 AI |

如果你愿意，下一步可以从 **Phase 1** 开始：搭好 Vite+React+Tailwind 并实现植物列表与添加/详情页；实现时按「纯静态 + SPA 回退」来做，便于直接部署到 Cloudflare；AI 部分在 Phase 5 用 Workers/Functions 对接 OpenAI 即可。
