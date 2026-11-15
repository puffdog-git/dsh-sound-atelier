import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloudProviders } from '../lib/providers/cloud.js';
import { providerOptions, audioResult } from '../lib/providers/controls.js';
import { createCatalogService, normalizeList } from '../lib/catalog.js';

const wav=audioResult('fixture',Buffer.alloc(16),'pcm').audio;
function fixture(provider,{model,options={},cfg={},response}={}){
 const calls=[];let cleaned=0;
 const providers=makeCloudProviders({realtimeConnect:()=>{throw Error('No live Realtime connection in a unit test')},cfg:{speechInstruction:'cheerful',providerOptions:JSON.stringify({[provider]:options}),...cfg},resolveKey:async()=>'fixture-key',fetchImpl:async(url,opts)=>{calls.push({url,headers:opts.headers,body:opts.headers['content-type']==='application/json'?JSON.parse(opts.body):opts.body});return response?response():new Response(Buffer.from('audio'));}}, {text:'Hello.',lang:'en-US',role:'reply',models:model?{[provider]:model}:{},voices:{}},()=>({signal:new AbortController().signal,cleanup(){cleaned++;}}));
 return {run:()=>providers[provider](),calls,cleaned:()=>cleaned};
}
test('OpenAI separates instructions, synthesis speed and format; legacy tts-1 has no instructions',async()=>{
 const f=fixture('openai',{options:{speed:1.2,format:'wav'}});const out=await f.run();assert.equal(f.calls[0].body.input,'Hello.');assert.equal(f.calls[0].body.instructions,'cheerful');assert.equal(f.calls[0].body.speed,1.2);assert.equal(out.mime,'audio/wav');assert.equal(f.cleaned(),1);
 const old=fixture('openai',{model:'tts-1-hd'});await old.run();assert.equal(old.calls[0].body.instructions,undefined);
 const realtime=fixture('openai',{model:'gpt-realtime-2.1-mini'});await assert.rejects(realtime.run(),/Realtime connection/);assert.equal(realtime.calls.length,0);
});
test('Eleven v4 translates mood into an audio tag and allows only supported settings',async()=>{
 const f=fixture('elevenlabs',{model:'eleven_v4',options:{stability:.5,similarity_boost:.8}});await f.run();assert.equal(f.calls[0].body.text,'[cheerful] Hello.');assert.deepEqual(f.calls[0].body.voice_settings,{stability:.5,similarity_boost:.8});
 for(const option of ['style','speed','use_speaker_boost']){const bad=fixture('elevenlabs',{model:'eleven_v4',options:{[option]:option==='use_speaker_boost'?true:1}});await assert.rejects(bad.run(),/only supports/);assert.equal(bad.calls.length,0);}
 const old=fixture('elevenlabs',{model:'eleven_multilingual_v2',options:{style:.2,speed:1.1}});await old.run();assert.equal(old.calls[0].body.text,'Hello.');
});
test('Gemini 3.8 uses REST Interactions steps, transcript and metadata separately',async()=>{
 const f=fixture('google',{model:'gemini-3.8-flash-lite-tts',response:()=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]})});const out=await f.run();assert.match(f.calls[0].url,/\/v1beta\/interactions$/);assert.equal(f.calls[0].headers['x-goog-api-key'],'fixture-key');assert.equal(f.calls[0].body.input[0].content[0].text,'Hello.');assert.equal(f.calls[0].body.input[0].content[0].annotations[0].style,'cheerful');assert.deepEqual(out.audio,wav);assert.equal(out.mime,'audio/wav');
});
test('Gemini old transport is preserved, API key stays out of URL and PCM becomes WAV',async()=>{
 const f=fixture('google',{model:'gemini-2.5-flash-preview-tts',response:()=>Response.json({candidates:[{content:{parts:[{inlineData:{data:Buffer.alloc(8).toString('base64'),mimeType:'audio/L16;rate=24000'}}]}}]})});const out=await f.run();assert.match(f.calls[0].url,/:generateContent$/);assert.ok(!f.calls[0].url.includes('fixture-key'));assert.match(f.calls[0].body.contents[0].parts[0].text,/cheerful/);assert.equal(out.audio.readUInt32LE(24),24000);
});
test('Gemini rejects failed or malformed generation, always cleans timeout',async()=>{
 for(const payload of [{status:'failed',steps:[]},{steps:[{type:'model_output',content:[{type:'audio',data:Buffer.from('bad').toString('base64')}]}]}]){const f=fixture('google',{model:'gemini-3.8-flash-tts',response:()=>Response.json(payload)});await assert.rejects(f.run(),/Google Interactions/);assert.equal(f.cleaned(),1);}
});
test('Deepgram routes Flux to v2 with expressive controls and preserves Aura v1',async()=>{
 const f=fixture('deepgram',{model:'flux-alexis-en',options:{speed:1.05,expressivity:2,normalize_volume:false}});await f.run();const url=new URL(f.calls[0].url);assert.equal(url.pathname,'/v2/speak');assert.equal(url.searchParams.get('expressivity'),'2');assert.equal(url.searchParams.get('speed'),'1.05');assert.equal(url.searchParams.get('normalize_volume'),'false');assert.deepEqual(f.calls[0].body,{text:'Hello.'});
 const aura=fixture('deepgram',{model:'aura-2-thalia-en'});await aura.run();assert.match(aura.calls[0].url,/\/v1\/speak/);
 const invalid=fixture('deepgram',{model:'aura-2-thalia-en',options:{expressivity:1}});await assert.rejects(invalid.run(),/Flux/);assert.equal(invalid.calls.length,0);
 const json=fixture('deepgram',{model:'flux-alexis-en',response:()=>Response.json({request_id:'not-audio'})});await assert.rejects(json.run(),/metadata/);
});
test('Azure escapes SSML and supports styledegree and role without speaking mood prompt',async()=>{
 const f=fixture('azure',{cfg:{azureRegion:'eastus'},options:{style:'cheerful',styleDegree:1.4,role:'YoungAdultFemale'}});await f.run();assert.match(f.calls[0].body,/style="cheerful" styledegree="1.4" role="YoungAdultFemale"/);assert.match(f.calls[0].body,/>Hello\.</);assert.ok(!f.calls[0].body.includes('cheerful\n'));
 const bad=fixture('azure',{cfg:{azureRegion:'evil.test/path'}});await assert.rejects(bad.run(),/region/);assert.equal(bad.calls.length,0);
});
test('OpenRouter instructions and selected PCM rate produce playable WAV',async()=>{
 const f=fixture('openrouter',{model:'google/gemini-3.8-flash-tts',options:{pcmSampleRate:24000},response:()=>new Response(Buffer.alloc(16))});const out=await f.run();assert.equal(f.calls[0].body.response_format,'pcm');assert.equal(f.calls[0].body.instructions,'cheerful');assert.equal(out.audio.toString('ascii',0,4),'RIFF');assert.equal(out.audio.readUInt32LE(24),24000);
 const noRate=fixture('openrouter',{model:'google/gemini-3.8-flash-tts'});await assert.rejects(noRate.run(),/pcmSampleRate/);assert.equal(noRate.calls.length,0);
 const wrongFormat=fixture('openrouter',{model:'minimax/speech-2.8-hd',options:{format:'pcm',pcmSampleRate:24000}});await assert.rejects(wrongFormat.run(),/MP3/);assert.equal(wrongFormat.calls.length,0);
});
test('SiliconFlow CosyVoice instructions, gain and explicit PCM rate map to supported fields',async()=>{
 const f=fixture('siliconflow',{model:'FunAudioLLM/CosyVoice2-0.5B',options:{speed:1.1,gain:3,format:'pcm'},response:()=>new Response(Buffer.alloc(16))});const out=await f.run();assert.equal(f.calls[0].body.input,'cheerful<|endofprompt|>Hello.');assert.equal(f.calls[0].body.sample_rate,24000);assert.equal(f.calls[0].body.gain,3);assert.equal(out.mime,'audio/wav');assert.equal(out.audio.readUInt32LE(24),24000);
 const bad=fixture('siliconflow',{options:{format:'opus',sampleRate:24000}});await assert.rejects(bad.run(),/sampleRate/);assert.equal(bad.calls.length,0);
});
test('synthesis control validation refuses malformed JSON, arbitrary fields and invalid increments',()=>{
 for(const value of ['null','[]','{oops'])assert.throws(()=>providerOptions({providerOptions:value},'openai'));
 for(const [provider,options]of [['openai',{api_key:'never-send'}],['deepgram',{speed:1.03}],['deepgram',{expressivity:.5}],['elevenlabs',{stability:2}],['openrouter',{pcmSampleRate:24000.5}]])assert.throws(()=>providerOptions({providerOptions:JSON.stringify({[provider]:options})},provider));
 assert.throws(()=>audioResult('fixture',Buffer.alloc(3),'pcm'),/PCM/);
});
test('OpenRouter discovery uses speech modality instead of model name heuristics; Azure keeps style metadata',async()=>{
 let url;const service=createCatalogService({resolveKey:async()=>'fixture-key',fetchImpl:async u=>{url=u;return Response.json({data:[{id:'microsoft/mai-voice-2.1'},{id:'fish-audio/s2.1-pro'}]});}});const out=await service.discover('openrouter',{});assert.match(url,/output_modalities=speech/);assert.equal(out.models.length,2);
 const voices=normalizeList([{ShortName:'zh-CN-XiaoxiaoNeural',StyleList:['cheerful','sad'],RolePlayList:['YoungAdultFemale']}],'voices');assert.deepEqual(voices[0].styles,['cheerful','sad']);assert.deepEqual(voices[0].roles,['YoungAdultFemale']);
});
