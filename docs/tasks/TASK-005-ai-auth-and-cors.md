# TASK-005：AI 接口登录校验与 CORS

| 字段 | 值 |
|------|-----|
| 优先级 | P1 |
| 阶段 | D |
| 关联违规 | V-103 |
| 状态 | ✅ 已完成 |

## 目标

`/api/ai/advice`、`/identify`、`/care-plan` 仅允许已登录用户调用，降低 OpenAI 滥用风险；CORS 与 data API 一致（回显 Origin，支持 Cookie）。

## 范围

- `functions/api/ai/advice.ts`
- `functions/api/ai/identify.ts`
- `functions/api/ai/care-plan.ts`
- 可选：抽取 `functions/api/_shared/auth.ts`（与 upload 共用 `getCurrentUser`）
- `src/lib/api.ts` — `credentials: 'include'`
- `docs/architecture/api-contracts.md`

## 实施步骤

1. 从 `upload.ts` 或 `data/[[path]].ts` 抽取 `getCurrentUser` + `corsHeaders(request)` 到共享模块（避免三份复制）
2. 每个 AI handler 开头：`if (!user) return 401`
3. `api.ts` 所有 fetch 增加 `credentials: 'include'`
4. 将 `Access-Control-Allow-Origin: '*'` 改为回显 Origin
5. 更新文档：AI 需登录

## 验收标准

- [ ] 未登录调用 AI 返回 401
- [ ] 登录后 PlantDetail 建议/识别/计划正常
- [ ] 浏览器无 CORS 错误（同源部署下）

## 非目标

- Rate limit（可另开任务）

## 参考

- V-103、migration-report 阶段 D
