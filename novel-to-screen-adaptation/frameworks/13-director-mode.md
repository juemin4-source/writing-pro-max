# 13 — Director Mode（导演模式工作流细则）

## Purpose

SKILL.md 主体「导演模式工作流」章节的操作细则与参考表：gate 状态机与 11 门处置、ack 文件协议全字段、依赖图与重跑级联示例、批注→返修指令映射、diff 与回退操作约定、完成状态示例、session bootstrap 清单。本文件不独立成立，必须与 SKILL.md 主体章节配合使用。

出处：Main Design 2026-08-01 APPROVED v5（导演模式重构）。凡设计文档标注"实施时定"之处，以本文为准。

## Gate 状态机

### 四态矩阵

| 状态 | 含义 | 谁计算 | 谁等待 | ack 存哪 |
|------|------|--------|--------|---------|
| PASS | 机械检查通过，无需导演 | gate 求值器（机械校验） | — | — |
| FAIL | 机械检查失败 | gate 求值器 | 返回上游阶段 | — |
| WARN | 有疑点但机械上不阻断 | gate 求值器 | 导演（可忽略或确认） | director-ack.json |
| DIRECTOR_WAIT | 分诊白名单上的点，必须导演判定 | runner/会话 | 导演 | director-ack.json |

### 11 门处置表

| Gate | 处置 | 求值器谓词 / 说明 |
|------|------|------------------|
| Budget Gate (Ph0) | DIRECTOR_WAIT | 模式选择（SAMPLE/ARC/FULL/PILOT）是导演判断 |
| Source Gate (Ph1) | PASS（自动） | 机械拆分产物存在 + 戏剧拆分产物非空 |
| Proposition Gate (Ph2) | DIRECTOR_WAIT | 命题可改编性必须导演判定（分诊白名单） |
| Driver Gate (Ph3) | DIRECTOR_WAIT | 发动机判断（分诊白名单） |
| Object Gate (Ph4) | PASS + WARN | 物件数 5-10 可机械判；recurrence 完整性 WARN |
| Translation Gate (Ph5) | PASS + FLAGGED | 每条有 loss+fidelity 可机械查；FLAGGED 始终需导演（优先于分诊） |
| Episode Gate (Step7) | PASS + DIRECTOR_WAIT | 场景顺序≠小说顺序可机械判；剧集结构定夺需导演（分诊白名单） |
| Scene Gate (Step9) | PASS（自动） | 目标/阻碍/冲突字段齐全可机械查 |
| Dialogue Gate (Step10) | PASS（自动） | 对白 ≤3 句、无解释性对白谓词 |
| Format Gate (Step10) | PASS（自动） | 动作占比 ≥ 40%、无不可拍词谓词 |
| Sign-Off Gate (Final) | DIRECTOR_WAIT | 缺 signedBy ack 不得生成 sign-off.json |

### 连续性检查（不在 11 门内）

在 08-review-iteration 的 preflight 执行（不归 02）：谓词 = continuity-locks.json 存在且过 schema + shotId/sceneId/assetId 引用无断链 + 资产表与场景卡交叉一致。结果 PASS（自动过）/ FAIL（返回 03/05/06 对应阶段）/ WARN（记录到 ack，导演可处理）。

### Step 8 set-piece 独立决策点

与 11 门并列：导演判定每个 set-piece 是否值得花预算（特效/制作时间）。属分诊白名单，机械不得放行。

### WARN 解除

导演显式 `[确认 WARN]`（记 signedBy）或 `[改:...]` 触发返修；未处理 WARN 不阻断前进，但随样片摘要持续展示，直到导演处理或签核通过时一并带过。

## ack 文件协议（director-ack.json）

### 文件与命名

每 checkpoint 一个 ack 文件：`checkpoints/<checkpoint-name>.ack.json`（如 `05-screen-objects.ack.json`）。设计文档写作 director-ack.json，未定每文件命名——实施归一为 `<name>.ack.json`，清单视图（全部 ack）由会话/runner 扫描 `checkpoints/*.ack.json` 得到。

### Schema

```json
{
  "checkpoint": "05-screen-objects.json",
  "status": "DIRECTOR_WAIT | PASSED | REVISE | WARNED",
  "directorNote": "把日记本改成挂在腰间的旧钥匙串",
  "signedBy": "导演（用户确认时间戳）",
  "compiledAction": { "targetStage": "04-driver-decision", "instruction": "重写 EP03-S05 节拍结构", "confidence": "high" },
  "sessionId": "<认领会话>",
  "waitingSince": "<ts>",
  "reviseCount": 0
}
```

