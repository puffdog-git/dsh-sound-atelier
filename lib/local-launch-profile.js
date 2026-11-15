// Reviewed Windows/Torch 2.11 overrides for Xinference 4.1's older TorchCodec
// template. Keep the rest of each model's isolated requirements intact.
export function localLaunchProfile(name,platform=process.platform){
 if(platform!=='win32')return {}
 const common=['torch','torchaudio','torchcodec @ https://files.pythonhosted.org/packages/f4/e4/0f2a356d6d08b1e2ece096288a02f2978806d077cac7a8340adf312b21ed/torchcodec-0.17.0-cp312-cp312-win_amd64.whl#sha256=0771bc114ff75a30f0ea8aa82cc7b259c518214eafe73fee2e606d745d77942b','numpy']
 const deps={
  'CosyVoice2-0.5B':[],
  'IndexTTS2':['tiktoken==0.12.0','ffmpy==0.6.4','importlib-resources==6.5.2'],
  'IndexTTS-2.5':['tiktoken==0.12.0','ffmpy==0.6.4','importlib-resources==6.5.2'],
  'Breeze-TTS-2':['transformers==4.57.3','qwen-tts==0.1.1','soundfile>=0.13'],
  'FishAudio-S2-Pro':['transformers>=4.45.2,<=4.57.3','hydra-core>=1.3.2','omegaconf~=2.3.0','loguru>=0.6.0','natsort>=8.4.0','einops>=0.7.0','soundfile>=0.12','click','loralib>=0.1.2','pydantic>=2.9,<3','descript-audio-codec','descript-audiotools','safetensors>=0.5.2'],
  'Irodori-TTS-v4.1-Small':['argbind>=0.3.7','descript-audiotools>=0.7.2','einops','huggingface-hub>=0.34.0','peft>=0.18.0','protobuf==3.19.6','safetensors>=0.7.0','sentencepiece>=0.2.1,<0.3','soundfile>=0.12.0','tqdm==4.66.5','transformers>=5.12.1,<6']
 }
 return deps[name]?{virtual_env_packages:[...deps[name],...common]}:{}
}
