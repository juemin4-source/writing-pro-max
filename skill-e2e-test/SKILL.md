---
name: skill-e2e-test
lastUpdated: 2026-08-02
description: "技能端到端测试：让 AI 按 target skill 的 Procedure 全流程跑一遍（模拟导演 + 机械扫描），逐阶段对照协议找问题，输出 E2E 报告喂给 skill-evolution。触发词：技能端到端测试/E2E 测试/跑一遍 skill/技能验收/全流程测试/测试技能。与 e2e-summary 的边界：e2e-summary 汇总代码测试结果；本 skill 是协议级 E2E（AI 执行创作流程 + 协议符合性检查）。"
---

# Skill E2E Test — 技能端到端测试
# 让 AI 自己跑一遍 skill 的全流程，然后看问题

> **中文唤起**：直接说「跑一遍 XX 技能的 E2E」「技能端到端测试」「验收一下 XX skill」即触发本 skill。

## Core Thesis

> 验收标准写在纸面上不算数——**让 AI 按 Procedure 真跑一遍**，跑到哪里断、哪里检查没过、哪里协议自相矛盾，问题自然显形。

E2E 不是代码测试（那是 e2e-summary/02 tests 的 validate-screenplay 干的事），是**协议级测试**：AI 扮演测试执行者 + 模拟导演，完整走一遍 target skill 的流程，每阶段对照该阶段的可判定检查与质量门验收，最后输出阶段矩阵与问题清单。

与 skill-evolution 的接口：**E2E 报告 = 测试信号**——发现的问题（协议缺口/检查失效/引用断链）作为信号输入 skill-evolution 的优化提案，修复后再跑一轮 E2E 验证（测试闭环）。

## 输入与模式

| 模式 | 范围 | 耗时 |
|------|------|------|
| smoke（快速） | 只跑关键阶段（种子期完整 + 后续每阶段抽样验收） | 短 |
| full（完整） | Procedure 全流程逐阶段跑 | 长 |

```
输入：target skill（novel-original-writing / novel-review / novel-to-screen-adaptation / video-prompt-adapter）+ 模式（smoke/full）
```

## 流程

```
① 测试准备 → ② 流程执行（逐阶段）→ ③ 机械扫描 → ④ E2E 报告 → ⑤（可选）修复后重跑
```

### ① 测试准备

- 加载 target skill 的 SKILL.md + frameworks（读全，掌握 Procedure/质量门/检查表）
- 加载测试夹具（`frameworks/01-test-cases.md` 定义的用例，fixtures/ 提供素材）
- 建测试工作目录（输出位置协议：默认 `State/Foundry/tasks/e2e-<skill名>-<YYYYMMDD>/`——**测试产出不落 skill 目录**）
- 声明测试范围（smoke/full + 本次要验收的阶段列表）

### ② 流程执行（详见 frameworks/02-execution.md）

AI 双角色：**测试执行者**（跑 target skill 的 Procedure）+ **模拟导演**（按测试脚本回答，覆盖：正常通过路径 + 一次 `[改:]` 返修路径 + 一次选择框交互）。逐阶段执行、逐阶段验收：

```
阶段产物 → 对照该阶段可判定检查（target frameworks 末尾清单）→ 对照质量门 → 记录：通过/失败/警告 + 证据
```

模拟导演的默认回答在 01-test-cases.md 的用例脚本中预设——画像为**刻薄、挑剔、高要求**（拒绝第一稿、连环 `[改:]`、质疑判断依据、抓自相矛盾）。E2E 是压力测试：协议扛得住难缠导演，才算真过。

### ③ 机械扫描（详见 frameworks/03-checks.md）

流程跑完后，对 target skill 做静态扫描（可命令化）：

- **引用断链**：grep 每个 frameworks 文件被引用的路径是否真实存在
- **frontmatter 合法性**：name 与目录一致、description 非空
- **Files 表一致性**：SKILL.md 的 Files 表与实际文件对比
- **协议字段**：director-log schema、checkpoint 命名、输出位置协议
- 02 特有：`scripts/validate-screenplay.js` 跑剧本硬规则（机械可跑）