- `signedBy`：sign-off 生成前置条件（status=PASSED 且 signedBy 非空）
- `compiledAction`：批注→返修指令编译器的持久化输出，驱动重跑（目标阶段 + 下游级联）
- 状态枚举与 gate 状态机对齐；**ack 枚举为持久化事实源**（与 gate 矩阵命名是松耦合，实施以 ack 为准，Reviewer Concern #3）
- 评审团（COUNCIL）不是独立状态：DIRECTOR_WAIT 下的进行中标记（waitingSince + 评审记录文件）
- 状态渲染符号：⏳ 等导演 / ✅ 已签核 / 🔁 返修中 / ⚠️ 已警告

### 单写入者与陈旧恢复

- sessionId 认领恢复权：第二个会话恢复同一管线时检测到已认领，要求先释放（提示"管线正被会话 X 持有"）
- 全局 stale 规则（覆盖所有状态，不只 REVISE）：任一 ack 超 24h 无 checkpoint/ack 更新 → **只报告**"管线活动中断"，**接管需导演人工确认**（保持单写入者，绝无自动放行/超时自动签核；经确认后新会话释放旧认领并接管，审计记录保留）——T-B 决定（eng-review 外部声音 #4）

## 协议层依赖图与重跑级联

### 依赖表

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

### 级联规则

「只重跑目标阶段」= 目标 checkpoint + 全部下游依赖（依赖表向下传播）；上游不重跑（除非 diff 显示上游输入变更，此时自变更点起级联）。

### 级联示例

- 批注落在 `04-driver-decision.json` → 重跑 05 → 06 → 07 → 08 → 09 → 10 → 11，重新求 gate，12 等导演签核
- 批注落在 `09-scene-cards/EP03-S05.md` → 重跑 `10-beat-sheets/EP03-S05` + `11-screenplay.md` + `12-sign-off.json`
- 批注落回 `03-main-proposition.md`（命题不可改编）→ 04 起全下游级联重跑，00/01/02 不动

## 批注 → 返修指令编译器（确定性路由 MVP）

### 路由映射（复用 08 failure-classification / Fix Routing）

| 批注症状 | 根因分类 | 目标阶段 | 示例指令 |
|---------|---------|---------|---------|
| 剧情因果断裂 | script_problem | 09-scene-cards / 11-screenplay | 重写 EP03-S05 冲突节 |
| 节奏问题 | rhythm_problem | 10-beat-sheets | 重排 EP03-S05 节拍顺序 |
| 表演/不可拍 | performance_problem | 09-scene-cards | 补可见动作载体 |
| 连续性漂移 | continuity_problem | 03 / 05（视断链点） | 对齐物件 recurrence |
| 导演阐述不完整 | director_problem | 退回 brief（Q0） | 补 untouchable_core |

路由以 08-review-iteration SKILL.md 的 failure-classification / Fix Routing 为准，本表是其 02 内阶段映射。

### 编译器规则

- MVP 用确定性路由（现路由表）；置信度校准机制出 MVP
- 无匹配分类（置信度低）→ 先回问澄清（"是节奏还是动机？"），不猜
- **每 checkpoint 返修上限 2 轮**；超过后导演在真实决策集终裁：**接受现状 / 召评审团换视角 / 删减元素缩小范围 / 终止该线**——不把问题抛回导演（导演本身就是发 [改:] 的人）
- 每次返修：写 ack status=REVISE + compiledAction + 裁决日志（rationale 必填）；reviseCount +1

## Diff 与回退操作约定

### 版本快照

- 命名：`checkpoints/<name>.v<N>`（如 `11-screenplay.md.v2`）；首版 v0，每次返修前先快照 v+1
- 结构化产物（json：00/01/04/05/07/08）：字段级 diff（新增/修改/删除字段逐项列出）
- 散文产物（md：02-narrative-function.md、06-translation-log.md、09-scene-cards/、10-beat-sheets/、11-screenplay.md）：节级 diff（按场景/按节）；散文返修默认节级重写，不整文件重写

### before/after diff 摘要格式

```
<checkpoint> v<N-1> → v<N>
变更：<每项: 字段/节 + 变化 + 原因>（1-5 项）
影响下游：<级联重跑的 checkpoints 列表>
```

### 回退

导演 `回退 v<N>` → 恢复快照 → 记裁决日志（decision=revert，rationale 必填）→ 重跑该 checkpoint 下游。

## 完成状态示例

| 状态 | 示例 |
|------|------|
| `DONE` | "Phase 4 物件系统：产出 + 导演签核完整" |
| `DONE_WITH_CONCERNS` | "Step 7 剧集结构：5 集功能唯一，EP05 集内转折偏弱（关切）" |
| `BLOCKED` | "Phase 3 发动机：04-driver-decision.json 的 driver_type 与命题矛盾（证据：03-main-proposition.md §人物如何证明命题）" |
| `NEEDS_CONTEXT` | "Phase 0 预算：缺 Director's Adaptation Brief（返回 film-director）" |

