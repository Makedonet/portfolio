#!/usr/bin/env python3
"""Собирает файлы шрифтов сайта из вариативных исходников Google Fonts.

Запуск: python3 tools/fonts.py <папка с исходными .ttf>
Нужны fonttools и brotli: pip install fonttools brotli

Исходники: https://github.com/google/fonts/tree/main/ofl/sofiasans
           https://github.com/google/fonts/tree/main/ofl/sofiasansextracondensed

В файлах остаётся только то, что нужно сайту: русский и базовый латинский
алфавит, знаки, рубль, стрелки и насыщенности, которые есть в стилях. Набор шире
нынешних текстов, чтобы правка текста не роняла букву в запасной шрифт. Латиница
и кириллица в одном файле: цифры и пробелы всё равно живут в латинском диапазоне,
поэтому браузер при раздельных файлах качал бы оба.

Знака рубля и неразрывного дефиса в Sofia Sans нет: на сайте пишем «рублей».
"""

import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / "src/assets/fonts"

# (исходник, файл на выходе, насыщенности: мин, по умолчанию, макс)
FONTS = [
    ("SofiaSans[wght].ttf", "sofia-sans.woff2", (400, 400, 800)),
    ("SofiaSansExtraCondensed[wght].ttf", "sofia-sans-extra-condensed.woff2", (300, 400, 900)),
]

UNICODES = [
    *range(0x20, 0x7F),  # латиница, цифры, знаки
    *range(0x410, 0x450),  # русский алфавит
    0x401, 0x451,  # Ёё
    0x301,  # знак ударения
    0xA0, 0xA9, 0xAB, 0xB0, 0xB1, 0xB7, 0xBB, 0xD7,  # неразрывный пробел © « ° ± · » ×
    0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x201E,  # тире, кавычки
    0x2022, 0x2026, 0x2116, 0x2122, 0x2212, 0x2248,  # • … № ™ − ≈
    0x2190, 0x2191, 0x2192, 0x2193, 0x2197,  # стрелки
]

# Кернинг, лигатуры, сборка букв с ударением, табличные цифры (счётчики в кейсах).
FEATURES = ["kern", "liga", "ccmp", "locl", "mark", "mkmk", "tnum", "case"]


def build(source: Path, target: Path, weights: tuple[int, int, int]) -> None:
    font = TTFont(source)
    low, default, high = weights
    font = instancer.instantiateVariableFont(font, {"wght": (low, default, high)})

    options = subset.Options()
    options.layout_features = FEATURES
    options.hinting = False
    options.name_IDs = [1, 2, 3, 4, 5, 6, 13, 14]  # без лишних подписей, но с лицензией
    options.notdef_outline = True

    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)

    missing = sorted(set(UNICODES) - set(font.getBestCmap()))
    if missing:
        print(f"{target.name}: нет глифов {' '.join(f'U+{code:04X}' for code in missing)}")

    font.flavor = "woff2"
    buffer = BytesIO()
    font.save(buffer)
    target.write_bytes(buffer.getvalue())
    print(f"{target.name}: {len(buffer.getvalue()) / 1024:.1f} КБ, {len(font.getGlyphOrder())} глифов")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sources = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for source, target, weights in FONTS:
        build(sources / source, OUT / target, weights)


if __name__ == "__main__":
    main()
