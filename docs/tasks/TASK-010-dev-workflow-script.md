# TASK-010：本地全栈开发脚本（可选）

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | E |
| 关联违规 | V-204 |
| 状态 | ✅ 已完成 |

## 目标

降低 `npm run dev` 仅启动前端、API 不可用带来的困惑，对齐 `docs/architecture/overview.md`。

## 范围

- `package.json` scripts
- `docs/architecture/overview.md`
- `README.md`「运行」小节（一句说明）

## 实施步骤

1. 新增脚本，例如：
   ```json
   "dev:full": "npm run build && wrangler pages dev dist --port 8788"
   ```
   或 `concurrently` 组合 vite + wrangler（若团队更偏好热更新，需评估 Pages dev 对 HMR 支持）
2. 文档写明：
   - `npm run dev` — 仅 UI
   - `npm run dev:full` — UI + Functions + D1/R2（需 `.dev.vars`）
3. README 增加指向

## 验收标准

- [ ] 新贡献者按文档可完成登录 + 列表加载（本地 D1 已迁移）
- [ ] 不强制引入新 devDependency（若用 `npx wrangler` 链式即可）

## 非目标

- 生产部署流程变更

## 参考

- V-204、`docs/architecture/overview.md`