## 裁决日志操作细则

- 路径：`checkpoints/director-log.jsonl`；追加写，不覆盖
- decision 枚举：`pass | revise | revert | self_check | council | confirm_warn | accept | cut | terminate`
- rationale 必填（理由缺失 = 裁决未完成）；timestamp 用 ISO 8601 本地时区
- 展示：随样片摘要附最近 5 条；跨会话自动加载（session bootstrap 契约）
- 定位：味觉记忆最小版——累积后即导演偏好数据源；完整版（批注分类归档、按历史口味过滤候选）出 MVP

## 指令呈现协议（AskUserQuestion 选择框）

> 导演指令**用 Claude 自己的选择框（AskUserQuestion）弹出**，不裸等文本输入——借鉴 gstack 的 AskUserQuestion 交互（Main Design 2026-08-01：「样片摘要模板…借鉴 gstack AskUserQuestion」）。本节是交互呈现层，**不改变** gate 状态机、ack 文件协议、依赖级联与裁决日志的任何字段语义。

出示样片摘要后，必须调用 AskUserQuestion 弹出导演选项：

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
- decision 映射：通过→pass / 自检→self_check / 评审→council / 改→revise；自由文本按前缀解析（decision 枚举见「裁决日志操作细则」）
- **rationale 必填**：导演的理由取用户注解（AskUserQuestion 注解栏）；无注解时记「导演选择 <选项>，样片摘要推荐理由：<…>」——理由缺失 = 裁决未完成
- ack 文件（`<name>.ack.json`）协议不受影响：status=DIRECTOR_WAIT 等导演、[通过] 后 status=PASSED 且 signedBy 非空才可生成 sign-off.json
- 回退：非交互环境（无法弹出选择框）退回文本等待，导演以 `[通过]` 等指令语法输入，其余协议不变

## Session Bootstrap 检查清单

新会话开工执行：

1. 读 `checkpoints/director-log.jsonl` 最近 N 条 → 导演偏好
2. 按时间戳找最新 checkpoint 摘要/产物 → 上次干到哪
3. 扫 `checkpoints/*.ack.json` 中 status ∈ DIRECTOR_WAIT / REVISE / WARNED → 待决清单
4. 输出状态行："管线在 <checkpoint>，等导演 <指令>"；或"无可恢复上下文，从 Q0 开始"

## 与 08-review-iteration 的接口

- `[评审 <目标>]` → 08 第三模式（评审团）承接：两轮制、透镜互斥、证据对抗、导演唯一法官；本文件不展开（属 08 改动）
- 反馈路由复用 08 failure-classification / Fix Routing（见"批注 → 返修指令编译器"）
- 08 preflight 连续性检查在每次返修后重跑
- 02 不复制 08 的路由表全文，路由以 08 SKILL.md 为准

## Runner 定位

- `scripts/ds-pipeline-runner.js` 的 9 个 LLM 阶段（1B 叙事功能 / 2 命题 / 3 发动机 / 4 物件 / 5 转译 / 7 剧集 / 8 情节节点 / 9 场景卡 / 10 剧本）**已废弃**，不再作为执行方式；创作阶段在 Claude 会话内文档驱动执行
- 保留的机械步骤脚本：`scripts/source-map.js`（Phase 1A 拆分）、`scripts/budget.js`（Phase 0 预算）、`scripts/validate-screenplay.js`（剧本格式校验）——会话内按需调用，不经 runner 编排
- `scripts/tracked-pipeline-runner.js` 标记为 demo（硬编码 Temp 路径 + 本地 Ollama），停止作为组件；`scripts/local-pipeline-runner.js` 并入或废弃——设计文档处置，本文只记录定位，不改脚本文件

## Hard Rules

1. 没有导演 ack → 没有 sign-off.json → 剧本不得离开 02
2. 分诊白名单上的点，机械不得自动放行
3. FLAGGED 优先于分诊，渲染为不可忽略的 WARNED，必须 [确认] 或 [改:...]
4. 每 checkpoint 返修上限 2 轮，终裁必须落在决策集（接受现状 / 召评审团 / 删减元素 / 终止）
5. 理由缺失 = 裁决未完成（rationale 必填）
6. 状态缺失 = 阶段未收尾（DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT 四选一）
7. 散文返修节级重写，不整文件重写

## Anti-Patterns

- ❌ 无导演指令自动前进到下一阶段
- ❌ 批注不路由，直接整链重跑
- ❌ 无 before/after diff 就声称"已改好"
- ❌ 推荐当决定，替导演做判断
- ❌ 「基本完成」「大概没问题」
- ❌ 把评审团当作独立 gate 状态（它是 DIRECTOR_WAIT 的进行中标记）
