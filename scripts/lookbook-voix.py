#!/usr/bin/env python3
"""Prépare la vidéo LookbookMannequins à partir de src/lookbook/mes-mannequins.json :
- découpe les gros plans des pièces dans les photos d'origine (public/mannequins/pieces/),
- génère la voix off, une phrase par fichier (public/mannequins/voix/),
- écrit la durée de chaque phrase dans src/lookbook/voix-durees.json.

Installation (une fois) : pip install piper-tts pillow
La voix française est téléchargée automatiquement au premier lancement.
Usage : python3 scripts/lookbook-voix.py
"""
import json
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/lookbook/mes-mannequins.json"
PUBLIC = ROOT / "public"
VOIX = PUBLIC / "mannequins/voix"
PIECES = PUBLIC / "mannequins/pieces"
MODEL_DIR = Path.home() / ".cache/piper"
MODEL = MODEL_DIR / "fr_FR-siwis-medium.onnx"
MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"


def ensure_model():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for suffix in ("", ".json"):
        target = Path(str(MODEL) + suffix)
        if not target.exists():
            print(f"Téléchargement de la voix : {target.name}")
            urllib.request.urlretrieve(MODEL_URL + suffix, target)


def speak(text, out):
    subprocess.run(
        [sys.executable, "-m", "piper", "-m", str(MODEL), "-f", str(out), "--length-scale", "0.92"],
        input=text.encode(),
        check=True,
        capture_output=True,
    )
    with wave.open(str(out)) as w:
        return round(w.getnframes() / w.getframerate(), 3)


def main():
    data = json.loads(DATA.read_text())
    VOIX.mkdir(parents=True, exist_ok=True)
    PIECES.mkdir(parents=True, exist_ok=True)
    ensure_model()

    lines = [data["hook"], data["outro"]]
    for look in data["looks"]:
        src = Image.open(PUBLIC / look["source"]).convert("RGB")
        for piece in look["pieces"]:
            src.crop(tuple(piece["crop"])).save(PIECES / f"{piece['id']}.jpg", quality=92)
        lines += [look["intro"], *look["pieces"], look["reveal"]]

    durees = {}
    for line in lines:
        durees[line["id"]] = speak(line["voice"], VOIX / f"{line['id']}.wav")
        print(f"{line['id']:>14} {durees[line['id']]:.2f} s  {line['voice']}")
    (ROOT / "src/lookbook/voix-durees.json").write_text(json.dumps(durees, indent=2) + "\n")


if __name__ == "__main__":
    main()
