# v1.1 规划需求索引

> **权威定义**见 [`product-spec.md`](./product-spec.md) **§3.14～§3.15**。实现状态以代码与 §11 为准。

## 实现状态（2026-05-21）

| 状态 | 需求 | 需求 ID | 主干任务 | 验收补齐 |
|------|------|---------|----------|----------|
| ✅ | assets 鉴权 | ASSET-01～04 | TASK-011 | — |
| ✅ | 找回密码 | AUTH-07/08 | TASK-012 | TASK-019, 026 |
| ✅ | Plant.id 识别 | PLANT-AI-05～08 | TASK-015 | TASK-020 |
| ✅ | 季节浇水 | SCHED-04～06 | TASK-016 | TASK-021 |
| ✅ | suburb 位置 | SET-05/06, LOC-01～04 | TASK-013 | TASK-022, 028 |
| ✅ | 天气自动填入 | CAL-06/07, WEATHER-01～04 | TASK-014 | TASK-023 |
| ✅ | 花园平面图 | MAP-01～05 | TASK-017 | TASK-024 |
| ✅ | 前端错误处理 | AGENTS §7 | TASK-018 | TASK-025 |
| ✅ | 文档验收同步 | §11 | — | TASK-027 |

## 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `OPENAI_API_KEY` | advice、care-plan、identify 回退 | 建议 |
| `PLANT_ID_API_KEY` | Plant.id 主识别 | 识别功能 |
| `RESEND_API_KEY` | 找回密码邮件 | 找回密码 |
| `MAIL_FROM`、`APP_BASE_URL` | 邮件发件人与链接 | 找回密码 |

现有：`DB`、`BUCKET`。

## 建议实施顺序（TASK-019～028）

1. TASK-019 + TASK-026（安全）
2. TASK-022 → TASK-023（位置与天气）
3. TASK-020、TASK-021（可并行）
4. TASK-024、TASK-025
5. TASK-027（合并 PR 时更新 spec）
6. TASK-028（suburb 变更后自动刷新 settings 经纬度）
