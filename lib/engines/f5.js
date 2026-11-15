import { synthesizeLocalService,localServiceOperation } from '../providers/local-service.js'
import { localServiceKey } from '../local-credentials.js'

// F5 runs in its own Xinference environment; a health response is not proof
// that a reference recording can actually be used for inference.
export class F5Engine {
  constructor({cfg={},modelUid='F5-TTS',reference,fetchImpl=fetch,resolveKey}={}){Object.assign(this,{cfg:{...cfg,localTtsBackend:'xinference',localTtsFamily:'f5'},modelUid,reference,fetchImpl,resolveKey});this.verified=false}
  async ping(signal){signal=signal?AbortSignal.any([signal,AbortSignal.timeout(Number(this.cfg.timeoutMs)||60000)]):AbortSignal.timeout(Number(this.cfg.timeoutMs)||60000);try{const result=await localServiceOperation({cfg:this.cfg,action:'list',key:await localServiceKey(this.cfg,this.resolveKey),fetchImpl:this.fetchImpl,signal});return result.data?.some(m=>m.id===this.modelUid)||false}catch{return false}}
  isRuntimeAvailable(){return this.verified}
  async synthesize(text,{signal}={}){signal=signal?AbortSignal.any([signal,AbortSignal.timeout(Number(this.cfg.timeoutMs)||60000)]):AbortSignal.timeout(Number(this.cfg.timeoutMs)||60000);const out=await synthesizeLocalService({cfg:this.cfg,req:{text,models:{'local-tts':this.modelUid},role:'reply'},reference:this.reference,key:await localServiceKey(this.cfg,this.resolveKey),fetchImpl:this.fetchImpl,signal});this.verified=true;return out.audio}
}
