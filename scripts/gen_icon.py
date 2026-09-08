"""生成占位 icon.ico（蓝色方块，本项目自有身份资产，ADR-W9）。使用 PIL 保证格式合规。"""
import os

from PIL import Image, ImageDraw

os.makedirs("app/yohu-app/icons", exist_ok=True)
img = Image.new("RGBA", (256, 256), (47, 84, 235, 255))
d = ImageDraw.Draw(img)
# 简单文档图形：白色圆角矩形 + 折角
d.rounded_rectangle([64, 40, 192, 216], radius=12, fill=(255, 255, 255, 255))
d.polygon([(150, 40), (192, 82), (150, 82)], fill=(200, 210, 245, 255))
for y in range(104, 190, 18):
    d.line([(84, y), (172, y)], fill=(120, 140, 220, 255), width=8)

img.save("app/yohu-app/icons/icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (128, 128), (256, 256)])
print("ICON_OK")