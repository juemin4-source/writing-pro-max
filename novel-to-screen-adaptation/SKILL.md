---
name: novel-to-screen-adaptation
x-chancellor-os: true
lastUpdated: 2026-08-01
description: "Novel-to-Screen Adaptation Protocol. Not a script-writing skill. A translation machine that decomposes a novel into proposition, engine, objects, scenes, episode structure, and screenplay — in that order. 中文名：改编流 / 小说改编剧本协议。触发词：改编流/小说改编/剧本改编/改编剧本/小说转剧本/小说到剧本/改编协议。将小说分解为命题、发动机、物件、场景、剧集结构与剧本的转译协议（不是写剧本的 skill）。"
---

# Novel-to-Screen Adaptation Protocol
# 小说到屏幕剧本转译协议

## Core Thesis

Adaptation is not preserving the original text.
It is preserving the narrative function and replacing the information carrier.

> 改编不是保留原句。改编是保留原句背后的叙事功能，并更换信息载体。

```
小说信息 = 事实 + 心理 + 因果 + 主题 + 风格 + 世界规则
剧本信息 = 行动 + 冲突 + 可见目标 + 阻碍 + 关系变化 + 信息揭示 + 视听承载
改编     = 保留因果与主题，同时更换信息载体
```

**本协议不产出"好看的小说场景版"。本协议产出"可以拍的剧本"。**

---

## Core Sequence

```
先保真。
再找发动机。
再找屏幕载体。
再重组结构。
最后才写剧本。
```

## 5-Phase Structure

```
Phase 0: 预算提醒 / Budget & Scope Contract
  ↓
Phase 1: 文本拆分 / Source Map
   ├─ A. 机械拆分（脚本做）
   └─ B. 戏剧拆分（LLM 做）
  ↓
Phase 2: 叙事命题 / Narrative Proposition
  ↓
Phase 3: 改编发动机 + 影视形态 / Adaptation Driver & Screen Format
  ↓
Phase 4: 屏幕物件系统 / Screen Object System
  ↓
Phase 5: 内心信息外化 / Interior-to-Screen Translation
  ↓
7. 章节→剧集功能 / Episode Function Map
8. 情节节点 + 关键场面 / Plot Node & Set-Piece
9. 场景卡 / Scene Cards
10. 节拍表 → 剧本正文 / Beat Sheet → Screenplay Draft
```

---

## 导演模式工作流（Director-Mode Workflow）

> 本协议由**导演驱动**执行，不再批量自动流水线：每一阶段产出后暂停，向导演出示一屏样片摘要，收到导演指令后只重跑目标阶段及其下游，并强制出示 before/after diff。机械环节（文本拆分、格式校验、schema 检查）保留自动；判断性决策由导演（用户）做出。**本协议即执行方式**——创作阶段按本文档在 Claude 会话内执行，不依赖外部 runner 编排（见 §10）。
>
> 出处：Main Design（2026-08-01 APPROVED v5，导演模式重构）。交互骨架（通过/修改/自检三命令）借鉴 @山音 screenwriting-master（MIT），只借骨架，不复制其结构原文。

### 1. 样片循环（Sample Loop）

```
每阶段产出 → 样片摘要（一屏）→ 导演指令
   [通过] / [改:<自由文本批注>] / [自检] / [评审 <checkpoint 或场景>]
→ 只重跑目标阶段及下游（依赖级联，见 §7）→ 强制 before/after diff → 再次出示样片
```

指令语法：

| 指令 | 含义 | 持久化产出 |
|------|------|-----------|
| `[通过]` | 签核本阶段产出，进入下一阶段 | ack status=PASSED + 裁决日志 |
| `[改:<批注>]` | 批注经「批注→返修指令编译器」（§9）转为目标阶段 + 具体修改 | ack status=REVISE + compiledAction |
| `[自检]` | 对已产出物做机械检查（schema/字段/链路），不产审美结论 | 自检报告 + 裁决日志 |
| `[评审 <目标>]` | 按需召集评审团（08-review-iteration 第三模式承接），导演当唯一法官 | 评审记录 → 裁决日志 |

`[改:]` 的批注必须先经编译器转为 `compiledAction: {targetStage, instruction, confidence}` 写入 ack 文件，再驱动重跑（重跑起点 = targetStage + 下游级联），不得直接整链重跑。

#### 1a. 指令呈现协议（AskUserQuestion 选择框）

> 导演指令**用 Claude 自己的选择框（AskUserQuestion）弹出**，不裸等文本输入——借鉴 gstack 的 AskUserQuestion 交互（Main Design 2026-08-01：「样片摘要模板…借鉴 gstack AskUserQuestion」）。

**出示样片摘要后，必须调用 AskUserQuestion 弹出导演选项**：

```
question: <checkpoint> 样片已出示，导演指令？
header:   导演指令
选项（≤4 个，推荐项放第一位并标注「（推荐）」）：
  [通过]          —— description: 签核本阶段产出，进入下一阶段（如推荐通过则标注推荐）
  [改:<批注>]     —— description: 批注经编译器转 compiledAction 后驱动重跑；批注请选 Other 输入
  [自检]          —— description: 对已产出物做机械检查（schema/字段/链路），不产审美结论
  [评审 <目标>]   —— description: 召集评审团（08 第三模式承接）；目标请选 Other 输入
```

