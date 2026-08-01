# 00 — Budget & Scope Check

## Purpose

Before any adaptation work, assess whether the source text fits in context budget.

## Output

- 源文件数量
- 总行数 / 字数估算
- 章节数量
- 上下文是否能完整处理
- 建议处理模式

## Processing Modes

| Mode | When | What happens |
|------|------|-------------|
| SAMPLE | 只处理一个片段/场面 | 单场景 scene card + beat |
| ARC | 一个完整叙事弧 | 多集 episode map + scene cards |
| FULL | 完整小说改编 | 分批处理，每批 complete handoff |
| UPDATE | 基于已有 bible 更新 | 只修改变动的部分 |

## Hard Rule

如果源文本超过上下文安全预算（>200K tokens），必须进入分批索引模式，不得直接生成完整剧本。

## Output Template

```json
{
  "source_files": 1,
  "total_lines": 4500,
  "total_chars": 128000,
  "estimated_tokens": 32000,
  "chapter_count": 12,
  "fit_in_context": true,
  "recommended_mode": "FULL",
  "batch_suggestions": [
    { "batch": 1, "chapters": "1-4", "estimated_tokens": 10000 },
    { "batch": 2, "chapters": "5-8", "estimated_tokens": 11000 },
    { "batch": 3, "chapters": "9-12", "estimated_tokens": 11000 }
  ]
}
```
