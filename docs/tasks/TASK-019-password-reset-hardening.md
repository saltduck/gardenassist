# TASK-019：找回密码补齐（限流 + token 全作废）

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | N |
| 关联差距 | AUTH-08 子项、§3.14.1 限流、§11「找回密码全流程」 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-012（基础找回密码已实现） |

## 目标

满足 product-spec **AUTH-08** 与 §3.14.1：重置密码后作废该用户**全部**未使用 token；`forgot-password` 增加 **IP + 邮箱** 限流。

## 范围

- `functions/api/auth/[[path]].ts`
- 可选：`functions/api/_shared/rate-limit.ts`（若 TASK-026 未先做，可本任务内实现最小版）
- `docs/requirements/auth-flow.md`

## 实施步骤

1. `reset-password` 成功後：`UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL`（或 DELETE 未用 token）。
2. `forgot-password`：除现有「每用户 1h ≤3 次」外，按客户端 IP（`CF-Connecting-IP` / `X-Forwarded-For` 首段）限制，如 10 次/小时。
3. 超限返回 **429** 或仍返回统一成功文案（产品决策：推荐 429 + 通用错误避免枚举）。
4. 补充 Vitest 或集成测试：mock 两次 reset 第二条 token 失效。

## 验收标准

- [ ] 用户 A 申请两次 forgot，仅最新 token 有效；reset 后旧 token 无效
- [ ] 同一 IP 短时间大量请求被限流
- [ ] §11「找回密码」可勾选（在邮件 env 配置前提下）

## 参考

- 验收报告：AUTH-08「作废同账号其它 token」、无 IP 限流
