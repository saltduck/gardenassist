# TASK-015：Plant.id 识别主通道

| 字段 | 值 |
|------|-----|
| 优先级 | P2 |
| 阶段 | J |
| 关联违规 | V11-009 |
| 状态 | ⬜ 未开始 |

## 目标

拍照识别默认走 Plant.id；OpenAI identify 降为可选回退；密钥仅存服务端（§3.14.3）。

## 范围

- **新建**：`functions/api/ai/identify-plantid.ts`（或重构 `identify.ts`）
- **修改**：`src/lib/api.ts`、`PlantForm.tsx`、`PlantDetail.tsx`（识别入口）
- **可选 migration**：`plants.external_plant_id`
- **文档**：`api-contracts.md`、`AGENTS.md`、product-spec 识别节

## 不在范围

- 替换 advice / care-plan 的 OpenAI 用法

## 实施步骤

1. 实现 Plant.id 代理：multipart / base64 转发；解析 `suggested_name`、`plant_details` → `name`/`variety`。
2. 请求可带 `latitude`/`longitude`（来自 settings/plant suburb 解析结果）。
3. 环境变量 `PLANT_ID_API_KEY`；未配置时明确错误。
4. 前端：默认识别调用新端点；失败 UI：手填 +「尝试 OpenAI」（可 env 开关 `ENABLE_OPENAI_IDENTIFY_FALLBACK`）。
5. 保留现有 R2 上传逻辑（PLANT-AI-03）。
6. 集成测试或 mock 测试（勿提交真实 key）。

## 验收标准

- [ ] 登录用户拍照识别返回品种名
- [ ] 前端无 Plant.id key
- [ ] Plant.id 失败时可手填或回退（若启用）
- [ ] product-spec §11「Plant.id 主路径」可勾选

## 依赖

- 推荐 TASK-013（坐标提高准确度）

## 参考

- product-spec §3.14.3、PLANT-AI-05～08
