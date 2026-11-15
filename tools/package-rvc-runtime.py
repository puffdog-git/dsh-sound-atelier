"""Build an offline, relocatable Windows RVC folder from the reviewed runtime.

Run with the prepared RVC Python. No speaker weights, credentials or user data
are included. Installed package/model licenses still apply to redistribution.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys

parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
args=parser.parse_args()
if sys.platform!='win32':
    raise SystemExit('This packer targets Windows x64; use an existing native RVC service on other systems')
source=Path(sys.prefix).resolve()
interpreter=Path(sys.base_prefix).resolve()
target=Path(args.output).resolve()
script=Path(__file__).resolve().parent/'rvc-server.py'
if source.name!='rvc' or not (source/'repo/infer').is_dir():
    raise SystemExit('Run with the plugin-prepared isolated RVC Python')
if target.exists() or target==Path(target.anchor) or any(target.is_relative_to(p) for p in (source,interpreter,script.parent)):
    raise SystemExit('Choose a new output folder outside the runtime, interpreter and plugin')
target.mkdir(parents=True)
ignore=shutil.ignore_patterns('__pycache__','*.pyc','.git','.cache')
shutil.copytree(interpreter,target/'runtime',ignore=ignore)
shutil.copytree(source/'Lib/site-packages',target/'runtime/Lib/site-packages',dirs_exist_ok=True,ignore=ignore)
shutil.copytree(source/'repo',target/'repo',ignore=ignore)
shutil.copy2(script,target/'rvc-server.py')
if (source/'environment-lock.txt').exists():
    shutil.copy2(source/'environment-lock.txt',target/'environment-lock.txt')
(target/'start-rvc.ps1').write_text("""param([ValidateSet('cpu','cuda:0')][string]$Device='cpu',[int]$Port=4892)
$ErrorActionPreference='Stop'
$env:PYTHONHOME=Join-Path $PSScriptRoot 'runtime'
& (Join-Path $PSScriptRoot 'runtime/python.exe') (Join-Path $PSScriptRoot 'rvc-server.py') --rvc-dir (Join-Path $PSScriptRoot 'repo') --device $Device --port $Port --fp32
exit $LASTEXITCODE
""",encoding='utf-8')
(target/'runtime-manifest.json').write_text(json.dumps({'schema':1,'platform':'win32-x64','python':sys.version.split()[0],'speakerModelsIncluded':False,'credentialsIncluded':False},indent=2),encoding='utf-8')
(target/'README.txt').write_text('Offline RVC runtime for Windows x64. Move the whole folder; run start-rvc.ps1. Select external RVC mode in DSH and import your trusted speaker .pth/.index separately. No user credentials or voice models are included. NVIDIA mode needs a compatible driver. Review Python, PyTorch, RVC and bundled model/package licenses before redistribution. This folder is executable software; use trusted sources only.\n',encoding='utf-8')
print('Portable RVC folder prepared; relocation still requires an inference smoke test.')
