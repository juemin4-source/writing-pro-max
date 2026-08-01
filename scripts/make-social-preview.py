# -*- coding: utf-8 -*-
"""生成 GitHub social preview 封面（1280x640 PNG），风格与 banner.svg 一致。"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
img = Image.new("RGB", (W, H), "#0d1117")
d = ImageDraw.Draw(img)

# 渐变背景：左上 #0d1117 → 右下 #1c2333
for y in range(H):
    t = y / H
    r = int(13 + (28 - 13) * t)
    g = int(17 + (35 - 17) * t)
    b = int(23 + (51 - 23) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# 装饰光晕
for cx, cy, rad, col in [(1120, 80, 220, (240, 201, 106)), (90, 560, 180, (74, 111, 165))]:
    for i in range(rad, 0, -4):
        alpha = int(6 * (1 - i / rad))
        d.ellipse([cx - i, cy - i, cx + i, cy + i], outline=col + (alpha,))

FONT = "C:/Windows/Fonts/msyh.ttc"
FONT_B = "C:/Windows/Fonts/msyhbd.ttc"

def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)

# 顶部小字
d.text((64, 56), "WRITING THEORY · CLAUDE CODE SKILLS", font=font(20), fill="#8b949e")

# 主标题
d.text((60, 110), "Writing Pro Max", font=font(76, bold=True), fill="#f0c96a")
d.text((64, 220), "用一套写作理论，把故事变成作品", font=font(36, bold=True), fill="#e6edf3")
d.text((64, 280), "概念 → 可拍剧本 · 小说 → 转译协议 · 成稿 → 理论诊断 · 剧本 → 表演指令",
       font=font(20), fill="#9da7b3")

# 四件套卡片
cards = [
    ("改编流", "小说 → 剧本转译协议"),
    ("原创剧本流", "概念 → 七阶段长成剧本"),
    ("小说理论评审", "四层扫描 + W 值打分"),
    ("表演层提示词", "演什么·怎么演·不演什么"),
]
x = 64
for title, sub in cards:
    d.rounded_rectangle([x, 340, x + 270, 430], radius=10, fill="#21262d", outline="#30363d")
    d.text((x + 20, 366), title, font=font(18, bold=True), fill="#f0c96a")
    d.text((x + 20, 396), sub, font=font(15), fill="#9da7b3")
    x += 294

# 作者行
d.text((W - 64, 580), "一羽老师 · 不盲目追逐热点，和你一起再深一点去看世界 · CC BY-NC 4.0",
       font=font(16), fill="#6e7681", anchor="rs")

img.save("social-preview.png", "PNG")
print("social-preview.png 已生成")
