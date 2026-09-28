# TASK-026：敏感 API 限流（NFR-15）

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | N |
| 关联差距 | NFR-15、§3.14.1、WEATHER-04 |
| 状态 | ✅ 已完成 |
| 依赖 | 可与 TASK-019 共用 `_shared/rate-limit.ts` |

## 目标

降低滥用：找回密码、AI 识别、天气 sync 按 IP 或 userId 滑动窗口限流。

## 范围

- **新建**：`functions/api/_shared/rate-limit.ts`（D1 表 `rate_limits` 或 Workers KV；v1 可用 D1 + window key）
- `functions/api/auth/[[path]].ts`（forgot）
- `functions/api/ai/identify-plantid.ts`、`identify.ts`、`advice.ts`、`care-plan.ts`
- `functions/api/data/[[path]].ts`（weather/sync）

## 实施步骤

1. Migration（可选）：`rate_limit_buckets(key, count, window_start)`。
2. `checkRateLimit(key, max, windowSec)` → 允许 / 429。
3. 建议限额（可配置 env）：
   - forgot：IP 10/h，email 3/h
   - identify：user 30/h
   - weather/sync：user 12/h
4. 文档 `api-contracts.md` 注明 429。

## 验收标准

- [ ] 超限返回 429 + JSON error
- [ ] 正常用户不受影响
- [ ] NFR-15 在 product-spec 标为已实现

## 不在范围

- 全站 WAF（Cloudflare 控制台配置）
