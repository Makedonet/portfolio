# Портреты для визитки на первом экране: вырезает фон, подрезает и
# увеличивает под экраны с плотностью 2x. Запускается руками и редко — когда
# меняются фото, поэтому rembg с его моделями не входит в зависимости проекта:
#
#   python3 -m venv .venv-avatar
#   .venv-avatar/bin/pip install "rembg[cpu]" pillow
#   .venv-avatar/bin/python tools/avatar.py лицо.jpg горы.jpg
#   node tools/halftone.mjs        # полутоновая «печать» из нового портрета
#
# Лицо (первое фото) вырезается моделью isnet-general-use с альфа-маттингом:
# у кепки и бороды нет голубого ореола от неба, а белая футболка в вороте
# не просвечивает. Второе фото идёт на оборот визитки как есть, с фоном гор.
import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import new_session, remove

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "avatar"
# Ширина портрета на визитке — до 360 px; вдвое больше — для экранов 2x.
FACE_WIDTH = 720


def face(src: Path) -> None:
    image = Image.open(src).convert("RGB")
    cut = remove(
        image,
        session=new_session("isnet-general-use"),
        alpha_matting=True,
        alpha_matting_foreground_threshold=235,
        alpha_matting_background_threshold=20,
        alpha_matting_erode_size=8,
    )
    # Подрезаем по человеку, низ оставляем как есть: фигура уходит за край кадра.
    left, top, right, _ = cut.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = 12
    cut = cut.crop((max(left - pad, 0), max(top - pad, 0), min(right + pad, cut.width), cut.height))
    height = round(cut.height * FACE_WIDTH / cut.width)
    cut = cut.resize((FACE_WIDTH, height), Image.LANCZOS)
    rgb = cut.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    rgb.putalpha(cut.getchannel("A"))
    rgb.save(OUT / "face.png", optimize=True)
    print("face.png", rgb.size)
    # Голова крупно — для кружков-аватарок: квадрат вокруг лица и кепки.
    alpha = rgb.getchannel("A")
    left, top, right, _ = alpha.crop((0, 0, rgb.width, round(rgb.height * 0.55))).point(lambda a: 255 if a > 8 else 0).getbbox()
    size = round(rgb.width * 0.6)
    cx = right - size // 2 + 10
    head = rgb.crop((cx - size // 2, max(top - 10, 0), cx + size // 2, max(top - 10, 0) + size))
    head.resize((320, 320), Image.LANCZOS).save(OUT / "head.png", optimize=True)
    print("head.png", head.size)


def mountains(src: Path) -> None:
    image = Image.open(src).convert("RGB")
    image.save(OUT / "mountains.jpg", quality=92)
    print("mountains.jpg", image.size)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    face(Path(sys.argv[1]))
    mountains(Path(sys.argv[2]))
