# TASK-002：待办循环统一使用 resolveVarietyKeyFromPlantRow

| 字段 | 值 |
|------|-----|
| 优先级 | P0 |
| 阶段 | A |
| 关联违规 | V-003 |
| 状态 | ✅ 已完成 |
| 依赖 | 建议与 TASK-001 同 PR |

## 目标

待办、今日计数、按日 due 在合并 `care_schedule_templates` 时，与 `GET /plants/:id/schedules` 使用**相同**的 `variety_key` 解析规则。

## 范围

- `functions/api/data/[[path]].ts` 中所有 `normalizeVarietyKey(plant.name, plant.variety)` 用于**查模板**的代码路径
- TASK-001 抽取的 due 构建函数

## 实施步骤

1. 确保 `plants` 查询 `SELECT` 包含 `variety_key, name, variety`
2. 将 `const vkey = normalizeVarietyKey(plant.name, plant.variety)` 改为 `resolveVarietyKeyFromPlantRow(plantRow)`
3. 确认 `byVariety` 索引仍用 `template.variety_key`（不变）
4. 手工回归：
   - 创建植物 A，添加共享浇水计划
   - 仅改「品种」显示文字，**不**勾选 syncVarietyKey
   - 详情页仍有计划 → 待办页应出现浇水项

## 验收标准

- [ ] 上述手工场景待办与详情一致
- [ ] 勾选 syncVarietyKey 后，按新 key 匹配（原有测试/文档行为保持）
- [ ] 无回归：新建植物、新建共享计划仍正常

## 参考

- `resolveVarietyKeyFromPlantRow` — `[[path]].ts` L138–141
- `docs/architecture/db-schema.md` — variety_key 说明
