import {localFamily} from './providers/local-service.js'
export function withSpokenLanguage(cfg,provider,model,voice){
 if(cfg._speechTarget!=='ja')return cfg
 const options=JSON.parse(cfg.providerOptions||'{}'),current={...options[provider]}
 const setOptions=value=>({...cfg,providerOptions:JSON.stringify({...options,[provider]:value})})
 if(provider==='kokoro'||provider==='f5')throw Error('這個獨立本機引擎未提供已驗證的日文推理；請選日文模型')
 if(provider==='edge'&&voice&&!/^ja-/i.test(voice)&&!/Multilingual/i.test(voice))throw Error('日文配音請選日文或多語 Edge 音色，例如 ja-JP-NanamiNeural')
 if(provider==='local-tts'){
  if(cfg.localTtsBackend==='gpt-sovits')return {...cfg,localTtsLanguage:'ja'}
  const family=cfg.localTtsBackend==='dots-native'?'dots':current.family||cfg.localTtsFamily||localFamily(model)
  if(['f5','index2','breeze','dots'].includes(family))throw Error('所選本機模型未提供已驗證的日文能力；請選 Qwen3、Index2.5、Irodori 或其他日文模型')
  if(family==='qwen3'||family==='index2.5')return setOptions({...current,native:{...current.native,language:family==='qwen3'?'japanese':'JA'}})
 }
 if(provider==='cartesia'){
  delete current.emotion
  return setOptions({...current,language:'ja'})
 }
 if(provider==='google-cloud')return setOptions({...current,language:'ja-JP'})
 return cfg
}
