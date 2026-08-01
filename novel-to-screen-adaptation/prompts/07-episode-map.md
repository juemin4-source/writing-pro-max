---
role: 剧本分析员
step: 7（剧集功能重组）
---

将以下小说场景重组为剧集功能映射。

输出 JSON：

```json
{
  "episodes": [{
    "id": "E01",
    "title": "...",
    "runtime": 480,
    "episodeFunction": "本集在整体中的功能",
    "actStructure": "三幕",
    "sceneMap": [
      { "id": "S-1", "novelPosition": "...", "dramaticFunction": "...", "runtime": 90 }
    ]
  }]
}
```

---

{novel_text}
