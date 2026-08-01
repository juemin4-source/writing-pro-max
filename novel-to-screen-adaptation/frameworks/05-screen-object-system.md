# 05 — Screen Object System

## Purpose

小说中的心理、主题、关系、记忆、阴谋、人物状态，必须绑定到可见物件、动作、空间或声音上。

## Object Table Fields

| Field | Description |
|-------|-------------|
| object_id | 唯一ID |
| object_name | 物件名称 |
| source_function | 在小说中的功能 |
| screen_function | 屏幕上的功能 |
| first_appearance | 首次出现位置 |
| escalation | 物件含义如何升级 |
| payoff | 最终回收方式 |
| downstream_use | 下游技能是否需要（生图/分镜/道具）|

## Object Types

| Type | Example |
|------|---------|
| 道具 | 日记本、药片、伤口、照片、武器、面具 |
| 服装 | 外衣颜色变化、制服、标志物 |
| 空间 | 门、窗、走廊、特定房间 |
| 自然 | 天气、时间、季节、光线 |
| 声音 | 录音、特定旋律、环境声、沉默 |
| 动作 | 习惯性手势、特定步态、重复动作 |

## Hard Rules

1. 重要心理信息必须找到屏幕载体
2. 不能只让角色用台词解释自己内心
3. 每件物件必须有 first_appearance 和 payoff
