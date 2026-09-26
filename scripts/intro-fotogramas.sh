#!/usr/bin/env bash
# Genera los fotogramas de la intro (js/intro.js) a partir del vídeo original.
#
#   scripts/intro-fotogramas.sh [vídeo] [versión]
#
# Por defecto usa fuentes/intro-original.mp4 y la versión v1. Al cambiar la animación,
# usar una versión nueva (v2, v3…) y poner la misma en RUTA dentro de js/intro.js:
# los fotogramas se guardan en caché un año, así que la carpeta nueva evita que los
# navegadores sigan enseñando los antiguos. Si el vídeo nuevo no tiene 121 fotogramas
# a 24 por segundo, actualizar también TOTAL y FPS en js/intro.js.
#
# Genera cada fotograma en AVIF (el que se usa; la mitad de peso) y en WebP (respaldo para
# navegadores sin AVIF), en 1080 px (móviles) y 1600 px (pantallas grandes) de ancho.
# Necesita ffmpeg (con libwebp) y Python con Pillow 11.3 o posterior (pip install pillow).
set -euo pipefail

video="${1:-fuentes/intro-original.mp4}"
version="${2:-v1}"
destino="assets/intro/fotogramas/$version"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

ffmpeg -hide_banner -loglevel error -i "$video" -pix_fmt rgb24 "$tmp/%03d.png"
for ancho in 1080 1600; do
  mkdir -p "$destino/$ancho"
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/%03d.png" -vf "scale=$ancho:-2" \
    -c:v libwebp -quality 72 -compression_level 6 -preset picture "$destino/$ancho/%03d.webp"
done
python3 - "$tmp" "$destino" <<'PY'
import glob, os, sys
from PIL import Image
origen, destino = sys.argv[1:]
for ruta in sorted(glob.glob(os.path.join(origen, '*.png'))):
    imagen = Image.open(ruta).convert('RGB')
    for ancho in (1080, 1600):
        alto = round(imagen.height * ancho / imagen.width / 2) * 2
        nombre = os.path.basename(ruta)[:-4] + '.avif'
        imagen.resize((ancho, alto), Image.LANCZOS).save(os.path.join(destino, str(ancho), nombre), quality=45, speed=6)
PY
# Imagen fija del final (se usa si los fotogramas no llegan a cargar).
ffmpeg -hide_banner -loglevel error -y -sseof -0.05 -i "$video" -frames:v 1 -q:v 3 -vf scale=1600:-2 assets/intro/poster.jpg

for ancho in 1080 1600; do
  for formato in avif webp; do
    echo "$ancho px $formato: $(ls "$destino/$ancho"/*."$formato" | wc -l) fotogramas, $(du -ch "$destino/$ancho"/*."$formato" | tail -1 | cut -f1)"
  done
done
