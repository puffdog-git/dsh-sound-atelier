# Third-party notices

This fork is maintained by puffdog-git (https://github.com/puffdog-git), based on @goodandready/dsh-tts 0.4.42 by GooDAnDReaDY (https://github.com/GooDAnDReaDY/dsh-tts). The upstream MIT license in LICENSE is retained. Changes for this fork are Copyright (c) 2026 puffdog-git, under MIT. The upstream repository is a source attribution, not the support or release location for this renamed fork.

The Edge native protocol in lib/edge-native.js is adapted from https://github.com/1624318455/dsh-plugin-tts (v0.7.2). The adapter adds bounded in-memory audio, cancellation, frame validation and direct voice discovery.

tools/rvc-server.py is derived from the same project (commit e8d1edd2, MIT), adapted for managed DSH runtimes with atomic model selection and untrimmed output. The license below covers both files. The source header of lib/edge-native.js names the npm package as @memef1f1y/dsh-plugin-tts.

MIT License

Copyright (c) 2026 dsh-plugin-tts contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


MiMo preset metadata and request contract are adapted from https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts (v5.2.2). The card layout and tuning studio are independently implemented; no character artwork or fonts are copied.

MIT License

Copyright (c) 2026 dsh-xiaomi-tts contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


The settings UI embeds OpenCC-JS 1.4.2 (MIT, Copyright (c) 2020-2021 The nk2028 Project, https://github.com/nk2028/opencc-js) in lib/client-src/02-opencc.vendor.js and the built lib/client.js. Its dictionary data derives from opencc-data (Apache-2.0, https://github.com/nk2028/opencc-data). Both license texts are reproduced in lib/UI-LOCALE-NOTICE.md.


Optional local runtimes are separately installed, not bundled: kokoro-js / Kokoro ONNX (Apache-2.0), Xinference (Apache-2.0), PyTorch and TorchCodec (their respective licenses), and the reviewed FFmpeg LGPL shared build. Preserve their installed license files. The F5-TTS checkpoint used for validation has CC-BY-NC-4.0 weights; its code license does not override that restriction. See LOCAL-RUNTIME.md for pinned sources and model revisions.


AnimaVN (JayziLi, MIT, commit 046970399d5083f9e745bf98c6408a07ca0b79ba) was reviewed for its Chinese/Japanese paired speech workflow. This implementation uses separate structured spoken text and does not incorporate its code, character assets or VN functionality. Source: https://github.com/JayziLi/AnimaVN
