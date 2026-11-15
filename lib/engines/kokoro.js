import { createKokoroRuntime } from './kokoro-runtime.js'
import { parsePcmWav } from '../providers/audio.js'

// Compatibility wrapper around the isolated, real inference worker.
export class KokoroEngine {
  constructor({root,runtime}={}) { this.runtime=runtime||createKokoroRuntime(root?{root}:{});this.sampleRate=24000 }
  isInstalled(){return this.runtime.status().packageInstalled}
  isRuntimeAvailable(){return this.runtime.status().runtimeAvailable}
  async synthesizeWav(text,voice='af_heart',options={}){return (await this.runtime.synthesize(text,{voice,...options})).audio}
  async *synthesize(text,voice='af_heart',options={}){yield parsePcmWav(await this.synthesizeWav(text,voice,options)).pcm}
  close(){this.runtime.stop()}
}
