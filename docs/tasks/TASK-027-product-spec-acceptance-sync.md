# TASK-027：product-spec 与验收清单同步

| 字段 | 值 |
|------|-----|
| 优先级 | P3 |
| 阶段 | N |
| 关联 | 文档与 §11 勾选 |
| 状态 | ✅ 已完成 |
| 依赖 | TASK-019～026 各任务合并后执行（或每完成一项局部更新） |

## 目标

使 `product-spec.md`、`planned-v1.1.md`、`MIGRATION-REPORT.md` 与代码及 §11 验收状态一致。

## 范围

- `docs/requirements/product-spec.md`
- `docs/requirements/planned-v1.1.md`
- `docs/decisions/MIGRATION-REPORT.md`（§3.14 实施后状态）
- `docs/requirements/auth-flow.md`、`AGENTS.md`（若行为变更）

## 实施步骤

1. §3.14 标题改为「v1.1 实现状态」；各子节标注 ✅ / 🟡 / ⬜。
2. §3.2/3.10 字段表去掉已实现项的「规划」标记。
3. §11 改为带状态的验收表（见下方模板）。
4. §10.1 已知限制更新；§3.6 `mulch` →「铺盖」。
5. `planned-v1.1.md` 增加「差距任务 TASK-019～027」列。

## 验收标准

- [ ] 新人读 spec 不会误以为 assets/找回密码未实现
- [ ] §11 每项有明确 ✅/🟡/⬜ 与 TASK 引用

## §11 模板（写入 product-spec）

```markdown
### 基线（v1.0）
| 项 | 状态 | 备注 |
|----|------|------|
| 注册/登录/退出/改密 | ✅ | |
...

### v1.1
| 项 | 状态 | 任务 |
|----|------|------|
| 找回密码 | 🟡 | TASK-019 |
...
```
