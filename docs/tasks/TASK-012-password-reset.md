# TASK-012：找回密码（邮件 + token）

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | G |
| 关联违规 | V11-003, V11-004 |
| 状态 | ⬜ 未开始 |

## 目标

实现 AUTH-07 / AUTH-08：用户可通过邮件重置密码，无需人工介入。

## 范围

- **新建 migration**：`password_reset_tokens`
- **修改**：`functions/api/auth/[[path]].ts`（或拆分 handler）
- **新建页面**：`src/pages/ForgotPassword.tsx`、`ResetPassword.tsx`
- **修改**：`src/App.tsx`、`src/pages/Login.tsx`、`src/lib/auth-api.ts`
- **文档**：`auth-flow.md`、`api-contracts.md`、`db-schema.md`

## 不在范围

- 邮箱验证（注册仍无需验证邮件）
- 多因素认证

## 实施步骤

1. Migration：`password_reset_tokens(id, user_id, token_hash, expires_at, used_at, created_at)`。
2. `POST /api/auth/forgot-password`：按 email 查用户；**无论是否存在**返回统一成功文案；生成 token；发邮件（链接含 token query）。
3. `POST /api/auth/reset-password`：`{ token, newPassword }`；校验未过期、未使用；更新 password_hash/salt；作废 token。
4. 限流：IP + email（Workers KV 或内存滑动窗口，文档写明限制）。
5. 前端：忘记密码表单、重置表单；密码规则与 AUTH-05 一致（≥6 位）。
6. Cloudflare env：`RESEND_API_KEY` 或等价（文档列入 `planned-v1.1.md` / wrangler 示例）。

## 验收标准

- [ ] 已注册邮箱收到重置链接；链接一次性有效
- [ ] 过期/已用 token 返回明确错误
- [ ] 未注册邮箱与已注册邮箱对外提示一致
- [ ] 重置后可用新密码登录
- [ ] product-spec §11 v1.1「找回密码」可勾选

## 参考

- product-spec §3.14.1
- `docs/requirements/auth-flow.md` 规划序列图
