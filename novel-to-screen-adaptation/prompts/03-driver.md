---
role: 剧本分析员
step: 3（改编发动机）
---

分析以下小说的改编发动机和适合的影视形态。

输出 JSON：

```json
{
  "driverType": "concept-driven | character-driven | mystery-mechanism | ...",
  "secondaryDriver": "...",
  "primaryQuestions": ["观众想知道的问题1", "问题2", ...],
  "targetFormat": "episode | film | mini-series | short-drama",
  "episodeCount": 1,
  "episodeRuntime": 480,
  "reasoning": "为什么选择这个驱动"
}
```

---

{novel_text}
