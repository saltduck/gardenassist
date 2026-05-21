# TASK-011：`/api/assets` 登录与路径归属校验

| 字段 | 值 |
|------|-----|
| 优先级 | P0 |
| 阶段 | F |
| 关联违规 | V11-001, V11-002, V-407 |
| 状态 | ⬜ 未开始 |

## 目标

`GET /api/assets/*` 仅允许已登录用户读取**本人** R2 对象，符合 product-spec §3.14.2（ASSET-01～04、NFR-14）。

## 范围

- **修改**：`functions/api/assets/[[path]].ts`
- **复用**：`functions/api/_shared/session.ts`（`requireSessionUser`、`corsHeaders`）
- **文档**：`docs/architecture/api-contracts.md`、`docs/requirements/auth-flow.md`、`AGENTS.md`

## 不在范围

- 签名 URL / CDN 公共缓存策略（可后续 ADR）
- 修改 R2 key 命名规则

## 实施步骤

1. Handler 开头 `requireSessionUser(env.DB, request)`，未登录 401。
2. 解析 key：`{userId}/{filename}`；`userId !== sessionUser.id` 返回 **404**（非 403，防枚举）。
3. 保留 `..` 路径拒绝逻辑。
4. 删除本地 `corsHeaders`，改用 `_shared/session.ts`。
5. 确认 `PlantList` / `PlantDetail` 等同源 `<img src="/api/assets/...">` 在登录态下正常（Cookie 随请求）。
6. 可选：Vitest 对 path 解析纯函数做单测（若抽取 `assertAssetKeyForUser`）。

## 验收标准

- [ ] 未登录 `GET /api/assets/{userId}/x.jpg` → 401
- [ ] 用户 B 会话请求用户 A 的 key → 404
- [ ] 用户 A 会话请求自己的 key → 200 + 正确 Content-Type
- [ ] 文档与 AGENTS「已实现 vs 规划」中 assets 行更新为已实现
- [ ] `npm test` 全绿

## 参考

- `docs/decisions/MIGRATION-REPORT.md` §3.1、阶段 F
- `functions/api/upload.ts`（上传已鉴权，key 含 userId）
