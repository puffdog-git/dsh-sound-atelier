// Public model schemas checked against DeepInfra API pages, 2026-11-12. No runtime doc requests.
export const DEEPINFRA_SCHEMAS = {
  "hexgrad/Kokoro-82M": {
    "required": [
      "text"
    ],
    "properties": {
      "service_tier": {
        "enum": [
          "default",
          "priority",
          "flex"
        ],
        "type": "string"
      },
      "fail_fast": {
        "default": false,
        "type": "boolean"
      },
      "text": {
        "maxLength": 10000,
        "minLength": 1,
        "type": "string"
      },
      "output_format": {
        "default": "wav",
        "enum": [
          "mp3",
          "opus",
          "flac",
          "wav",
          "pcm"
        ],
        "type": "string"
      },
      "preset_voice": {
        "default": [
          "af_bella"
        ],
        "items": {
          "default": "af_bella",
          "description": "Select the desired voice for the speech output. You can select multiple to combine and mix voices.",
          "enum": [
            "af_alloy",
            "af_aoede",
            "af_bella",
            "af_heart",
            "af_jessica",
            "af_kore",
            "af_nicole",
            "af_nova",
            "af_river",
            "af_sarah",
            "af_sky",
            "am_adam",
            "am_echo",
            "am_eric",
            "am_fenrir",
            "am_liam",
            "am_michael",
            "am_onyx",
            "am_puck",
            "am_santa",
            "bf_alice",
            "bf_emma",
            "bf_isabella",
            "bf_lily",
            "bm_daniel",
            "bm_fable",
            "bm_george",
            "bm_lewis",
            "ef_dora",
            "em_alex",
            "em_santa",
            "ff_siwis",
            "hf_alpha",
            "hf_beta",
            "hm_omega",
            "hm_psi",
            "if_sara",
            "im_nicola",
            "jf_alpha",
            "jf_gongitsune",
            "jf_nezumi",
            "jf_tebukuro",
            "jm_kumo",
            "pf_dora",
            "pm_alex",
            "pm_santa",
            "zf_xiaobei",
            "zf_xiaoni",
            "zf_xiaoxiao",
            "zf_xiaoyi",
            "zm_yunjian",
            "zm_yunxi",
            "zm_yunxia",
            "zm_yunyang"
          ],
          "examples": [
            "af_alloy",
            "af_aoede"
          ],
          "title": "KokoroTtsVoice",
          "type": "string"
        },
        "minItems": 1,
        "type": "array"
      },
      "speed": {
        "maximum": 4,
        "minimum": 0.25,
        "type": "number"
      },
      "stream": {
        "default": false,
        "type": "boolean"
      },
      "return_timestamps": {
        "default": false,
        "type": "boolean"
      },
      "sample_rate": {
        "type": "integer"
      },
      "target_min_tokens": {
        "type": "integer"
      },
      "target_max_tokens": {
        "type": "integer"
      },
      "absolute_max_tokens": {
        "type": "integer"
      }
    }
  },
  "canopylabs/orpheus-3b-0.1-ft": {
    "required": [
      "input"
    ],
    "properties": {
      "service_tier": {
        "enum": [
          "default",
          "priority",
          "flex"
        ],
        "type": "string"
      },
      "fail_fast": {
        "default": false,
        "type": "boolean"
      },
      "input": {
        "maxLength": 300,
        "minLength": 1,
        "type": "string"
      },
      "voice": {
        "default": "tara",
        "enum": [
          "tara",
          "leah",
          "jess",
          "leo",
          "dan",
          "mia",
          "zac"
        ],
        "type": "string"
      },
      "response_format": {
        "default": "wav",
        "enum": [
          "mp3",
          "opus",
          "flac",
          "wav",
          "pcm"
        ],
        "type": "string"
      },
      "temperature": {
        "default": 0.4,
        "maximum": 2,
        "minimum": 0,
        "type": "number"
      },
      "top_p": {
        "default": 0.9,
        "maximum": 1,
        "minimum": 0,
        "type": "number"
      },
      "max_tokens": {
        "default": 2000,
        "exclusiveMinimum": 0,
        "maximum": 4096,
        "type": "integer"
      },
      "repetition_penalty": {
        "default": 1.1,
        "minimum": 0,
        "type": "number"
      },
      "stream": {
        "default": false,
        "type": "boolean"
      }
    }
  },
  "ResembleAI/chatterbox-turbo": {
    "required": [
      "text"
    ],
    "properties": {
      "service_tier": {
        "enum": [
          "default",
          "priority",
          "flex"
        ],
        "type": "string"
      },
      "fail_fast": {
        "default": false,
        "type": "boolean"
      },
      "text": {
        "maxLength": 5000,
        "minLength": 1,
        "type": "string"
      },
      "response_format": {
        "default": "wav",
        "enum": [
          "mp3",
          "opus",
          "flac",
          "wav",
          "pcm"
        ],
        "type": "string"
      },
      "voice_id": {
        "type": "string"
      },
      "language_id": {
        "type": "string"
      },
      "exaggeration": {
        "default": 0,
        "maximum": 1,
        "minimum": 0,
        "type": "number"
      },
      "cfg": {
        "default": 0,
        "maximum": 1,
        "minimum": 0,
        "type": "number"
      },
      "temperature": {
        "default": 0.8,
        "maximum": 2,
        "minimum": 0,
        "type": "number"
      },
      "seed": {
        "maximum": 2147483647,
        "minimum": 0,
        "type": "integer"
      },
      "top_p": {
        "default": 0.95,
        "maximum": 1,
        "minimum": 0,
        "type": "number"
      },
      "min_p": {
        "default": 0,
        "maximum": 1,
        "minimum": 0,
        "type": "number"
      },
      "repetition_penalty": {
        "default": 1.2,
        "maximum": 5,
        "minimum": 0,
        "type": "number"
      },
      "top_k": {
        "default": 1000,
        "maximum": 1000,
        "minimum": 0,
        "type": "integer"
      }
    }
  }
}
