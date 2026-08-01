# 02 — Narrative Function Parsing

## Purpose

对每段小说做叙事功能解析，而不是摘要。

每段必须回答：这一段在故事里真正完成了什么？

## Function Categories

| Function | Definition | Example |
|----------|-----------|---------|
| INCITING | 触发主角行动的事件 | 一封信 / 一次袭击 |
| REVEAL | 揭示新信息 | 身份揭露 / 计划曝光 |
| TURN | 人物立场/目标转变 | 从逃避转为面对 |
| RELATIONSHIP_SHIFT | 关系发生变化 | 从信任转为怀疑 |
| THEME_TEST | 主题被测试 | 选择利益还是正义 |
| FORESHADOW | 埋下伏笔 | 反复出现的物件 |
| PAYOFF | 回收伏笔 | 伏笔揭示真相关联 |
| POWER_SHIFT | 权力关系变化 | 弱势方获得筹码 |
| PRESSURE | 增加叙事压力 | 倒计时 / 赌注升级 |
| RELEASE | 释放紧张 | 幽默时刻 / 情感宣泄 |
| EXPOSITION | 说明背景（谨慎使用） | 世界观规则说明 |
| ATMOSPHERE | 建立氛围 | 环境描写 / 情绪铺垫 |

## Output Format

```json
{
  "chapter_id": "ch-03",
  "source_range": "120-145",
  "segments": [
    {
      "segment_id": "ch-03-a",
      "function": "REVEAL",
      "content": "发现照片背面有字",
      "character_shift": "晨从被动接受转为主动调查",
      "information_change": "照片中的地点不是随机选择",
      "can_delete": false,
      "screen_translation_hint": "特写照片背面，指尖划过字迹"
    }
  ]
}
```

## Hard Rules

1. 每章至少一个 function 变化
2. 没有叙事功能的段落标记为 `removable`
3. EXPOSITION 必须有 screen_translation_hint
