"""Repair the known partially-created BigVGAN cache without deleting weights."""
from pathlib import Path
import hashlib
import os
import urllib.request
root=Path.home()/'.dsh/tts-xinference/cache/v2/IndexTTS-2_5/hf_cache/bigvgan'
root.mkdir(parents=True,exist_ok=True)
target=root/'bigvgan_generator.pt'
digest='e95ba25972d3de0628d99cd156e9315a9c018899bf739988959ebe3544080ced'
def valid(p):
    return p.is_file() and hashlib.file_digest(p.open('rb'),'sha256').hexdigest()==digest
if not valid(target):
    temporary=target.with_suffix('.download')
    try:
        urllib.request.urlretrieve('https://huggingface.co/nvidia/bigvgan_v2_22khz_80band_256x/resolve/633ff708ed5b74903e86ff1298cf4a98e921c513/bigvgan_generator.pt',temporary)
        if not valid(temporary):
            raise RuntimeError('BigVGAN file differs from the pinned artifact')
        os.replace(temporary,target)
    finally:
        temporary.unlink(missing_ok=True)
print('Index2.5 auxiliary weights verified; no trained voice or account was modified')