- 四命令恰好放满 4 个选项上限；需要自由文本的指令（改:/评审 目标）由用户选 Other 输入，按指令语法解析
- decision 映射：通过→pass / 自检→self_check / 评审→council / 改→revise；自由文本按前缀解析（decision 枚举见 §3）
- **rationale 必填**：导演的理由取用户注解（AskUserQuestion 注解栏）；无注解时记「导演选择 <选项>，样片摘要推荐理由：<…>」——理由缺失 = 裁决未完成
- **不改变 ack 文件协议与 gate 状态机**：呈现方式只是交互层，ack status（PASSED/REVISE）、compiledAction、单写入者等协议原样执行（见 §11 与 frameworks/13）
- **回退**：非交互环境（无法弹出选择框）退回文本等待，导演以 `[通过]` 等指令语法输入，协议其余部分不变

### 2. 样片摘要模板（决策简报格式）

每个阶段收尾前，把产出压缩为一屏决策简报：

```
## <阶段名> 样片
关键决策：<本阶段做的 1-3 个判断>
Gate 证据：<机械检查结果 PASS/FAIL/WARN + 证据文件引用>
是否需要导演判定：是（分诊点）/ 否
推荐：<导演倾向的选项 + 一句理由>
选项与代价：<2-3 个选项 + 各自的人力/token 代价>
下一步：通过 / 改: <批注> / 自检 / 评审 <目标>
```

规则：
- Gate 证据必须引用具体证据文件（如 `checkpoints/01-source-map.json`、`09-scene-cards/EP03-S05.md`），不写空话
- 推荐是给导演支点，不是替导演决定；选项必须带代价（人力/token），「通过」才是知情选择

### 3. 裁决日志（味觉记忆最小版）

每次导演裁决（通过/改/自检/评审/终裁）记录一条 jsonl：

```jsonl
{"checkpoint": "07-episode-map.json", "decision": "revise", "rationale": "EP03 的功能与 EP02 重复：白焰登场与私人猎人是一条线", "timestamp": "2026-08-01T10:23:00+08:00"}
```

- 字段：`{checkpoint, decision, rationale, timestamp}`；decision ∈ `pass | revise | revert | self_check | council | confirm_warn | accept | cut | terminate`
- **理由必须记录**（"为什么删这场戏"）——理由缺失 = 裁决未完成
- 存储：`checkpoints/director-log.jsonl`，追加写不覆盖
- 展示与加载：最近 5 条随样片摘要展示；新会话开工自动加载（§6）。裁决日志累积后即导演偏好数据源（味觉记忆最小版；完整版——批注分类归档、按口味过滤候选——出 MVP）

### 4. 完成状态协议

每个阶段收尾必须声明且只声明一个状态：

| 状态 | 含义 |
|------|------|
| `DONE` | 产出 + 签核完整 |
| `DONE_WITH_CONCERNS` | 完成但列出关切（导演可见） |
| `BLOCKED` | 第一阻塞点，附证据 |
| `NEEDS_CONTEXT` | 缺输入，说明缺什么 |

禁止「基本完成」「大概没问题」——状态缺失 = 阶段未收尾。

### 5. 分诊白名单（必须导演判定的点）

以下决策点**必须**导演判定（gate = DIRECTOR_WAIT），其余机械可判的自动过：

| 决策点 | 阶段 | 产物 |
|--------|------|------|
| 预算分档（SAMPLE/ARC/FULL/PILOT） | Phase 0 | 00-budget-scope.json |
| 命题可改编性 | Phase 2 | 03-main-proposition.md |
| 改编发动机 | Phase 3 | 04-driver-decision.json |
| 剧集结构定夺 | Step 7 | 07-episode-map.json |
| set-piece 取舍（是否值得花预算） | Step 8 | 08-plot-nodes.json |
| 签核 | Final | 12-sign-off.json |

- 其余 gate：机械可判的 PASS/FAIL 自动过；判断性的 WARN 不阻断前进，但随样片摘要持续展示，直到导演 `[确认 WARN]` 或 `[改:...]`
- **FLAGGED（Phase 5 内心外化 compensation 为空 + fidelity < high）优先于分诊**：不受白名单边界约束，渲染为不可忽略的 WARNED，必须 `[确认]` 或 `[改:...]`，不得自动放行
- 未处理的 DIRECTOR_WAIT/WARNED：管线不自动前进

### 6. Session Bootstrap 契约

新会话开工时自动加载以下上下文（恢复"上次干到哪 + 导演口味"）：

1. **最近裁决日志**——`checkpoints/director-log.jsonl` 最近 N 条（导演偏好）
2. **最近 checkpoint 摘要**——按时间戳最新的样片摘要/产物状态
3. **待决 ack 清单**——status ∈ DIRECTOR_WAIT / REVISE / WARNED 的 checkpoint

等待中的管线不自动前进；任何时刻可查询"我们在哪"（读 ack 文件 + 最新 checkpoint 时间戳）。

### 7. 协议层依赖图（checkpoints 00→12）

