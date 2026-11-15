param(
  [Parameter(Mandatory=$true)][ValidateSet('kokoro','xinference','rvc','dots','rvc-portable','index-cache')][string]$Backend,
  [ValidateSet('cpu','cu128')][string]$Device='cpu'
)
$ErrorActionPreference='Stop'
$ttsRuntimeRoot=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh/tts-runtimes'
New-Item -ItemType Directory -Path $ttsRuntimeRoot -Force | Out-Null
if($Backend -eq 'index-cache'){
  $indexPython=Join-Path $ttsRuntimeRoot 'uv-tools/xinference/Scripts/python.exe'
  if(-not(Test-Path -LiteralPath $indexPython)){throw 'Prepare Xinference first.'}
  & $indexPython (Join-Path $PSScriptRoot 'prepare-index-cache.py')
  if($LASTEXITCODE -ne 0){throw 'Index2.5 auxiliary cache preparation failed'}
  exit 0
}
if($Backend -eq 'rvc-portable'){
  $portablePython=Join-Path $ttsRuntimeRoot 'rvc/Scripts/python.exe'
  if(-not(Test-Path -LiteralPath $portablePython)){throw 'Prepare the RVC environment first.'}
  $portableOutput=Join-Path $ttsRuntimeRoot ('rvc-portable-'+[Guid]::NewGuid().ToString('N'))
  & $portablePython (Join-Path $PSScriptRoot 'package-rvc-runtime.py') --output $portableOutput
  if($LASTEXITCODE -ne 0){throw 'Portable runtime packaging failed'}
  Write-Output ('Portable RVC folder: '+$portableOutput)
  exit 0
}
if($Backend -eq 'kokoro'){
  if(-not(Get-Command npm -ErrorAction SilentlyContinue)){throw 'Install Node.js/npm first, then rerun this script.'}
  & npm install --prefix (Join-Path $ttsRuntimeRoot 'kokoro-js') --save-exact 'kokoro-js@1.2.1' --no-fund
  if($LASTEXITCODE -ne 0){throw 'Kokoro runtime installation failed'}
  Write-Output 'Kokoro runtime prepared. The model is downloaded only when you explicitly load it in the plugin.'
  exit 0
}
if(-not(Get-Command uv -ErrorAction SilentlyContinue)){throw 'Install uv from its official distribution first, then rerun this script.'}
if($Backend -in @('rvc','dots')){
  $neuralRoot=Join-Path $ttsRuntimeRoot $Backend
  $neuralPython=Join-Path $neuralRoot 'Scripts/python.exe'
  $neuralRunning=Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($neuralRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)}
  if($neuralRunning){throw 'Stop this managed neural runtime before preparing its environment.'}
  if(-not(Test-Path -LiteralPath $neuralPython)){
    & uv venv --python '3.12.13' $neuralRoot
    if($LASTEXITCODE -ne 0){throw 'Neural runtime environment creation failed'}
  }
  $neuralTorch=if($Backend -eq 'rvc'){'2.7.1'}else{'2.11.0'}
  & uv pip install --python $neuralPython --torch-backend $Device "torch==$neuralTorch" "torchaudio==$neuralTorch"
  if($LASTEXITCODE -ne 0){throw 'Neural runtime Torch installation failed'}
  if($Backend -eq 'rvc'){
    & uv pip install --python $neuralPython 'numpy==1.26.4' 'transformers==4.49.0' 'faiss-cpu==1.13.2' 'librosa==0.10.2.post1' 'soundfile==0.13.1' 'ffmpeg-python==0.2.0' 'av==15.1.0' 'praat-parselmouth==0.4.7' 'fastapi==0.121.3' 'uvicorn==0.38.0' 'torchcrepe==0.0.24' 'pyworld==0.3.5' 'einops==0.8.1' 'local-attention==1.11.2' 'setuptools<81'
    if($LASTEXITCODE -ne 0){throw 'RVC inference dependency installation failed'}
    & $neuralPython (Join-Path $PSScriptRoot 'prepare-rvc-assets.py') $neuralRoot
    if($LASTEXITCODE -ne 0){throw 'RVC source/assets preparation failed'}
  }else{
    # WeTextProcessing's optional normalizer requires pynini, which has no
    # native Windows wheel. Install the actual runtime without that optional
    # dependency; do not substitute a fake normalizer or require C++ globally.
    & uv pip install --python $neuralPython 'transformers==4.57.3' 'loguru' 'langcodes[data]' 'einops' 'librosa==0.11.0' 'soundfile==0.13.1' 'numpy==2.2.6' 'pydantic==2.12.5' 'PyYAML==6.0.3' 'safetensors>=0.8.0rc0' 'torchdiffeq' 'tqdm' 'lingua-language-detector' 'accelerate==1.12.0'
    if($LASTEXITCODE -ne 0){throw 'dots.tts inference dependency installation failed'}
    & uv pip install --python $neuralPython --no-deps 'dots.tts==0.3.1'
    if($LASTEXITCODE -ne 0){throw 'dots.tts runtime installation failed'}
    & $neuralPython (Join-Path $PSScriptRoot 'prepare-dots-windows.py')
    if($LASTEXITCODE -ne 0){throw 'dots.tts optional-normalizer compatibility preparation failed'}
  }
  & uv pip freeze --python $neuralPython | Set-Content -LiteralPath (Join-Path $neuralRoot 'environment-lock.txt') -Encoding UTF8
  @{backend=$Backend;device=$Device;python='3.12.13';torch=$neuralTorch} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $neuralRoot 'runtime-manifest.json') -Encoding UTF8
  Write-Output 'Isolated neural runtime prepared. Load a trusted voice/model explicitly to verify inference.'
  exit 0
}
$ttsRunning=Get-CimInstance Win32_Process -Filter "Name = 'xinference-local.exe'" | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($ttsRuntimeRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)}
if($ttsRunning){throw 'Stop this managed Xinference service before updating its isolated environment.'}
$env:UV_TOOL_DIR=Join-Path $ttsRuntimeRoot 'uv-tools'
$env:UV_TOOL_BIN_DIR=Join-Path $ttsRuntimeRoot 'bin'
& uv tool install --force --python '3.12.13' --torch-backend $Device --with 'torch==2.11.0' --with 'torchaudio==2.11.0' --with 'torchcodec @ https://files.pythonhosted.org/packages/f4/e4/0f2a356d6d08b1e2ece096288a02f2978806d077cac7a8340adf312b21ed/torchcodec-0.17.0-cp312-cp312-win_amd64.whl#sha256=0771bc114ff75a30f0ea8aa82cc7b259c518214eafe73fee2e606d745d77942b' 'xinference==4.1.0'
if($LASTEXITCODE -ne 0){throw 'Xinference runtime installation failed'}
$ttsCodecRoot=[IO.Path]::GetFullPath((Join-Path $ttsRuntimeRoot 'ffmpeg-shared'))
$ttsCodecZip=Join-Path $ttsCodecRoot 'source.zip'
$ttsCodecBundle=Join-Path $ttsCodecRoot 'ffmpeg-n9.0-latest-win64-lgpl-shared-9.0'
if(-not(Test-Path -LiteralPath (Join-Path $ttsCodecBundle 'bin/avcodec-63.dll'))){
  New-Item -ItemType Directory -Path $ttsCodecRoot -Force | Out-Null
  Invoke-WebRequest -Uri 'https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-win64-lgpl-shared-9.0.zip' -OutFile $ttsCodecZip
  $ttsDigest=(Get-FileHash -LiteralPath $ttsCodecZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if($ttsDigest -ne '17059ded875218b0251977abab6aea21adb6937bb4fd2130c81ada5c89f879d4'){throw 'FFmpeg archive differs from the reviewed build. Update the pinned manifest; do not extract it.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $ttsArchive=[IO.Compression.ZipFile]::OpenRead($ttsCodecZip)
  try{
    $ttsExpanded=0
    foreach($entry in $ttsArchive.Entries){
      $ttsTarget=[IO.Path]::GetFullPath((Join-Path $ttsCodecRoot $entry.FullName))
      if(-not $ttsTarget.StartsWith($ttsCodecRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe archive entry'}
      if((($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw 'Archive links are not allowed'}
      $ttsExpanded+=$entry.Length
    }
    if($ttsExpanded -gt 512MB){throw 'Archive exceeds expanded-size limit'}
  }finally{$ttsArchive.Dispose()}
  Expand-Archive -LiteralPath $ttsCodecZip -DestinationPath $ttsCodecRoot
}
& uv pip freeze --python (Join-Path $ttsRuntimeRoot 'uv-tools/xinference/Scripts/python.exe') | Set-Content -LiteralPath (Join-Path $ttsRuntimeRoot 'xinference-environment-lock.txt') -Encoding UTF8
@{xinference='4.1.0';python='3.12.13';torch='2.11.0';torchaudio='2.11.0';torchcodec='0.17.0';device=$Device} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $ttsRuntimeRoot 'runtime-manifest.json') -Encoding UTF8
Write-Output 'Xinference environment prepared. Start it from the plugin, complete local account setup, and then explicitly select/load a model. No model or account is created by this script.'
