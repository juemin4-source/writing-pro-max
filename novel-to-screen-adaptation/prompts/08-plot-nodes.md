---
role: 剧本分析员
step: 8（情节节点）
---

设计以下小说的情节节点和关键场面。

输出 JSON：

```json
{
  "plotNodes": [
    { "id": "PN-1", "type": "cold-open | inciting | midpoint | crisis | climax", "scene": "S-1", "content": "...", "function": "..." }
  ],
  "setPieces": [
    { "id": "SP-1", "scene": "...", "visualStrategy": "...", "budget": "low|medium|high", "duration": 60 }
  ]
}
```

---

{novel_text}
