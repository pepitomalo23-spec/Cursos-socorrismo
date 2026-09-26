#!/usr/bin/env bash
# Genera los fotogramas del recorrido por los módulos de la portada (js/recorrido.js)
# a partir de los cuatro vídeos de las escenas.
#
#   scripts/recorrido-fotogramas.sh [carpeta de vídeos] [versión]
#
# Por defecto usa fuentes/recorrido/1.mp4 … 4.mp4 (natación, prevención, rescate y
# primeros auxilios) y la versión v1. Al cambiar las escenas, usar una versión nueva
# (v2, v3…) y poner la misma en RUTA dentro de js/recorrido.js: los fotogramas se guardan
# en caché un año, así que la carpeta nueva evita que los navegadores sigan con los antiguos.
#
# Saca 40 fotogramas de cada vídeo, repartidos en los segundos que se usan de él (si cambia
# el número, actualizar FOTOGRAMAS en js/recorrido.js), y los guarda en AVIF (el que se usa)
# y WebP (respaldo), en 960 px (móviles) y 1440 px (pantallas grandes) de ancho. La calidad
# está ajustada para que todo el recorrido pese unos 3 MB en el móvil.
# Necesita ffmpeg (o FFMPEG=/ruta/a/ffmpeg) y Python con Pillow 11.3 o posterior.
set -euo pipefail

videos="${1:-fuentes/recorrido}"
version="${2:-v1}"
destino="assets/recorrido/$version"
ffmpeg="${FFMPEG:-ffmpeg}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Segundos de cada vídeo que se usan: el 3 se corta al zambullirse, antes de nadar.
duraciones=(5 5 2.5 5)
for escena in 1 2 3 4; do
  segundos="${duraciones[$((escena - 1))]}"
  "$ffmpeg" -hide_banner -loglevel error -t "$segundos" -i "$videos/$escena.mp4" \
    -vf "fps=40/$segundos" -frames:v 40 -pix_fmt rgb24 "$tmp/$escena-%03d.png"
done

mkdir -p "$destino/960" "$destino/1440"
python3 - "$tmp" "$destino" <<'PY'
import glob, os, sys
from PIL import Image
origen, destino = sys.argv[1:]
for ruta in sorted(glob.glob(os.path.join(origen, '*.png'))):
    imagen = Image.open(ruta).convert('RGB')
    base = os.path.basename(ruta)[:-4]
    for ancho in (960, 1440):
        alto = round(imagen.height * ancho / imagen.width / 2) * 2
        copia = imagen.resize((ancho, alto), Image.LANCZOS)
        copia.save(os.path.join(destino, str(ancho), base + '.avif'), quality=32, speed=6)
        copia.save(os.path.join(destino, str(ancho), base + '.webp'), quality=60, method=6)
PY

for ancho in 960 1440; do
  for formato in avif webp; do
    echo "$ancho px $formato: $(ls "$destino/$ancho"/*."$formato" | wc -l) fotogramas, $(du -ch "$destino/$ancho"/*."$formato" | tail -1 | cut -f1)"
  done
done