### ④ E2E 报告（详见 frameworks/04-report.md）

```
## E2E 报告：<skill 名>（<模式>，<日期>）

### 阶段矩阵
| 阶段 | 状态 | 检查项 | 问题 |
|------|------|--------|------|
| A 种子期 | ✅/❌/⚠️ | … | … |

### 问题清单（按严重度）
位置 / 症状 / 违反条款 / 证据 / 修复建议

### 机械扫描结果
引用断链 / frontmatter / Files 表 / 协议字段

### 结论
skill 是否可发布 / 需修什么 / 是否重跑
```

报告写入测试工作目录；问题清单直接作为 skill-evolution 的信号（接口见 04-report.md §四）。

### ⑤ 修复后重跑

skill-evolution 应用修复后，重跑 E2E 验证修复（对照问题清单逐条验证，已修复的标记 resolved）。

## Files

```
skill-e2e-test/
  SKILL.md                                    # 本文件：五步流程/模式/接口
  frameworks/
    01-test-cases.md                          # 测试用例：每个 skill 的 E2E 场景（夹具+导演脚本+验收点）
    02-execution.md                           # 执行协议：AI 双角色/逐阶段执行与验收规则
    03-checks.md                              # 检查维度：机械扫描命令/协议检查/质量门
    04-report.md                              # E2E 报告格式：阶段矩阵/问题清单/skill-evolution 接口
  fixtures/
    concept-e2e.md                            # 原创流测试概念（种子期夹具）
```

## 测试用例覆盖（01-test-cases.md 全量）

| target skill | 夹具 | 覆盖阶段 |
|-------------|------|---------|
| novel-original-writing | fixtures/concept-e2e.md | A-G 七阶段 + 质量门 20 条 |
| novel-review | 02 tests/fixtures/渊光代码_第一章.md（复用，不复制） | 路由→四层扫描→评分→报告 |
| novel-to-screen-adaptation | 同上 | Phase 0-12（smoke 可跳过 5/8） |
| video-prompt-adapter | E2E 跑出的剧本片段 | 四件套 + Seedance 2.5 格式 |

## 输出位置协议

测试工作目录与报告按输出位置协议（AskUserQuestion 问输出位置，默认 `State/Foundry/tasks/e2e-<skill名>-<YYYYMMDD>/`）；**不写入 target skill 目录，不写入本 skill 目录**（fixtures 是定义文件除外）。

## Hard Rules

1. 逐阶段验收必须有证据（产物引用/检查输出）——"感觉没问题"不算通过
2. 模拟导演必须覆盖一次 `[改:]` 返修路径（返修协议是 skill 的核心路径，不测 = 假 E2E）
3. 机械扫描必跑（引用断链是静态问题，不需要 AI 判断）
4. E2E 发现的问题必须落到具体条款（违反哪条检查/哪个质量门）——无法定位条款的问题写成"协议缺口"并指明缺失的条款
5. 报告结论明确"可发布 / 需修复后发布"——不写"基本没问题"
6. 测试夹具与真实创作隔离：E2E 不产出真实项目内容（测试概念只存在于 e2e 工作目录）。**测试生成的故事情节为副产品，仅存于测试工作目录（tasks/e2e-*/）**——不进任何 skill 目录、不进 fixtures、不成为 skill 的正式能力（故事是测试的副产品，不是测试的目标；skill 保持测试工具纯粹性）

## Anti-Patterns

```
❌ 只跑 happy path（全通过路径）——返修/选择框路径必须覆盖
❌ 阶段验收凭印象（无产物证据）
❌ 跳过机械扫描
❌ 问题不落条款（"结构层有问题"——哪条检查？）
❌ 把 E2E 结果当最终结论（报告是信号，修复+重跑才闭环）
❌ 测试污染：用真实用户项目当夹具
```
