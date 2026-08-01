# 00 — Director's Adaptation Brief
# 导演改编简章

## Purpose

在 02 开始之前，film-director 产出一份创作意图 brief。
这份 brief 是 02 的**必须输入**——没有它，head-writer 不得开始改编。

> head-writer 做转译执行，不做创作决策。
> 删不删、留不留、方向是什么——导演定。

---

## Brief Format

```yaml
directors_brief:
  project: 渊光代码
  source: 第一章

  ## 1. 为什么选这个故事
  why_this_story: |
    这个世界有一种独特的质感——科技非常先进，但人的日常和今天没有区别。
    保安机器人会用颜文字，小孩是人造人但仍然有妈妈。
    打动我的是这种"日常中的异样"。

  ## 2. 改编姿态
  adaptation_stance: faithful | extract | reconfigure | subvert
    # faithful    — 忠于原作精神和结构
    # extract     — 提取一条主线，舍弃副线
    # reconfigure — 重组结构，重新排列事件顺序
    # subvert     — 故意颠覆原作的价值判断

  adaptation_stance_reasoning: |
    faithful。
    第一章的结构本身就是从日常到冲突的线性推进，不需要重组。
    但 faithful 不是"照搬"，是"保留因果和情绪节奏"。

  ## 3. 不可触碰的核心
  untouchable_core:
    - 科技日常感——这个世界的高级感在于"高科技，低生活变化"
    - 南东君的第一人称视角——不是她的画外音，是镜头跟着她走
    - 父亲不是反派——他是真心想帮忙，不是疯狂科学家
    - 艾娃的脆弱感和美感同时存在——不是花瓶

  ## 4. 可以舍弃的部分
  cuttable:
    - 澡后浮现的殖民史联想——太长，打断节奏
    - 父亲的技术长篇大论——留核心概念即可
    - 王阿姨的重复道谢——一次就够了

  ## 5. 风格方向
  style_direction:
    visual_keywords:
      - 暖调日常 vs 冷调科技（父亲的诊所是冷暖交界）
      - 镜头跟着南东君走（第一人称的视觉等价）
      - 人脸特写多（情感锚定在人，不在世界观）
    rhythm: 开场慢→中段推→S-4最重→S-5松一口气→结尾安静
    dialogue_style: 自然主义，不解释世界观，不写说明文

  ## 6. 给 head-writer 的指示
  writer_instructions: |
    - 对白砍至少40%，尤其父亲的技术解释
    - 南东君的内心活动——优先用动作替代，找不到替代的问
    - 每场戏之前确认一下：这场戏在屏幕上有没有存在的必要
    - 翻译日志中 loss 超过三条要给我看

  ## 7. 导演对命题的理解
  directors_proposition: |
    当一个被设计来完美模拟人类情感的系统，自己先崩溃了——
    "人"的定义是不是该重写？

    这不是一个反乌托邦故事，是一个温暖的故事。
    绝望感要轻，希望感要在。
```

---

## 各字段说明

| 字段 | 解决 02 的什么问题 |
|------|------------------|
| `why_this_story` | 告诉 head-writer 导演被打动的是什么——这是判断取舍的底层标准 |
| `adaptation_stance` | 决定改编的**根本姿态**——忠实、提取、重构还是颠覆 |
| `untouchable_core` | 给 head-writer 一个安全网——这里面的不能删 |
| `cuttable` | 给 head-writer 一个清单——导演已经同意砍了 |
| `style_direction` | 不止给 head-writer，也给后面的 scene-director 和 prompt-producer |
| `writer_instructions` | 具体的、可执行的指令 |
| `directors_proposition` | 导演对这个故事在讲什么的判断——与 02 Phase 2 的命题呼应 |

---

## 使用流程

```
01 story-analyzer → manifest.json
    ↓
film-director 读小说 + 读 manifest → 产出 Director's Adaptation Brief
    ↓
assistant-director 将 brief 随任务一起派给 head-writer
    ↓
head-writer 验收 brief → 确认 untouchable_core 和 cuttable → 开始 02
    ↓
02 协议 Phase 0-10 在 brief 框架内执行
    ↓
head-writer 产出 sign-off.json + 剧本
    ↓
film-director 审查：这个剧本是否符合 brief？→ PASS / REWORK
```

---

## Hard Rules

1. **没有 Director's Adaptation Brief → 02 不得开始**
2. Brief 中的 `untouchable_core` 是硬边界——head-writer 不得跨过
3. head-writer 如果认为 brief 中的某个判断不成立 → 不是自己改，是向上返回给 director 重新决策
4. 审查时如果剧本违反 `untouchable_core` → 直接退回，不逐场修
