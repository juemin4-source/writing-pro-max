# 09 — Scene Card

## Purpose

在写剧本正文前，必须先输出场景卡。每场戏一个卡片。

## Scene Card Fields

| Field | Required | Description |
|-------|----------|-------------|
| scene_id | ✅ | 场景唯一 ID |
| source_reference | ✅ | 源小说章节 + 行范围 |
| location | ✅ | 地点（要具体，不是"城市"是"3号检查站·黄昏"）|
| time | ✅ | 时间 |
| characters | ✅ | 出场人物 |
| visible_objective | ✅ | 主角在这场戏中想要什么（可见目标）|
| obstacle | ✅ | 谁/什么在阻止他 |
| conflict | ✅ | 冲突的实质是什么 |
| information_reveal | ✅ | 这场戏揭示什么新信息 |
| relationship_shift | | 关系变化（如果有）|
| screen_object | | 核心屏幕物件（如果有）|
| inner_info_externalized | ✅ | 哪些内心信息被外化为什么行动 |
| visual_strategy | ✅ | 镜头/光线/色调策略 |
| ending_state | ✅ | 场景结束时人物的状态变化 |
| removable | | 标记是否可删，如果可删，原因是什么 |

## Scene Types

| Type | Description | Must have |
|------|-------------|-----------|
| DRAMATIC | 冲突+变化 | objective, obstacle, conflict, shift |
| ATMOSPHERE | 建立氛围 | visual_strategy, mood |
| EXPOSITION | 传达世界观信息 | inner_info_externalized |
| FORESHADOW | 埋下伏笔 | screen_object |
| PAYOFF | 回收伏笔 | source_reference linking back |
| TRANSITION | 连接两个重要场景 | 尽量少用，控制在 1-2 行 |

## Hard Rules

1. 没有状态变化的场景必须标记类型并说明理由
2. 不得默认保留所有小说段落
3. 一场戏只做一件事

## Output Example

```json
{
  "scene_id": "s01-chase",
  "source_ref": "ch-03, lines 120-145",
  "location": "下层区·废弃地铁站·深夜",
  "time": "23:47",
  "characters": ["晨（C01）", "面具人（C03）"],
  "visible_objective": "晨要穿过地铁站追上目标",
  "obstacle": "面具人熟悉地形，不断设障",
  "conflict": "经验 vs 陌生环境",
  "information_reveal": "面具人对晨的行动模式了如指掌",
  "relationship_shift": null,
  "screen_object": "面具人遗落的徽章（上季标记 F01）",
  "inner_info_externalized": "晨的焦虑→急促的呼吸声，不断看时间",
  "visual_strategy": "手持镜头，快速跳切，Strobe 灯光效果",
  "ending_state": "晨追丢了目标，但获得了关键线索",
  "removable": false
}
```