| Checkpoint | 阶段 | 依赖 |
|------------|------|------|
| 00-budget-scope.json | Phase 0 | —（输入：源文本 + Director's Brief） |
| 01-source-map.json | Phase 1A | 00（模式决定拆分范围） |
| 02-narrative-function.md | Phase 1B | 01（source_id 体系） |
| 03-main-proposition.md | Phase 2 | 02 |
| 04-driver-decision.json | Phase 3 | 03 |
| 05-screen-objects.json | Phase 4 | 02, 03（命题 → 主题绑定） |
| 06-translation-log.md | Phase 5 | 02, 05（屏幕物为载体） |
| 07-episode-map.json | Step 7 | 06 |
| 08-plot-nodes.json | Step 8 | 07 |
| 09-scene-cards/*.md | Step 9 | 06, 07, 08 |
| 10-beat-sheets/*.md | Step 10 | 09（场景卡） |
| 11-screenplay.md | Step 10 | 09（场景卡）+ 10（节拍表） |
| 12-sign-off.json | Final | 11 + 全部 gate 结果 + 导演 ack |

注：Artifact Tree 中的 `scene-cards/`、`beat-sheets/` 即本表 `09-scene-cards/`、`10-beat-sheets/`（命名归一）。

**重跑级联**：「只重跑目标阶段」= 目标 checkpoint + 其全部下游依赖（按上表向下传播）；上游不重跑（除非 diff 显示上游输入变更，此时自变更点起级联）。旧 runner 每阶段重切源文本、阶段独立性从未建立——本表将依赖显式化，是重跑与回退的正确依据。

### 8. Diff 纪律

- 每 checkpoint 版本快照：`checkpoints/<name>.v<N>`（首版 v0，每次返修 +1）
- **结构化产物**（json：00/01/04/05/07/08）：字段级 diff——diff 主战场
- **散文产物**（md：02-narrative-function.md、06-translation-log.md、09-scene-cards/、10-beat-sheets/、11-screenplay.md）：节级 diff（按场景/按节）；散文返修默认节级重写，不整文件重写
- 每次返修必须出示 before/after diff 摘要（改了什么、影响哪些字段/节）
- 「变差」从感觉变成可回退的事实：导演可 `回退 v<N>`（恢复快照 + 记裁决日志 + 重跑下游）

### 9. 返修回路（批注 → 返修指令编译器）

- 批注（如"第三场怪怪的"）→ 根因分类（复用 08-review-iteration 的 failure-classification）→ 目标阶段 + 具体修改指令（"重写 EP03-S05 节拍结构"）
- **MVP 用确定性路由**（08 现有路由表；置信度校准出 MVP）
- 路由置信度低（无匹配分类）→ **先回问澄清**（"是节奏还是动机？"），不猜
- **每 checkpoint 返修上限 2 轮**；超过后导演在真实决策集终裁：**接受现状 / 召评审团换视角 / 删减元素缩小范围 / 终止该线**——不把问题抛回导演（导演本身就是发 [改:] 的人）
- 返修后重跑 08 preflight 连续性检查（continuity-locks、ID 断链）

### 10. Runner 定位（执行方式）

- 创作阶段（Phase 1B–Step 10 的全部 LLM 内容产出）**按本协议在 Claude 会话内文档驱动执行**——本协议即执行器
- `scripts/ds-pipeline-runner.js` 的 9 个 LLM 阶段（1B 叙事功能 / 2 命题 / 3 发动机 / 4 物件 / 5 转译 / 7 剧集 / 8 情节节点 / 9 场景卡 / 10 剧本）**已废弃**，不再作为执行方式
- 仅保留机械步骤脚本，会话内按需调用：`scripts/source-map.js`（Phase 1A 拆分）、`scripts/budget.js`（Phase 0 预算）、`scripts/validate-screenplay.js`（剧本格式校验）
- 签核语义：sign-off.json **缺人工 ack 不得生成**（ack status=PASSED 且 signedBy 非空）

### 11. ack 文件协议（持久化通道）

每 checkpoint 一个 ack 文件（`checkpoints/<name>.ack.json`）：

```json
{ "checkpoint": "05-screen-objects.json", "status": "DIRECTOR_WAIT | PASSED | REVISE | WARNED",
  "directorNote": "把日记本改成挂在腰间的旧钥匙串",
  "signedBy": "导演（用户确认时间戳）",
  "compiledAction": { "targetStage": "04-driver-decision", "instruction": "重写 EP03-S05 节拍结构", "confidence": "high" },
  "sessionId": "<认领会话>", "waitingSince": "<ts>", "reviseCount": 0 }
```

- 状态枚举与 gate 状态机对齐；**ack 枚举是持久化事实源**（Reviewer Concern #3）
- 评审团不是独立状态：DIRECTOR_WAIT 下的进行中标记（waitingSince + 评审记录文件）
- 单写入者：sessionId 认领恢复权，第二个会话接管需先释放；任一 ack 超 24h 无更新 → **只报告**"管线活动中断"，**接管需导演人工确认**（绝无自动放行；确认后释放旧认领并接管，审计记录保留）——T-B 决定
- 完整细则（gate 状态机、11 门处置表、级联示例、diff 摘要格式、路由映射表）见 `frameworks/13-director-mode.md`

### 12. 输出位置协议（Output Location Contract）

**新产出不写入本 skill 目录**——skill 目录只存定义文件（frameworks/prompts/templates/scripts）。历史遗留（本目录下 `output/`、`星谣/` 为早前的产出）不迁移；**本协议生效后的新产出一律写入工作区**。

开工进入 Phase 0 前，必须用 AskUserQuestion 弹输出位置选项：

```
question: 产出文档输出到哪里？
header:   输出位置
选项（≤4 个）：
  [默认工作区]（推荐）—— description: State/Foundry/tasks/<项目名>-<YYYYMMDD>/（沿用 Foundry 任务目录惯例）
  [当前目录]           —— description: 写在当前会话工作目录
  [自定义路径]         —— description: 选 Other 输入完整路径
```

- 默认工作区路径规则：`State/Foundry/tasks/<项目名>-<YYYYMMDD>/`；项目名未定用 `novel-to-screen-adaptation`；日期用开工日
- 确定后，本协议各处 `checkpoints/` 即指 `<输出位置>/checkpoints/`（依赖图、ack 文件、director-log.jsonl 全部落该目录）；样片摘要必须写明输出绝对路径
- 回退：无交互环境默认「默认工作区」

---

## Mandatory Input — Director's Adaptation Brief

02 协议不得在缺少 **Director's Adaptation Brief** 的情况下开始。

```
01 story-analyzer → manifest.json
         ↓
film-director 读小说 + 读 manifest
         ↓ 产出
Director's Adaptation Brief（frameworks/00-directors-brief.md）
         ↓ assistant-director 派发
head-writer 验收 brief → 确认 untouchable_core / cuttable → 开始 02
```

**没有 brief → 02 不得进入 Phase 0。**
**head-writer 不赞同 brief 中的判断 → 返回 director，不自己改。**

详见 `frameworks/00-directors-brief.md`。

**Q0（Pre-Flight 第一问）：是否有 Director's Adaptation Brief？**
如果没有 → 不得开始 02。退回 film-director。

---

## Phase 0: Budget & Scope Contract

拿到 Director's Brief 后，进入预算检查。第一步不是分析——是先给出预算报告。

### SOURCE_BUDGET_REPORT

任何源文本进入时必须先产出：

```yaml
SOURCE_BUDGET_REPORT

source_file: 白焰.md
line_count: 4528
chapter_count: 13
estimated_reading_passes: 4
estimated_output_size: 2
recommended_mode: ARC
risk: medium
reasoning: 4528行超过一次性完整处理的安全预算。建议先做ARC模式（一条完整叙事弧验证），再决定是否FULL。
```

### Processing Modes

| Mode | 适用条件 | 产出 | 用法 |
|------|---------|------|------|
| **SAMPLE** | ≤500 行，或只验证单段落 | 1 个关键段落剧本 | 测试风格是否成立 |
| **ARC** | 500-5000 行，或有一条完整弧线 | 1 条叙事弧的完整改编链 | 验证改编发动机是否成立 |
| **FULL** | >5000 行，或需要全篇改编 | Bible + 分集大纲 + 多集样章 | 正式生产模式 |
| **PILOT** | 剧集项目 | 第 1 集完整剧本 + 后续大纲 | 剧集制作 |

### Budget Hard Rules

1. **如果源文本超过当前上下文安全预算，必须先进入分批索引模式，不得直接生成完整剧本。**
2. ARC 模式必须覆盖：source map → proposition → engine → objects → translation → episode → scene card → beat → 至少 2 场完整剧本
3. FULL 模式必须分轮：第一轮做 Bible + 大纲，第二轮按集逐批生成

---

## Phase 1: Source Map — 文本拆分

对小说文本的拆分理解。**分两种，手段不同。**

### 1A: 机械拆分（脚本做）

运行 `scripts/source-map.js` 自动产出：

```
- 按章节标题拆分         → 章节边界 + 行号范围
- 统计每章字数/行数      → 体量分布
- 提取人物名             → 出场频率表
- 提取地点               → 地点清单
- 提取高频物件           → 潜在屏幕物件
- 提取对话比例           → 每章对话/叙述占比
- 提取疑似场景边界       → 空行 + 时间词 + 地点词
- 建立 source_id 体系     → CH01-LN001-CH01-LN320
```

输出示例：

```json
{
  "chapters": [
    {
      "id": "CH01",
      "title": "莱纳崩溃",
      "lines": "1-320",
      "wordCount": 2840,
      "dialogueLines": 86,
      "narrativeLines": 234,
      "dialogueRatio": 0.27,
      "characters": ["伊沃", "莱纳", "卡洛"],
      "locations": ["食堂", "莱纳宿舍"],
      "objects": ["日记本", "墨水", "蓝色营养剂"],
      "sceneBoundaries": [1, 42, 98, 187, 320]
    }
  ],
  "characters": {
    "伊沃": { "firstAppearance": "CH01-LN001", "mentionCount": 187, "role": "protagonist" },
    "莱纳": { "firstAppearance": "CH01-LN004", "mentionCount": 93, "role": "friend" },
    "白焰": { "firstAppearance": "CH02-LN321", "mentionCount": 76, "role": "mystery" }
  },
  "objects": {
    "日记本": { "firstAppearance": "CH01-LN012", "mentionCount": 34 },
    "蓝色营养剂": { "firstAppearance": "CH01-LN089", "mentionCount": 18 },
    "墨水黑斑": { "firstAppearance": "CH01-LN156", "mentionCount": 12 }
  }
}
```

### 1B: 戏剧拆分（LLM 做）

机械拆分无法判断以下内容，必须 LLM 处理：

```
- 这一段落的叙事功能是什么？
- 谁的立场发生了变化？
- 哪个信息被揭露给读者/观众？
- 哪个物件变成后续伏笔？
- 哪段内心活动需要外化？
- 哪些章节应该合并成同一集？
```

每段必须回答：

```markdown
## CH04 叙事功能分析

### Source
CH04 lines 878-1212
伊沃追踪白焰留下的线索，经过配电站、旧仓库、天台。

### Narrative Function
- 伊沃从"我要上报卡洛"转向"我要亲自抓住白焰"
- 第一次把白焰留下的证据装进口袋（行为转向）
- 线索链：食堂→配电站→旧仓库→天台（空间层层递进）

### What Must Be Preserved
- 伊沃的转向过程（非突变，是逐步的）
- 证据的物理性（存储卡、照片、纸条——不能是"他记在脑子里"）

### What Must Be Cut/Compressed
- 部分环境描述（配电站的详细设备描写）
- 部分内心犹豫的循环（小说可以反复写"他犹豫"，屏幕只需要一次可见选择）

### Screen Translation Strategy
- 不解释"他决定相信白焰"，用动作完成：他把证据装进贴近心脏的口袋
- 不上报卡洛 → 跳过汇报场景，直接切到他继续追踪
```

### Hard Rule

```
script handles structure.
LLM handles dramatic function.
机械拆分不准跳过，戏剧拆分不准交给脚本。
两者必须都完成，才能进入 Phase 2。
```

---

## Phase 2: Main Narrative Proposition — 叙事命题

"主题"太容易变成废话（"自由 vs 控制"——对但没用）。
本协议要求输出**可改编的命题句**。

### 命题格式

```markdown
MAIN NARRATIVE PROPOSITION

### 主命题
当一个被制造出来维护秩序的人，发现自己的完整人生也是系统产品时，
他是否还能保留一点不被系统使用的自我？

### 反命题
完整感本身可能是骗局。被系统完美缝合的人，不会感到不适。
只有故障——无用、混乱、不可预测——才是人格残留的证据。

### 人物如何证明命题
- 伊沃：从系统维护者→发现异常→抵抗系统
- 白焰：用疼痛和伤口确认自己还有感知
- 莱纳：被修复后，失去问题也失去了人格
- 莫罗：成功覆写伊沃，但无法消除那阵风

### 结尾如何回收命题
伊沃抵抗莫罗时，抓住的不是宏大正义，
而是"真正的风"——一种无用、混乱、不可预测的东西。
这是莫罗无法利用的残留。

### 不可改动的主题核心
- 完整感可能是缝合的假象
- 人格存在于故障中
- 混乱不是缺陷，是证据
```

### Hard Rules

1. 命题不是标签（"自由 vs 控制"），而是可改编的句子
2. 命题必须在文本中有具体支撑（引用行号）
3. 每场戏必须测试命题或反命题——否则删戏
4. 结尾必须回收命题（不回收 = 改编失败）

---

## Phase 3: Adaptation Driver & Screen Format

### Adaptation Driver — 改编发动机

找到故事靠什么推动观众看下去。

以《白焰》为例，发动机不是动作，也不是纯悬疑：

```
Identity Revelation     —— 伊沃是谁？
Conspiracy System       —— 学校到底是什么？
Emotional Anchor        —— 伊沃和白焰的关系
Contained World Reveal  —— 封闭世界逐步揭露
```

每一条都是一个"观众想知道答案的问题"。

### Driver 格式

```yaml
driver_type: identity-revelation + conspiracy-system
secondary: contained-world-reveal + emotional-anchor
primary_questions:
  - 伊沃是谁？
  - 白焰说的是不是真的？
  - 学校到底是什么？
  - 莱纳和莱纳去哪了？
  - 伊沃会不会变成莫罗？
  - 白焰能不能被救？
reasoning: 故事不是靠动作驱动，是靠"真相一步步揭开"驱动。
```

### Screen Format — 影视形态

```yaml
format: mini-series
episodes: 6
episode_runtime: 12-18min
genre: sci-fi-mystery / dystopian / identity-awakening

ai_pipeline_plan:
  full_series: 6集短剧结构
  ai_verify_pilot:
    - 莱纳仓库崩溃（EP01关键场）
    - 天台假风证明（EP04关键场）
    - 伊沃苏醒为莫罗（EP06关键场）
```

### Hard Rules

1. 不同影视形态改变节奏、集数、场面密度和输出结构
2. 必须输出 driver + format，否则下游无法适配
3. 不得不管文本性质强行全部改成同一种短视频格式

---

## Phase 4: Screen Object System — 屏幕核心物品

小说里大量信息是心理、叙述、感官。
改编成影视后，要先找到能反复出现的**屏幕物**。

### 屏幕物 ≠ 小说道具

```
小说道具：一次性的、场景特定的
屏幕物：反复出现的、承载心理和主题的、可回收的
```

### 以《白焰》为例

```yaml
screen_objects:
  - name: 黑色硬壳日记本
    first_appearance: CH01-伊沃在食堂记录
    narrative_binding: 伊沃确认现实的工具
    visual_function: 他翻看时镜头推近，观众从他肩后看

  - name: 墨水黑斑
    first_appearance: CH01-日记本上出现不记得写过的字
    narrative_binding: 现实连续性被破坏的物证
    visual_function: 特写墨迹，他的手开始发抖

  - name: 蓝色营养剂
    first_appearance: CH01-食堂发放
    narrative_binding: 系统缝合记忆的手段
    visual_function: 每次喝完，他的记忆就更模糊一点

  - name: 白焰纸条
    first_appearance: CH02-配电站门缝
    narrative_binding: 系统之外的信号
    visual_function: 字迹潦草但有力，纸边被汗浸湿

  - name: 红色风向标
    first_appearance: CH04-天台
    narrative_binding: 假世界的证据
    visual_function: 粉笔画线 + 测风纸带 + 腕表

  - name: 测风纸带
    first_appearance: CH04-天台
    narrative_binding: 白焰存在过的证据
    visual_function: 同时飘向西北，像是排练过的

  - name: 白色塑料面具
    first_appearance: CH01-莱纳戴
    narrative_binding: 制度的视觉符号
    visual_function: 摘下面具的瞬间

  - name: 旧绷带
    first_appearance: CH02-白焰据点
    narrative_binding: 白焰不是幻觉——她受过伤
    visual_function: 伊沃触碰绷带，上面有干掉的褐色

  - name: 真正的风
    first_appearance: EP06-结尾
    narrative_binding: 伊沃人格中无法被莫罗利用的残留
    visual_function: 他闭眼感受——画面切到白色，声音渐强
```

### 输出格式

```json
[
  {
    "id": "日记本",
    "binding": "伊沃确认现实的工具",
    "firstAppearance": "CH01",
    "recurrence": ["CH01", "CH03", "CH05", "EP06"],
    "visualFunction": "肩后视角翻看特写",
    "themeBinding": "完整感的不可靠"
  }
]
```

### Hard Rules

1. 每个物件必须绑定至少一个叙事功能
2. 每个物件必须标记 firstAppearance + recurrence plan
3. 物件数量 5-10 个为宜，超过 15 个会稀释
4. 输出直接喂给 03-production-breakdown 做物料规划

---

## Phase 5: Interior-to-Screen Translation — 内心信息外化

这是整个协议的核心转译层。

### 转换原则

小说可以写内心。屏幕不能。

| 小说原文 | 不可直接入剧本 | 屏幕替代 |
|---------|---------------|---------|
| "伊沃感到自己的完整感正在崩塌" | ❌ 内心感受 | ✅ 他翻开日记，看到墨水黑斑，看到不记得写过的句子，手开始发抖 |
| "白焰用自己的血肉摩擦系统边界" | ❌ 抽象比喻 | ✅ 她手背布满细小伤口，她用受伤的手把测风纸带绑上栏杆 |
| "伊沃开始相信白焰" | ❌ 内心变化 | ✅ 他没有上报卡洛。他把白焰的证据收进贴近心脏的口袋 |
| "白焰不是幻觉" | ❌ 内心结论 | ✅ 旧据点里有压缩饼干、绷带、垃圾通道时间表——她在这里生活过 |
| "伊沃意识到自己被监视" | ❌ 意识 | ✅ 他回头。走廊尽头，一个白色塑料面具闪进门后 |

### 转换记录格式

每一条转换必须有 loss + fidelity + compensation：

```markdown
## Translation Record

### Source
CH03 line 567: "伊沃感到自己的完整感正在崩塌。"

### Screen
他翻开日记。看到墨水黑斑。看到一行自己不记得写过的字。
手指停在纸面上，没有翻页。

### Loss
失去了"完整感崩塌"这个抽象概念的直接传达。
观众需要从动作中推断他的心理状态。

### Fidelity
高。日记 + 墨水黑斑 + 不认识的字 = 三样视觉证据叠加，
比"感到崩塌"更有力——观众和他一起看到异常。

### Compensation
无。三样视觉证据已充分替代，不需要补偿。

### Converter Used
Interior → Action
```

### Compensation — 补偿方案

**为什么需要 compensation：** 删是最容易的，但改编的价值在于不删的前提下找到屏幕载体。

每条转换必须填 compensation。**如果 compensation 为空 + fidelity 低于 high = 标记为 FLAGGED，需要 Owner 决策：**

```
compensation:
  type: visual_push | sound_design | object_focus | 
        dialogue_insert | sequence_resequence | 
        performance | delayed_reveal | montage | none
  plan: |
    具体怎么补偿丢失的信息。
    如果是 none，说明丢失的信息对叙事主干无影响。
```

| 补偿类型 | 用法 | 示例 |
|---------|------|------|
| `visual_push` | 镜头推近到某个物件上，让观众自己发现信息 | 殖民船插图推近→观众自己看到"这是殖民地" |
| `sound_design` | 声音承载叙事信息 | 广播声、环境音、沉默本身 |
| `object_focus` | 让某个物件承担丢失的信息 | 玄关没有女主人鞋→母亲缺失 |
| `dialogue_insert` | 在对白中自然补入丢失的信息 | "还记得去年那个车祸的小孩吗？" |
| `sequence_resequence` | 调整前后场景顺序，让信息在更自然的位置释放 | 把历史背景从洗澡移到父亲谈话时提一句 |
| `performance` | 依赖演员的微表情和身体语言 | 一个停顿、一次回避的眼神 |
| `delayed_reveal` | 不在这里说，在后面某个场景让观众自然理解 | 洗澡时删了殖民背景→S-4父亲提到"这颗星球一开始就没有..." |
| `montage` | 快速剪辑承载信息 | 祖辈登陆的历史闪前 |
| `none` | 确认丢失的信息对主干无影响，干净地删掉 | 无 |

### 五类必转内容

| 源类型 | 转换策略 | 示例 |
|--------|---------|------|
| 内心感受 | → 身体动作 / 环境反应 | 发抖、停下、放下食物、注视某物 |
| 内心判断 | → 可见选择 / 不选择 | 不汇报、绕路、把证据装进口袋 |
| 回忆闪回 | → 物件触发 / 空间触发 | 看到绷带就停顿，不需要闪回 |
| 抽象概念 | → 物化 + 动作 | "系统边界"→ 她用受伤的手绑纸带 |
| 信息认知 | → 反应 + 沉默 + 下一动作 | 发现真相，不需要说"我明白了" |

### Hard Rules

1. **每一条转换必须记录 loss + fidelity + compensation**——否则下游无法判断信息丢失了什么
2. **如果找不到屏幕载体，首先找补偿方案——删是最后的选择**
3. **compensation 为空 + fidelity 低于 high = FLAGGED**——需要 Owner 决策是否可删
4. **重要心理信息必须找到屏幕载体**——不能"观众自己体会"
5. **每条转换至少覆盖 5 个实例**——否则不够
6. **删除是改编失败，不是改编策略**——每次删都必须有书面理由和补偿方案

---

## 7: Episode Function Map — 剧集功能重组

完成前 5 个阶段后，才进入结构重组。

### 原则

小说章节不是剧集单位。小说章节可能承担：
- 心理铺垫
- 世界说明
- 悬疑延迟
- 人物状态变化

剧集单位必须承担：
**观众观看推进 + 每集有起点、发展、转折、终点的完整微循环**

### 以《白焰》为例

```yaml
episodes:
  - id: EP01
    title: 莱纳崩溃
    function: 伊沃第一次站在系统一边
    source_chapters: CH01-CH02
    cold_open: 莱纳在仓库崩溃
    inciting: 卡洛下令清除莱纳的异常记录

  - id: EP02
    title: 白焰绑架
    function: 白焰作为"疯子"登场，伊沃变成私人猎人
    source_chapters: CH03-CH04
    midpoint_turn: 伊沃在配电室发现白焰留下的证据，没有上交

  - id: EP03
    title: 莱纳被修好
    function: 白焰从疯子变成可能正确的人
    source_chapters: CH04-CH05

  - id: EP04
    title: 天台假风
    function: 世界观崩塌——伊沃亲眼看见山、天、风都是假的
    source_chapters: CH06-CH07
    set_piece: 天台假风证明（3:50 风停）

  - id: EP05
    title: 白焰被清除
    function: 系统删除一个人的存在，伊沃决定越界
    source_chapters: CH08-CH11

  - id: EP06
    title: 莫罗覆写
    function: 伊沃失去完整性，但保留一阵不听话的风
    source_chapters: CH12-CH13
    ending_beat: 真正的风
```

### 关键规则

**如果 sceneSequence 的顺序和小说完全相同 → 机械改编，FAIL。**

每集必须有：

```yaml
episode_function: # 唯一，不与其他集重复
cold_open:        # 30 秒 hook
inciting_incident: # 本集的"事情开始了"
midpoint_turn:    # 中段转向
crisis:           # 本集最大压力
cliffhanger_or_payoff: # 收尾
```

---

## 8: Plot Node & Set-Piece — 情节节点与关键场面

从"剧集功能"往"场面"走。

### 每集节点

```yaml
episode: EP04
title: 天台假风
nodes:
  - type: cold_open
    content: 伊沃发现白焰留下的路线图
  - type: inciting_incident
    content: 伊沃追踪白焰，抓下面具，看见她是少女
  - type: midpoint_turn
    content: 发现她真正的据点——看到"外勤人员没有真正回来"
  - type: crisis
    content: 伊沃第一次不把证据交给卡洛
  - type: cliffhanger
    content: 莱纳兴奋宣布自己被选入外勤——伊沃知道那意味着什么
```

### Set-Piece 定义

Set-piece ≠ 重要剧情。
Set-piece = **值得为它花特效预算和制作时间的场面**。

```yaml
set_pieces:
  - id: SP-01
    scene: 莱纳仓库崩溃（EP01）
    type: emotional-set-piece
    visual_strategy: 仓库货架投下条纹阴影，莱纳蜷缩在角落，面具被摘下
    budget: medium
    duration: 120s

  - id: SP-02
    scene: 天台假风证明（EP04）
    type: reveal-set-piece
    visual_strategy: 粉笔画线→望远镜→横移→无视差→风停→所有纸带同时指向西北
    budget: high
    duration: 90s
```

---

## 9: Scene Cards — 场景卡

每场戏必须回答：

```markdown
## EP04-S05: 天台假风证明

location: 综合实验楼天台
time: 下午 3:49-3:50
characters: 伊沃、白焰

visible objective: 白焰让伊沃亲眼验证世界异常
obstacle: 伊沃的理性仍在抵抗
conflict: 白焰不解释，只要求他看；伊沃不愿相信，但证据发生在眼前

information reveal: 远山没有视差，天空有拼缝，风在 3:50 准时重置
relationship shift: 白焰从疯子变成证人；伊沃从猎人变成动摇者

screen object: 望远镜、粉笔线、红白测风纸带、腕表

visual strategy: 过肩拍望远镜画面，三帧对比（左/中/右无视差）
ending state: 伊沃第一次亲眼看见世界是假的

source reference: CH06 lines 1420-1567
```

详见 `frameworks/09-scene-card.md` 和 `templates/scene-card.md`。

---

## 10: Beat Sheet → Screenplay Draft — 节拍表到剧本正文

### Beat Sheet（节拍表在剧本正文之前）

```markdown
## EP04-S05 Beat Sheet

BEAT 1: 白焰递望远镜
BEAT 2: 伊沃第一次观察远山
BEAT 3: 白焰让他横移十米
BEAT 4: 伊沃第二次观察，发现无视差
        TURN: 从"她在说谎"到"她说的可能是真的"
BEAT 5: 白焰让他等风
BEAT 6: 三点五十分，风停一秒
BEAT 7: 所有纸带同时指向西北
        TURN: 从"我想相信证据"到"证据是真的"
BEAT 8: 伊沃意识崩塌
EXIT: 伊沃没有回答。他重新举起望远镜，对准天空的边缘。
```

### Screenplay Draft（然后才是剧本正文）

```markdown
### EP04-S05 综合实验楼 · 天台

外 · 综合实验楼天台 · 下午 3:49

人物：伊沃、白焰

白焰在前，推开天台铁门。
风立刻灌进来——持续、稳定、不像自然风。

伊沃跟着跨出门，环视天台。
远处山脉轮廓清晰，天空湛蓝，他见过无数次。

白焰蹲下，从背包里取出粉笔。

**白焰：**
你看过山吗？

**伊沃：**
什么？

**白焰：**
真正看过？

白焰在水泥地上画了一条笔直的线，站在线后，举起望远镜。

**白焰：**
看山的左边缘。记住位置。

伊沃接过望远镜，对准。
镜头里，山脉的锯齿边缘精确得不像自然界产物。

**白焰：**
（拿回望远镜，横移十米）
再看。

伊沃跟过去，又举起来。
他放下望远镜。脸上没有表情。

**白焰：**
横移了十米，山的边缘应该移动。
但它没动。

她没有等他回答，从背包里拿出红白相间的测风纸带，
用胶带绑在栏杆上。

**白焰：**
还剩一分钟。

**伊沃：**
什么一分钟？

**白焰：**
风。

三点五十分，风停了。
不是逐渐减弱，是停了。

所有纸带同时垂下。然后，所有纸带同时指向西北。
像是排练过。

伊沃看着纸带。他看着白焰。他重新举起望远镜，对准天空的边缘。

BEAT 8：他没有说话。
```

### 剧本硬规则

```
每场长度：AI 视频 15-60s，传统剧 2-5min
动作占比：≥ 40%
对白上限：每段 ≤ 3 句
内心独白：零
不可拍词：她感到/她意识到/她记得/她突然明白 → 死刑
```

---

## Complete Artifact Tree

```
02-script-development/
  checkpoints/                          # adapt-step.js 生成
    00-budget-scope.json                # Phase 0: 预算报告
    01-source-map.json                  # Phase 1A: 机械拆分
    02-narrative-function.md            # Phase 1B: 戏剧拆分
    03-main-proposition.md              # Phase 2: 叙事命题
    04-driver-decision.json             # Phase 3: 发动机+格式
    05-screen-objects.json              # Phase 4: 屏幕物件
    06-translation-log.md               # Phase 5: 内心外化
    07-episode-map.json                 # 剧集功能重组
    08-plot-nodes.json                  # 情节节点+关键场面
    scene-cards/                        # 场景卡（每场一文件）
    beat-sheets/                        # 节拍表（每场一文件）
    11-screenplay.md                    # 剧本正文
    12-sign-off.json                    # 质量签核
  frameworks/                           # 每步详细参考
  scripts/
    source-map.js                       # Phase 1A: 机械拆分工具
    adapt-step.js                       # 流程强制执行器
    validate-screenplay.js              # 剧本质量格式检验
  templates/
    screenplay-scene.md                 # 剧本场景模板
    scene-card.md                       # 场景卡模板
```

---

## Quality Gates

| Gate | 检查点 | 阶段 |
|------|--------|------|
| Budget Gate | 体量判断是否正确 + 处理模式选择 | Phase 0 |
| Source Gate | 机械拆分 + 戏剧拆分均完成 | Phase 1 |
| Proposition Gate | 命题句可改编、不可改动核心明确 | Phase 2 |
| Driver Gate | 发动机是"观众想知道什么"而非"故事讲什么" | Phase 3 |
| Object Gate | 5-10 个物件、均有 recurrence plan | Phase 4 |
| Translation Gate | 每条内心转外化有 loss+fidelity 记录 | Phase 5 |
| Episode Gate | 场景顺序≠小说顺序、每集功能唯一 | Step 7 |
| Scene Gate | 每场有目标/阻碍/冲突/变化 | Step 9 |
| Dialogue Gate | 对白压缩 30%+、无解释性对白 | Step 10 |
| Format Gate | 动作占比 ≥ 40%、无不可拍词 | Step 10 |
| **Sign-Off Gate** | **完整 sign-off.json，否则不得离开 02** | Final |

---

## Failure Protocol

| 条件 | 动作 |
|------|------|
| 缺少 SOURCE_BUDGET_REPORT | FAIL，不得进入 Phase 1 |
| Phase 1A 机械拆分未运行 | FAIL，脚本产出缺失 |
| Phase 1B 未分析叙事功能 | FAIL，只有拆分没有理解 |
| 命题输出为标签而非句子 | FAIL，要求重写为可改编命题 |
| 缺少 screen_objects 或未标记 recurrence | FAIL，物件系统不完整 |
| 内心外化缺少 loss+fidelity 记录 | FAIL，无法判断信息丢失 |
| 场景顺序与小说完全相同 | FAIL，机械改编 |
| 跳过 beat sheet 直接写剧本 | FAIL，退回 step 10 |
| 剧本中出现"她感到/意识到/记得" | FAIL，不可拍内容 |
| 缺少 sign-off.json | FAIL，最终锁——剧本不得离开 02 |

---

## Anti-Patterns

```
❌ 直接把小说摘要改成剧本
❌ 把内心独白直接改成对白
❌ 把主题写成空泛标签（"自由 vs 控制"）
❌ 一章一集机械搬运
❌ 先写台词再设计场面
❌ 只写剧情，不写场景功能
❌ 只写事件，不写人物立场变化
❌ 只写世界观，不写世界观如何制造压力
❌ 把视觉奇观当成 set-piece
❌ 让角色用解释性对白替作者说话
❌ 用对白解释哲学概念
❌ 把"小说总结"当作"剧本改编"
❌ 不管文本体量，直接"读完开写"
❌ 没有 sign-off 就把剧本交给下游
```
