# Novel Skills — Foundry 电影管线的写作技能集

Claude Code 技能包（`.claude/skills/` 平级结构，直接复制四个目录到项目的 `.claude/skills/` 即可使用）。

包含四个互相引用的 skill：

| Skill | 中文名 | 职责 | 输入 → 输出 |
|-------|--------|------|------------|
| `novel-to-screen-adaptation` | 改编流 / 小说改编 | 小说 → 剧本的转译协议（命题/发动机/物件/场景/剧集结构） | 小说文本 → 可拍剧本 + sign-off |
| `novel-original-writing` | 原创剧本流 | 概念 → 剧本的原创协议（种子/世界/人物/结构/载体/表演/余震七阶段 + 质量门 20 条） | 概念/命题 → 可拍剧本 |
| `novel-review` | 小说理论评审 | 按理论诊断小说问题（人物/结构/结局/文笔四层扫描 + 天演评分 W 值） | 小说/章节/大纲 → 红黄牌问题清单 + 打分 |
| `video-prompt-adapter` | 表演层视频提示词 | 表演驱动的视频提示词（角色内在/表演心理学/微表演/否定约束） | 剧本/分镜 → 平台提示词 |

## 依赖关系

```
novel-review  ──引用──▶  novel-original-writing（frameworks/02/03/06：诊断标准）
novel-original-writing ──引用──▶ novel-to-screen-adaptation（templates：场景卡/剧本模板）
                          └──引用──▶ video-prompt-adapter（frameworks：表演层）
```

四个目录必须保持平级放置（引用为相对路径）。

## 理论出处

诊断与创作方法论出自作者自著内部理论（未出版）：

- 《人物篇》——私/处/执/为/已五字总纲、八受力点、五组问题清单、执四形态、万用能力矩阵
- 《命运篇》——麻雀世界观、十二节点/二十四节气验收句、失候清单、盆景七问、归藏
- 《文学天演论：人物、命运与余震》——余震理论（"结尾没有余震，便只是停止"）
- 《故事天演论》——神之公式（W 值评分）、低入口高经验、欲望八象、六变一常、类型场域、欲望分层、生长法、值得写

流程交互骨架借鉴 @山音 screenwriting-master（MIT，只借骨架）。

## 交互约定

- 导演模式：每阶段产出 → 样片摘要 → AskUserQuestion 选择框（通过/改:/自检/评审）→ `director-log.jsonl` 裁决日志（rationale 必填）
- 输出位置协议：产出不写入 skill 目录，开工时问输出位置（默认 `tasks/<项目名>-<YYYYMMDD>/`）

## 快速开始

```text
"把这个小说改编成剧本"      → novel-to-screen-adaptation
"用原创剧本流写个概念"       → novel-original-writing
"帮我看看这部小说问题出在哪"  → novel-review
"给我写个视频提示词"         → video-prompt-adapter
```
