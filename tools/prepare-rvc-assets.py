"""Prepare only the reviewed RVC source and required inference assets.
No user voice model, code from a voice pack, or installer from a registry runs.
"""
import hashlib
import os
import pathlib
import shutil
import sys
import urllib.request
import zipfile

root = pathlib.Path(sys.argv[1]).resolve()
root.mkdir(parents=True, exist_ok=True)
commit = "81eed5e8f68b6bed1789f682fe78cdd324495afc"
revision = "e6d0c1a17da07c33557852f9dfa2bd44cc75737d"

def download(url, dest, digest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == digest:
        return
    temp = dest.with_suffix(dest.suffix + ".part")
    try:
        with urllib.request.urlopen(url, timeout=60) as source, open(temp, "wb") as sink:
            shutil.copyfileobj(source, sink, 1024 * 1024)
        if hashlib.sha256(temp.read_bytes()).hexdigest() != digest:
            raise RuntimeError("Reviewed RVC artifact digest changed")
        temp.replace(dest)
    finally:
        temp.unlink(missing_ok=True)

archive = root / "reviewed-source.zip"
download("https://codeload.github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI/zip/" + commit, archive,
         "c0427564fbeb584d1a4805a5e71b5897132a41b9029a0fa9f417497a6df13e43")
repo = root / "repo"
if not (repo / "infer/vc/modules.py").is_file():
    temp_root = root / "source-staging"
    temp_root.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as source:
        if sum(e.file_size for e in source.infolist()) > 128 * 1024 * 1024:
            raise RuntimeError("Source archive too large")
        for entry in source.infolist():
            target = (temp_root / entry.filename).resolve()
            if not target.is_relative_to(temp_root) or ((entry.external_attr >> 16) & 0xF000) == 0xA000:
                raise RuntimeError("Unsafe source archive entry")
        source.extractall(temp_root)
    shutil.move(str(temp_root / ("Retrieval-based-Voice-Conversion-WebUI-" + commit)), str(repo))
    temp_root.rmdir()
assets = {
    "hubert_base/config.json": "0346950779dfb7f9316fa74ed846e2b8a22a08eedfdc5387b73f327cb1a4a7cf",
    "hubert_base/preprocessor_config.json": "7c1976a680fb7acc757cd36fb08eef878fa36c70b4c9d2d595df9c608bbbbf0e",
    "hubert_base/pytorch_model.bin": "cc8c20f4b90a520757260197a3ff2505705a7adbd20ad9eeaa4e1a9b38442ef5",
    "rmvpe.pt": "6d62215f4306e3ca278246188607209f09af3dc77ed4232efdd069798c4ec193",
}
for filename, digest in assets.items():
    destination = repo / "assets" / ("rmvpe/rmvpe.pt" if filename == "rmvpe.pt" else filename)
    download("https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/" + revision + "/" + filename, destination, digest)
print("Reviewed RVC inference assets prepared; no custom voice model installed.")
