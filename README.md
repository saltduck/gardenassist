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
