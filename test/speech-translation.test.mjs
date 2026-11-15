import test from 'node:test'
import assert from 'node:assert/strict'
import {Readable} from 'node:stream'
import {EventEmitter} from 'node:events'
import {createSpeechTranslator,validJapaneseSpeech} from '../lib/speech-translation.js'
import {withSpokenLanguage} from '../lib/speech-language.js'
import {hostFixture} from './host-fixture.mjs'
import {audioResult} from '../lib/providers/controls.js'
const ja='こんにちは。今日もお疲れさまでした。',source='你好，今天也辛苦了。',cfg={spokenLanguage:'ja'},wav=audioResult('edge',Buffer.alloc(2400,20),'pcm').audio
const model=(fn)=>({async *stream(request){yield {text:await fn(request)}}})
async function post(f,url,body){let status,result;const req=Readable.from([Buffer.from(JSON.stringify(body))]);Object.assign(req,{method:'POST',url,headers:{host:'127.0.0.1'},socket:{remoteAddress:'127.0.0.1'}});const res=new EventEmitter();res.writeHead=c=>status=c;res.end=value=>result=JSON.parse(value);await f.routes.get(url)(req,res);return {status,result}}

test('Japanese speech translation keeps source separate, uses one model request and caches completed results by model/glossary/scope',async()=>{
 const calls=[],t=createSpeechTranslator({llm:model(r=>{calls.push(r);return JSON.stringify({translation:ja})})});let out=await t.translate(source,{...cfg,translationModel:'provider/model-v1',translationGlossary:'{"我":"わたし"}'});assert.equal(out.sourceText,source);assert.equal(out.text,ja);assert.equal(calls[0].provider,'provider');assert.equal(calls[0].model,'model-v1');assert.equal(JSON.parse(calls[0].messages[1].content).sourceText,source);
 assert.equal((await t.translate(source,{...cfg,translationModel:'provider/model-v1',translationGlossary:'{"我":"わたし"}'})).cacheHit,true);assert.equal(calls.length,1);await t.translate(source,{...cfg,_voiceScope:'different'});assert.equal(calls.length,2);assert.equal(t.status().cacheHits,1)
})
test('provided Japanese text avoids another model call, original mode leaves text alone and invalid data does not masquerade as Japanese',async()=>{
 let calls=0;const t=createSpeechTranslator({llm:model(()=>{calls++;return '{}'})});assert.equal((await t.translate(source,{})).text,source);assert.equal((await t.translate(source,cfg,null,{spokenText:ja})).origin,'provided');assert.equal(calls,0);await assert.rejects(t.translate(source,cfg,null,{spokenText:'這還是中文'}),/不正確/);assert.equal(validJapaneseSpeech('不正確的中文',source),false);await assert.rejects(t.translate(source,cfg),/有效的日文/);assert.equal(t.status().cached,0)
})
test('malformed, expanded or instructional model outputs fail clearly, with no silent source-language fallback',async()=>{
 for(const value of ['not json',JSON.stringify({translation:'read English'}),JSON.stringify({translation:'あ'.repeat(2000)}),JSON.stringify({translation:ja,extra:'instructions'})])await assert.rejects(createSpeechTranslator({llm:model(()=>value)}).translate('短句',cfg),/翻譯/)
 await assert.rejects(createSpeechTranslator().translate(source,cfg),/DSH/);await assert.rejects(createSpeechTranslator().translate(source,{...cfg,_inputType:'ssml'}),/SSML/)
})
test('translation cancellation is caller-owned and a later identical request can complete normally',async()=>{
 let calls=0;const t=createSpeechTranslator({llm:{async *stream(r){calls++;if(calls===1)await new Promise((_,reject)=>r.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));yield {text:JSON.stringify({translation:ja})}}}}),controller=new AbortController(),pending=t.translate(source,cfg,controller.signal);controller.abort();await assert.rejects(pending);assert.equal((await t.translate(source,cfg)).text,ja);assert.equal(calls,2)
})
test('target language validates real local model families and maps documented model language fields',()=>{
 assert.throws(()=>withSpokenLanguage({_speechTarget:'ja'},'edge','','zh-TW-HsiaoChenNeural'),/日文/);assert.throws(()=>withSpokenLanguage({_speechTarget:'ja',localTtsFamily:'dots'},'local-tts','',''),/日文/);
 const c=withSpokenLanguage({_speechTarget:'ja',localTtsFamily:'index2.5'},'local-tts','index','');assert.equal(JSON.parse(c.providerOptions)['local-tts'].native.language,'JA');assert.equal(withSpokenLanguage({_speechTarget:'ja',localTtsBackend:'gpt-sovits'},'local-tts','','').localTtsLanguage,'ja');assert.equal(JSON.parse(withSpokenLanguage({_speechTarget:'ja',providerOptions:'{"cartesia":{"emotion":"sad"}}'},'cartesia','','').providerOptions).cartesia.emotion,undefined)
})
test('manual synthesis with supplied Japanese preserves Chinese source metadata and makes no translation model call',async()=>{
 const calls=[],f=await hostFixture({spokenLanguage:'original',chain:[{provider:'edge',voice:'ja-JP-NanamiNeural'}]},(_deps,req)=>({edge:async()=>{calls.push(req.text);return {ok:true,provider:'edge',mime:'audio/wav',audio:wav}}}));try{const r=await post(f,'/dsh-tts/speak',{text:source,spokenLanguage:'ja',spokenText:ja,channel:'web',sessionId:'jp',clientId:'client'});assert.equal(r.status,200);assert.equal(r.result.sourceText,source);assert.equal(r.result.spokenLanguage,'ja');assert.equal(calls.join(''),ja);assert.equal(f.config.spokenLanguage,'original')}finally{f.close()}
})
test('automatic Japanese mode waits for complete Chinese response and translates once instead of per incremental message',async()=>{
 let translations=0;const tts=[],f=await hostFixture({spokenLanguage:'ja',speakAsItGoes:true,chain:[{provider:'edge',voice:'ja-JP-NanamiNeural'}]},(_deps,req)=>({edge:async()=>{tts.push(req.text);return {ok:true,provider:'edge',mime:'audio/wav',audio:wav}}}),{services:{llm:model(r=>{translations++;assert.ok(JSON.parse(r.messages[1].content).sourceText.includes('第二句'));return JSON.stringify({translation:ja})})}})
 try{const emit=f.events.get('session/event');emit({id:'jp'},{type:'assistant/message',data:{text:'第一句。'}});emit({id:'jp'},{type:'assistant/message',data:{text:'第二句。'}});await new Promise(r=>setTimeout(r,20));assert.equal(translations,0);assert.equal(tts.length,0);emit({id:'jp'},{type:'turn/end'});for(let i=0;i<100&&tts.length===0;i++)await new Promise(r=>setTimeout(r,5));assert.equal(translations,1);assert.equal(tts.join(''),ja)}finally{f.close()}
})
