# 花园助手 (Garden Assist)

个人花园植物生长与养护跟踪网站。支持植物档案、生长/养护记录、养护计划与待办、日历，以及 AI 养护建议、拍照识别、自动生成养护计划。

## 运行

```bash
npm install
npm run dev
```

## 环境变量与 API Key（不提交 git）

- 所有密钥放在 **`.env`** 中，**.env 已加入 .gitignore，不会提交**。
- 首次使用：复制 **`.env.example`** 为 **`.env`**，填入 `OPENAI_API_KEY` 等变量。
- 本地用 `wrangler pages dev` 调试 AI 接口时，wrangler 读取 **`.dev.vars`**（也已 gitignore），请把 `.env` 里的键值同步到 `.dev.vars`。
- 部署到 **Cloudflare Pages** 时，在 Dashboard → 项目 → Settings → Environment variables 中配置 `OPENAI_API_KEY`，不要从 .env 上传。

## 创建 D1 数据库（云端数据存储）

数据可存到 Cloudflare D1，需先创建数据库并执行迁移，二选一即可。

### 方式一：在 Cloudflare Dashboard 创建（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 左侧 **Workers & Pages** → **D1**。
2. 点击 **Create database**，名称填 `gardenassit-db`，创建后进入该数据库。
3. 在详情页复制 **Database ID**（一串 UUID）。
4. 打开本项目的 **`wrangler.toml`**，把 `database_id = "YOUR_D1_DATABASE_ID"` 改成刚复制的 ID 并保存。
5. 在 D1 数据库页签 **Migrations** 中，点击 **Run migration**，选择「Upload migration file」，上传项目里的 **`migrations/0001_initial.sql`**，执行一次。

### 方式二：用 Wrangler 命令行创建

1. 在项目根目录执行 **`npx wrangler login`**，按提示在浏览器完成 Cloudflare 登录。
2. 创建数据库：
   ```bash
   npx wrangler d1 create gardenassit-db
   ```
   终端会输出 `database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`。
3. 把该 ID 填进 **`wrangler.toml`** 的 `database_id`，保存。
4. 执行迁移：
   ```bash
   npx wrangler d1 migrations apply gardenassit-db
   ```

### 绑定到 Pages 项目

- 若用 **Git 关联** 部署 Pages：在 Pages 项目 → **Settings** → **Functions** → **D1 database bindings** 里添加绑定，变量名填 **`DB`**，选择刚创建的 `gardenassit-db`。
- 若用 **`wrangler pages deploy`** 部署：只要 `wrangler.toml` 里已配置好 D1 的 `database_id`，部署时会自动绑定 `DB`。

完成后部署/预览时，前端会优先请求 `/api/data/*`，数据即存入 D1；请求失败则自动回退到浏览器 localStorage。

---

## 发布到 Cloudflare（Publish to Cloudflare）

1. **登录 Cloudflare**（任选一种）：
   - 在终端执行：`npx wrangler login`，按提示在浏览器完成登录；
   - 或创建 [API Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)（需 “Cloudflare Pages” 编辑权限），然后：
     ```bash
     export CLOUDFLARE_ACCOUNT_ID=你的Account_ID
     export CLOUDFLARE_API_TOKEN=你的Token
     ```

2. **部署**：
   ```bash
   npm run deploy
   ```
   或分步执行：
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=gardenassit
   ```

3. 首次部署会提示创建 Pages 项目 `gardenassit`，确认即可。完成后会给出站点 URL（如 `https://gardenassit.pages.dev`）。

4. **AI 与 D1**：在 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → 项目 **gardenassit** → **Settings** → **Environment variables** 中配置 `OPENAI_API_KEY`；在 **Functions** → **D1 database bindings** 中绑定变量名 `DB` 到你的 D1 数据库。

---

## 部署（含 Phase 5 AI）

- **前端**：构建产物在 `dist/`，可部署到 Cloudflare Pages / Vercel / Netlify。
- **AI 接口**：`functions/api/ai/` 下为 Cloudflare Pages Functions，需与前端一起部署到 **Cloudflare Pages**，并在项目设置中配置环境变量 **OPENAI_API_KEY**。部署后 `/api/ai/advice`、`/api/ai/identify`、`/api/ai/care-plan` 将可用。
- 本地开发时若未部署 Functions，AI 功能会请求失败并提示错误；部署到 Cloudflare 并配置 Key 后即可使用。

---

以下为 Vite 模板说明。

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
