#!/usr/bin/env bash
# Récupère les vidéos du dossier Google Drive « Vidéos pour extraits/montage vidéo jet »
# (partagé en lecture via le lien) dans public/footage/drive/, les convertit en
# 1080x1920 H.264 muet, et crée une planche d'aperçu par vidéo dans out/footage-sheets/
# pour repérer les plans (une image par seconde, horodatée).
set -euo pipefail
FOLDER_URL="https://drive.google.com/drive/folders/1PossD5zcYQhkrob_pTfaT4XktjorNi1L"
RAW=out/drive-raw
DEST=public/footage/drive
SHEETS=out/footage-sheets
mkdir -p "$RAW" "$DEST" "$SHEETS"
python3 -m pip install -q gdown==5.2.0 >/dev/null 2>&1 || true
python3 -m gdown --folder "$FOLDER_URL" -O "$RAW" --remaining-ok -q
shopt -s nullglob nocaseglob
for f in "$RAW"/*.{mp4,mov,m4v}; do
  name=$(basename "${f%.*}")
  out="$DEST/$name.mp4"
  if [ ! -s "$out" ]; then
    ffmpeg -v error -y -i "$f" -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
      -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "$out"
  fi
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
  ffmpeg -v error -y -i "$out" -vf "fps=1,scale=160:-1,drawtext=text='%{pts\:hms}':fontcolor=yellow:fontsize=14:x=4:y=4,tile=10x$(( (${dur%.*} + 10) / 10 ))" \
    -frames:v 1 "$SHEETS/$name.jpg"
  echo "$out  ${dur}s  aperçu: $SHEETS/$name.jpg"
done
