# 03 — 检查维度（机械扫描 / 协议检查 / 质量门）

> 本文件是 SKILL.md「流程③ 机械扫描」的操作细则，不独立成立。

## 一、机械扫描（可命令化，全量必跑）

### A. 引用断链
对 target skill 的所有 .md 文件，提取代码块/正文中引用的 `frameworks/xxx.md`、`templates/xxx.md` 等相对路径，逐一验证存在：

```
grep -o "frameworks/[a-z0-9-]*\.md" <skill 目录>/**/*.md → 逐路径 Test-Path
```

**跨 skill 引用**（如 novel-review 引用 novel-original-writing/frameworks/03-structure.md）：验证目标 skill 在同级目录存在且文件存在——**平级放置假设**是依赖契约，断链即 FAIL。

### B. frontmatter 合法性
每个 SKILL.md：
- `name` 字段与目录名一致（kebab-case）
- `description` 非空
- 无非法字符（大写字/空格/XML 标签）

### C. Files 表一致性
SKILL.md 的 Files 表列出的文件 vs 实际文件：缺文件 = FAIL；多文件 = 警告（未登记文件）。

### D. 协议字段
- director-log.jsonl：每条 decision ∈ 枚举 + rationale 非空 + timestamp ISO8601
- checkpoint 命名与 Procedure 一致
- 输出位置协议：产出路径不在 skill 目录内（E2E 全程验证）
- 导演模式：每阶段样片摘要 + 四态声明（DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT）

### E. skill 特有机械检查
- novel-to-screen-adaptation：`scripts/validate-screenplay.js` 跑剧本硬规则（动作≥40%/对白≤3/无不可拍词）
- video-prompt-adapter：12 条机械规则逐条验证
- novel-original-writing：剧本硬规则 7 条逐条（动作占比可数、对白句数可数、不可拍词可搜）

## 二、协议检查（执行中观察）

| 协议 | 检查点 |
|------|--------|
| 输出位置协议 | 开工是否弹 AskUserQuestion 问输出位置；产出是否落指定目录 |
| 选择框协议 | 导演决策点是否弹选择框（通过/改:/自检/评审）；非交互回退是否生效 |
| 共创模式 | 种子期 AI 是否主动提议候选（≥2 个/轮），而非只等用户 |
| 裁决日志 | 每次裁决 rationale 非空；最近 5 条随样片展示 |
| bootstrap | 模拟新会话重启：能否从 director-log + 最新 checkpoint 恢复"我们在哪" |

## 三、质量门

跑 target skill 的质量门清单（novel-original-writing 20 条 / review 四层+评分联动 / 02 11 门+sign-off / 07 12 条）——[导演] 判定项由模拟导演裁决并记录。

## 四、扫描输出

```
### 机械扫描结果
引用断链：n 处（列表）
frontmatter：全过 / n 处问题
Files 表：一致 / n 处偏差
协议字段：全过 / n 处问题
特有检查：全过 / n 处问题
```
