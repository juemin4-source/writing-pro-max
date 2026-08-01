# 12 — Adaptation Quality Gate（最终锁）

## Purpose

这是 02 的最后一步。剧本在离开本节点之前，必须通过此 gate。

## Gate Format

每个检查项状态：`PASS` / `FAIL` / `WARN`

- FAIL = 必须修复，否则剧本不得离开 02
- WARN = 建议修复，但不阻塞

产出 `sign-off.json`。

---

## Gate Checklist

### 1. Format Gate

```
[ ] 场景标题格式正确（内/外 · 地点 · 时间）
[ ] 动作描述存在且占比 ≥ 40%
[ ] 每场有明确的功能（不解释也知道在发生什么）
[ ] 转场标记存在且合理
```

**FAIL if:** 动作占比 < 30% 或缺少场景标题。

### 2. POV Gate（如果源文本是第一人称）

```
[ ] 所有"我意识到/我感觉到/我明白"已替换为可见行动
[ ] 没有直接保留的内心独白
[ ] 视角锁定（观众只看主角能看到的信息）或明确切换
[ ] "我"的缺失不影响理解
```

**FAIL if:** 存在任何"她感到/她意识到/她记得"之类的不可拍描述。

### 3. Concept Gate（如果源文本有抽象核心概念）

```
[ ] 核心概念有至少一个视觉符号
[ ] 视觉符号不超过 3 个（否则稀释）
[ ] 没有用对白解释哲学概念
[ ] 概念通过画面/冲突/选择展示
```

**FAIL if:** 有用对白直接解释哲学概念的段落。

### 4. Dialogue Gate

```
[ ] 对白被压缩至少 30%（与小说对比）
[ ] 对白在执行动作（每句都有功能，不是闲聊）
[ ] 对白有潜台词（不直接说"我爱你"而是用行动和回避）
[ ] 每段对白不超过 3 句（过长则分割或压缩）
[ ] 没有解释性对白（"如你所知..."类）
```

**FAIL if:** 存在超过 5 句的连续对白没有动作打断。
**FAIL if:** 存在"如你所知"类解释性对白。

### 5. Structure Gate

```
[ ] 场景顺序与小说不同（证明戏剧化重组）
[ ] 每场有明确的目标/阻碍/冲突/变化
[ ] 不存在"既不是命题也不是反命题"的场景
[ ] 开场 hook 在前 30 秒内建立了"这是什么世界"
```

**WARN if:** 场景顺序与小说完全相同（机械改编信号）。

### 6. Action Gate

```
[ ] 动作描述是可拍的（可见、可听、可剪辑）
[ ] 没有"她感到..."类不可拍描述
[ ] 关键情感时刻有动作载体
[ ] 动作推进叙事（不只是"他走进来，坐下"）
```

**FAIL if:** 存在"她感到/她意识到"类描述。

### 7. Object Gate

```
[ ] 核心物件在前三场出现或建立伏笔
[ ] 物件不被浪费（如果某场引入重要物件，后续出现或发挥功能）
[ ] 没有"一次性道具"（每场出现, 从此消失）
```

### 8. Episode Gate

```
[ ] 剧集有明确的 function（不只是"第一章"）
[ ] 每集在高点结束，有 hook 或情感收束
[ ] 如果单集，有完整的三幕/多幕结构
```

---

## sign-off.json 格式

```json
{
  "gateVersion": "1.0",
  "timestamp": "2026-07-08T...",
  "sourceFile": "渊光代码 序幕+第一章",
  "targetFile": "给我看的/01_改编剧本.md",
  "checks": {
    "format": "PASS",
    "pov": "PASS",
    "concept": "WARN",
    "dialogue": "PASS",
    "structure": "PASS",
    "action": "PASS",
    "object": "WARN",
    "episode": "PASS"
  },
  "overall": "PASS_WITH_NOTES",
  "notes": [
    "概念视觉符号需要确认——'渊光'的流动代码是否够独特？",
    "物件系统较弱——怀表出现了，但没有在未来场景回收的计划"
  ],
  "blockers": [],
  "downstreamNotes": {
    "productionBreakdown": "S-1 需要特效预算（机械臂+电流）",
    "storyboardDirector": "S-1 的冷调用光需要参照 04 的 sci-fi 参考"
  }
}
```

## Hard Rules

1. **没有 sign-off.json → 剧本不得离开 02。** downstream 如果接收了没有 sign-off 的剧本，下游产出视为无效。
2. **如果 overall = FAIL → 自动退回 step 对应节点。** 见 gates.md 回退协议。
3. **WARN 不阻塞，但必须在 sign-off.json 的 notes 里记录。**
4. **sign-off.json 随剧本一起交给 03-production-breakdown。**
