"""Managed dots.tts / IndexTTS worker. IPC only; no public HTTP listener."""
import base64
import io
import json
import os
import pathlib
import random
import re
import sys
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

runtime = None
loaded = None

def load(spec):
    global runtime, loaded
    identity = json.dumps(spec, sort_keys=True)
    if loaded == identity:
        return
    import torch
    if spec["kind"] == "dots":
        model = spec["model"]
        if model.endswith("-stts"):
            from dots_tts.runtime_double_streaming import DotsTtsRuntimeDoubleStreaming as Runtime
        else:
            from dots_tts.runtime import DotsTtsRuntime as Runtime
        runtime = Runtime.from_pretrained(model, precision="bfloat16" if spec["device"].startswith("cuda") else "float32", optimize=False)
    else:
        # Import the host package before adding its thirdparty source root.
        # That root contains a vendored `mlx` namespace; importing xoscar
        # afterward would mistake it for an installed Apple MLX runtime.
        import xinference
        thirdparty = pathlib.Path(spec["thirdparty"])
        sys.path.insert(0, str(thirdparty))
        if spec["kind"] == "index2.5":
            from indextts.infer_v2_5 import IndexTTS2
            runtime = IndexTTS2(cfg_path=os.path.join(spec["model"], "config.yaml"), model_dir=spec["model"], device=spec["device"], use_bf16=spec["device"].startswith("cuda"), use_deepspeed=False, use_qwen_emo=True)
        else:
            from indextts.infer_v2 import IndexTTS2
            runtime = IndexTTS2(cfg_path=os.path.join(spec["model"], "config.yaml"), model_dir=spec["model"], device=spec["device"], use_fp16=spec["device"].startswith("cuda"), use_deepspeed=False)
    loaded = identity

def generate(command):
    import numpy as np
    import torch
    import soundfile as sf
    load(command["spec"])
    controls = dict(command.get("controls") or {})
    seed = controls.pop("seed", 42)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    spec = command["spec"]
    if spec["kind"] == "dots":
        if controls.get("normalize_text") and sys.platform == "win32":
            raise ValueError("Optional WeText/Pynini normalization is unavailable in this Windows runtime; use plugin text cleaning instead")
        if spec["model"].endswith("-stts"):
            session = runtime.start_double_streaming(prompt_audio_path=command.get("reference"), prompt_text=command.get("transcript") or None)
            chunks = []
            for token in runtime.model.tokenizer.encode(command["text"], add_special_tokens=False):
                chunk = session.push_text_token(token)
                if chunk is not None:
                    chunks.append(chunk.detach().cpu())
            for chunk in session.finish_text():
                chunks.append(chunk.detach().cpu())
            audio = torch.cat(chunks, dim=-1).float().squeeze().numpy()
            sample_rate = runtime.sample_rate
        else:
            result = runtime.generate(text=command["text"], prompt_audio_path=command.get("reference"), prompt_text=command.get("transcript") or None, **controls)
            audio = result["audio"].float().detach().cpu().squeeze().numpy()
            sample_rate = result["sample_rate"]
    else:
        if not command.get("reference"):
            raise ValueError("IndexTTS requires a speaker reference")
        if command.get("emotion_reference"):
            controls["emo_audio_prompt"] = command["emotion_reference"]
        if spec["kind"] == "index2.5":
            controls["lang"] = controls.pop("language", "ZH")
            controls["duration_factor"] = 1 / command.get("speed", 1)
        sample_rate, audio = runtime.infer(spk_audio_prompt=command["reference"], text=command["text"], output_path=None, **controls)
        if torch.is_tensor(audio):
            audio = audio.detach().cpu().numpy()
        audio = np.asarray(audio).squeeze()
    if audio.size == 0:
        raise ValueError("Model produced no audio samples")
    with io.BytesIO() as output:
        sf.write(output, audio, int(sample_rate), format="WAV", subtype="PCM_16")
        return {"audioBase64": base64.b64encode(output.getvalue()).decode("ascii"), "sampleRate": int(sample_rate)}

for line in sys.stdin:
    command = {}
    try:
        if len(line) > 1024 * 1024:
            raise ValueError("Worker request too large")
        command = json.loads(line)
        if command["action"] == "load":
            load(command["spec"])
            result = {"loaded": True}
        elif command["action"] == "synthesize":
            result = generate(command)
        else:
            raise ValueError("Unknown worker action")
        # Some SDK progress bars write without a trailing newline to stdout.
        # Frame IPC on a fresh line so completed inference is never discarded.
        print("\nDSH_TTS:" + json.dumps({"id": command["id"], "ok": True, **result}), flush=True)
    except Exception as error:
        if os.environ.get('DSH_TTS_DEBUG') == '1':
            import traceback
            traceback.print_exc(file=sys.stderr)
        message = re.sub(r"(?:Bearer\s+|hf_|sk[-_])[A-Za-z0-9._-]+", "[redacted]", str(error))[:1200]
        print("\nDSH_TTS:" + json.dumps({"id": locals().get("command", {}).get("id"), "ok": False, "error": message}), flush=True)
