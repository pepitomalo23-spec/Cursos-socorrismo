#!/usr/bin/env bash
# Genera los fotogramas del recorrido por los módulos de la portada (js/recorrido.js)
# a partir de los cuatro vídeos de las escenas.
#
#   scripts/recorrido-fotogramas.sh [carpeta de vídeos] [versión]
#
# Por defecto usa fuentes/recorrido/1.mp4 … 4.mp4 (natación, prevención, rescate y
# primeros auxilios; son los vídeos originales, sin recomprimir) y la versión v4. Al cambiar
# las escenas, usar una versión nueva (v5, v6…) y poner la misma en RUTA dentro de
# js/recorrido.js: los fotogramas se guardan en caché un año, así que la carpeta nueva evita
# que los navegadores sigan con los antiguos.
#
# Saca 10 fotogramas por segundo de cada vídeo (a la velocidad a la que se reproducen, con la
# mezcla entre dos, se ve fluido) y los guarda en AVIF (el que se usa) y WebP (respaldo), a la
# resolución del vídeo (1912 px de ancho) y a 1280 px (solo con datos lentos o ahorro de
# datos), con calidad alta: prácticamente igual que el vídeo. Si cambian los segundos o los
# fotogramas, actualizar FOTOGRAMAS en js/recorrido.js.
# Necesita ffmpeg (o FFMPEG=/ruta/a/ffmpeg) y Python con Pillow 11.3 o posterior.
set -euo pipefail

videos="${1:-fuentes/recorrido}"
version="${2:-v4}"
destino="assets/recorrido/$version"
ffmpeg="${FFMPEG:-ffmpeg}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Segundos de cada vídeo que se usan: de la natación solo el principio (se hacía larga) y el
# rescate se corta al zambullirse, antes de nadar. A 10 fotogramas por segundo.
duraciones=(3.5 5 2.5 5)
fotogramas=(35 50 25 50)
for escena in 1 2 3 4; do
  i=$((escena - 1))
  "$ffmpeg" -hide_banner -loglevel error -t "${duraciones[$i]}" -i "$videos/$escena.mp4" \
    -vf fps=10 -frames:v "${fotogramas[$i]}" -pix_fmt rgb24 "$tmp/$escena-%03d.png"
done

mkdir -p "$destino/1912" "$destino/1280"
python3 - "$tmp" "$destino" <<'PY'
import glob, os, sys
from PIL import Image
origen, destino = sys.argv[1:]
for ruta in sorted(glob.glob(os.path.join(origen, '*.png'))):
    imagen = Image.open(ruta).convert('RGB')
    base = os.path.basename(ruta)[:-4]
    for ancho, calidad in ((1912, 65), (1280, 65)):
        alto = round(imagen.height * ancho / imagen.width / 2) * 2
        copia = imagen if imagen.width == ancho else imagen.resize((ancho, alto), Image.LANCZOS)
        copia.save(os.path.join(destino, str(ancho), base + '.avif'), quality=calidad, speed=4)
        copia.save(os.path.join(destino, str(ancho), base + '.webp'), quality=85, method=6)
PY

for ancho in 1912 1280; do
  for formato in avif webp; do
    echo "$ancho px $formato: $(ls "$destino/$ancho"/*."$formato" | wc -l) fotogramas, $(du -ch "$destino/$ancho"/*."$formato" | tail -1 | cut -f1)"
  done
done
