import { pollyOperation } from './providers/polly.js'
import { boundedJson } from './providers/native-http.js'

const id = value => { if(typeof value!=='string'||!value||value.length>200||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid resource ID');return value }
export async function providerOperation({provider,action,input={},cfg,key,signal,fetchImpl=fetch,pollyClientFactory}){
 if(typeof action!=='string'||!input||Array.isArray(input)||typeof input!=='object')throw Error('Invalid provider operation')
 if(provider==='polly')return pollyOperation({action,input,cfg,key,signal,pollyClientFactory})
 if(provider!=='inworld')throw Error('This provider has no implemented dictionary/job operation')
 let path,method='GET',body
 if(action==='async-start'||action==='batch-start'){
  const prepare=value=>{
   if(!value||typeof value.text!=='string'||!value.text.trim()||value.text.length>100000)throw Error('Inworld async text is required and limited to 100000 characters')
   const voice=value.voice||cfg.chain?.[0]?.voice||'Ashley',model=cfg.chain?.[0]?.model||'inworld-tts-2'
   return {text:value.text,voiceId:voice,modelId:model,audioConfig:{audioEncoding:'MP3'},...(value.timestamps?{timestampType:'WORD'}:{})}
  }
  method='POST'
  if(action==='async-start'){path='/tts/v1/voice:synthesizeAsync';body=prepare(input)}
  else{if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw Error('Inworld batch requires 1–100 requests');path='/tts/v1/voice:synthesizeBatch';body={items:input.items.map((v,i)=>({customId:String(v.id||i),request:prepare(v)}))}}
 }
 if(action==='operation-get'){
  if(!/^tts(?:Async|Batch)Jobs\/[A-Za-z0-9_-]+\/operations\/[A-Za-z0-9_-]+$/.test(input.name||''))throw Error('Invalid Inworld operation name')
  path='/lro/v1alpha/'+input.name
 }
 if(action==='operation-list')path='/lro/v1alpha/'+(input.batch?'ttsBatchJobs':'ttsAsyncJobs')+'/'+id(input.id)+'/operations'
 if(action.startsWith('dictionary-')){
  path='/pronunciations/v1/workspaces/'+id(input.workspace)+'/pronunciationDictionaries'
  if(action!=='dictionary-list'&&action!=='dictionary-create')path+='/'+id(input.id)
  if(action==='dictionary-create'||action==='dictionary-update'){
   if(typeof input.displayName!=='string'||!input.displayName.trim()||Array.from(input.displayName).length>64||!Array.isArray(input.pronunciations)||input.pronunciations.length>1000)throw Error('Invalid Inworld dictionary content')
   body={displayName:input.displayName,pronunciations:input.pronunciations.map(e=>{if(typeof e.displayHeadword!=='string'||!e.displayHeadword.trim()||!/^[a-z]{2,3}-[A-Z]{2}$/.test(e.languageCode||'')||!Array.isArray(e.phoneSymbols)||!e.phoneSymbols.length||e.phoneSymbols.some(p=>typeof p!=='string'||!p||Array.from(p).length>16))throw Error('Invalid dictionary pronunciation');return {displayHeadword:e.displayHeadword,languageCode:e.languageCode,phoneSymbols:e.phoneSymbols}})}
   method=action==='dictionary-create'?'POST':'PATCH'
   if(method==='PATCH'){if(typeof input.etag!=='string'||!input.etag||input.etag.length>500)throw Error('Current dictionary etag is required');body.etag=input.etag;path+='?updateMask=displayName,pronunciations'}
  }else if(action==='dictionary-delete'){if(typeof input.etag!=='string'||!input.etag||input.etag.length>500)throw Error('Current dictionary etag is required');method='DELETE';path+='?etag='+encodeURIComponent(input.etag)}
  else if(!['dictionary-list','dictionary-get'].includes(action))throw Error('Unsupported dictionary operation')
 }
 if(!path)throw Error('Unsupported Inworld operation')
 const response=await fetchImpl('https://api.inworld.ai'+path,{method,headers:{authorization:'Basic '+key,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal,redirect:'error'})
 if(response.status===204)return {}
 const result=await boundedJson('Inworld',response,signal,8*1024*1024)
 if(result.error)throw Error('Inworld operation failed')
 return result
}
