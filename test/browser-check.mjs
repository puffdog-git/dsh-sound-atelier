import os from 'node:os'
import {createVoiceProfiles} from '../lib/voice-profiles.js'
// Run with PLAYWRIGHT_MODULE set to a playwright-core module path if not installed locally.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { PLATFORM_MODELS, platformPresets } from '../lib/providers/platform-catalog.js'
import { providerCapabilities } from '../lib/capabilities.js'
import { cloudVoiceCandidates } from '../lib/cloud-voices.js'
import { CLOUD_VOICE_SERVICES } from '../lib/cloud-voice-api.js'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core')
const root = fileURLToPath(new URL('../', import.meta.url))
const staticFiles = {
  '/': new URL('./ui-harness.html', import.meta.url), '/client.js': new URL('../lib/client.js', import.meta.url),
  '/react.js': path.join(path.dirname(require.resolve('react/package.json')), 'umd/react.development.js'),
  '/react-dom.js': path.join(path.dirname(require.resolve('react-dom/package.json')), 'umd/react-dom.development.js'),
}
let cfg = { chain: [{provider:'edge',model:'',voice:'zh-TW-HsiaoChenNeural'}], rate:1,pitch:0,volume:1,roles:{},language:'zh-TW',speakReplies:false }
const profileRoot=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-ui-profiles-')),voiceProfiles=createVoiceProfiles({root:profileRoot})
let saved; let preview; let operation; let dialogueRequest; let localOperation; let referenceUpload
let voiceAssets=[],kokoroState='unloaded'
let maintenance=[]
let cloudVoices=[],cloudOperations=[]
const legacyCatalog = (provider, model) => provider === 'voai' ? {
  ok:true,provider,defaultModel:'Sota+',models:[{id:'Neo',name:'Neo'},{id:'Sota+',name:'Sota+'},{id:'Classic',name:'Classic'}],
  voices: model === 'Neo' ? [{id:'佑希',name:'佑希',styles:['預設','聊天'],language:'zh-TW'}] : [{id:'子墨',name:'子墨',styles:['沉穩'],language:'zh-TW'}], sources:{models:'live',voices:'live'},warnings:[],
} : provider === 'doubao' ? {ok:true,provider,defaultModel:'seed-tts-2.0',models:[{id:'seed-tts-2.0',name:'seed-tts-2.0'},{id:'seed-tts-1.0',name:'seed-tts-1.0'}],voices:[{id:'zh_female_vv_uranus_bigtts',name:'Vivi'}],sources:{models:'preset',voices:'preset'},warnings:[]} : {ok:true,provider,models:provider==='custom'?[{id:'local-model',name:'local-model'}]:[],voices:[{id:'zh-TW-HsiaoChenNeural',name:'曉臻',language:'zh-TW',gender:'Female'},{id:'en-US-AriaNeural',name:'Aria',language:'en-US',gender:'Female'}],sources:{models:'live',voices:'live'},warnings:[]}
const catalog = (provider, model) => ['minimax','siliconflow','doubao'].includes(provider)?{ok:true,provider,models:({minimax:['speech-2.8-hd'],siliconflow:['FunAudioLLM/CosyVoice2-0.5B'],doubao:['seed-tts-2.0','seed-icl-2.0']})[provider].map(id=>({id,name:id})),voices:[],sources:{models:'preset',voices:'preset'},warnings:[]} : ['openai','mimo','deepinfra'].includes(provider) ? {
  ok:true,provider,models:({openai:['gpt-4o-mini-tts','gpt-realtime-2.1-mini'],mimo:['mimo-v2.5-tts','mimo-v2.5-tts-voiceclone'],deepinfra:['Qwen/Qwen3-TTS','Qwen/Qwen3-TTS-VoiceDesign']})[provider].map(id=>({id,name:id})),
  voices:(provider==='openai'?['alloy','marin']:provider==='mimo'?model?.endsWith('voiceclone')?[]:['冰糖']:model?.endsWith('VoiceDesign')?[]:['Vivian']).map(id=>({id,name:id})),sources:{models:'preset',voices:'preset'},warnings:[],
} : Object.hasOwn(PLATFORM_MODELS, provider) ? { ok:true,provider,...platformPresets(provider,model),...(provider==='fish'?{voices:[{id:'fixture-fish-voice',name:'Fixture Fish Voice'}]}:{}),sources:{models:'preset',voices:'preset'},warnings:[] } : legacyCatalog(provider,model)
const server = http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost')
    if(staticFiles[url.pathname]){res.setHeader('content-type',url.pathname==='/'?'text/html':'application/javascript');res.end(await fs.readFile(staticFiles[url.pathname]));return}
    let body='';for await(const c of req)body+=c
    let out={ok:true}
    if(url.pathname==='/dsh-sound-atelier/config'){
      if(req.method==='PUT'){saved=JSON.parse(body);cfg={...saved};delete cfg.keys;delete cfg.revision}
      out={ok:true,config:cfg,revision:1,credentials:{voai:{configured:true,writable:true},...Object.fromEntries(Object.keys(PLATFORM_MODELS).map(p=>[p,{configured:true,writable:true}]))}}
    }else if(url.pathname==='/dsh-sound-atelier/voice/profiles'){
      if(req.method==='POST'){const b=JSON.parse(body);if(b.action==='save')await voiceProfiles.save(b.profile,b.revision);else if(b.action==='bind')await voiceProfiles.bind(b,b.revision);else if(b.action==='remove')await voiceProfiles.remove(b.id,b.revision)}
      out={ok:true,...await voiceProfiles.list(),personas:[{id:'dsh-persona-dafeiyu:test',name:'小葵'}],workspaces:[{id:'work',title:'測試工作區'}],sessions:[{id:'session',title:'測試會話'}],personaAdapters:[]}
    }else if(url.pathname==='/dsh-sound-atelier/catalog')out=catalog(url.searchParams.get('provider'),url.searchParams.get('model'))
    else if(url.pathname==='/dsh-sound-atelier/capabilities')out={ok:true,capabilities:providerCapabilities(url.searchParams.get('provider'),url.searchParams.get('model')||undefined,url.searchParams.get('voice')||undefined,url.searchParams.get('transport')||'')}
    else if(url.pathname==='/dsh-sound-atelier/preview'){preview=JSON.parse(body);out={ok:false,error:{message:'Fixture preview captured'}}}
    else if(url.pathname==='/dsh-sound-atelier/provider-operation'){operation=JSON.parse(body);out={ok:true,result:{Lexicons:[]}}}
    else if(url.pathname==='/dsh-sound-atelier/dialogue'){dialogueRequest=JSON.parse(body);out={ok:false,error:{message:'Fixture dialogue captured'}}}
    else if(url.pathname==='/dsh-sound-atelier/voice/assets'){
      if(req.method==='POST'){referenceUpload=JSON.parse(body);voiceAssets.push({id:'12345678-1234-1234-1234-123456789abc',name:referenceUpload.name,duration:1,state:'validated',kind:'reference',bindings:[]})}
      if(req.method==='PATCH'){const edit=JSON.parse(body);voiceAssets=voiceAssets.map(a=>a.id===edit.id?{...a,name:edit.name}:a)}
      if(req.method==='DELETE'){const edit=JSON.parse(body);voiceAssets=voiceAssets.filter(a=>a.id!==edit.id)}
      out={ok:true,assets:voiceAssets,asset:voiceAssets.at(-1)}
    }
    else if(url.pathname==='/dsh-sound-atelier/voice/cloud'){
      if(req.method==='POST'){
        const input=JSON.parse(body);cloudOperations.push(input)
        if(input.action==='create'||input.action==='import'){
          const c=cloudVoiceCandidates(cfg).find(c=>c.index===input.candidateIndex)
          cloudVoices.push({...c,id:input.id,name:input.name,remoteId:input.remoteId||(c.provider==='siliconflow'?'speech:測試:a:b':'fixture-permanent-voice'),remoteState:c.provider==='dashscope'?'training':'available',operation:'idle',verifiedAt:null,...(c.provider==='minimax'?{uploadFileId:'341660563456789634',activation:'pending'}:{}),...(c.provider==='doubao'?{billingMode:input.billingMode,availableTrainingTimes:5,activation:input.billingMode==='postpaid'?'pending':null}:{})})
        }
        if(['rename','rename-local'].includes(input.action))cloudVoices=cloudVoices.map(v=>v.id===input.id?{...v,name:input.name}:v)
        if(input.action==='refresh')cloudVoices=cloudVoices.map(v=>v.id===input.id?{...v,remoteState:'available'}:v)
        if(input.action==='replace-reference')cloudVoices=cloudVoices.map(v=>v.id===input.id?{...v,remoteState:'training',verifiedAt:null}:v)
        if(input.action==='delete-upload')cloudVoices=cloudVoices.map(v=>v.id===input.id?{...v,uploadFileId:null,uploadState:'deleted'}:v)
        if(input.action==='delete-remote')cloudVoices=cloudVoices.map(v=>v.id===input.id?{...v,remoteState:'deleted'}:v)
        if(input.action==='forget')cloudVoices=cloudVoices.filter(v=>v.id!==input.id)
      }
      out={ok:true,voices:cloudVoices,candidates:cloudVoiceCandidates(cfg),services:CLOUD_VOICE_SERVICES}
    }
    else if(url.pathname==='/dsh-sound-atelier/local/service'){
      if(req.method==='POST'){localOperation=JSON.parse(body);if(localOperation.action==='kokoro-load')kokoroState='loaded';if(localOperation.action==='kokoro-unload')kokoroState='unloaded'}
      out={ok:true,kokoro:{state:kokoroState,packageInstalled:true,ready:false},result:{state:kokoroState,ready:false}}
    }
    else if(url.pathname==='/dsh-sound-atelier/voice/models')out={ok:true,models:[]}
    else if(url.pathname==='/dsh-sound-atelier/maintenance'){if(req.method==='POST'){localOperation=JSON.parse(body);maintenance.push({id:'job',kind:localOperation.action,state:'complete',lines:[]})}out={ok:true,jobs:maintenance,job:maintenance.at(-1)}}
    else if(url.pathname==='/dsh-sound-atelier/usage')out={ok:true,estimated:true,months:{}}
    else if(url.pathname==='/dsh-sound-atelier/diagnostics')out={ok:true,report:{readOnly:true,secretsExcluded:true,checks:[]}}
    else if(url.pathname==='/dsh-sound-atelier/stats')out={ok:true,total:0,cacheHits:0,providers:{}}
    else if(url.pathname==='/dsh-sound-atelier/status')out={ok:true,sseClients:0}
    else if(url.pathname==='/dsh-sound-atelier/models/status')out={ok:true,models:{}}
    res.setHeader('content-type','application/json');res.end(JSON.stringify(out))
  }catch(err){res.statusCode=500;res.end(JSON.stringify({error:String(err)}))}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{channel:'chrome'})})
const page=await browser.newPage({viewport:{width:1100,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('heading',{name:'never exists'}).count() // wait for scripts through locator calls below
  const voice=page.getByRole('combobox',{name:'聲音',exact:true}).first()
  await voice.selectOption('en-US-AriaNeural')
  await page.getByRole('slider',{name:'語速',exact:true}).first().fill('1.25')
  await page.getByRole('slider',{name:'音量',exact:true}).first().fill('0.5')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.chain[0].voice,'en-US-AriaNeural');assert.equal(saved.rate,1.25);assert.equal(saved.volume,.5)
  const services=page.getByRole('combobox',{name:'主要服務',exact:true})
  await fs.mkdir(path.join(root,'.verification'),{recursive:true})
  for(const provider of Object.keys(PLATFORM_MODELS)){
    if(provider==='cosyvoice')await page.getByRole('button',{name:'本機部署',exact:false}).click()
    await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption(provider)
    await page.getByRole('combobox',{name:'合成音訊格式',exact:true}).selectOption('wav')
    assert.equal(await page.getByRole('link',{name:'官方金鑰／權限說明',exact:true}).count(),1)
    if(provider==='dashscope'){
      await page.getByRole('combobox',{name:'DashScope 地域',exact:true}).selectOption('ap-southeast-1')
      await page.getByRole('textbox',{name:'DashScope 業務空間 ID',exact:false}).fill('fixture-workspace')
    }
    if(provider==='polly'){
      assert.equal(await page.getByLabel('AWS 憑證 JSON',{exact:true}).count(),1)
      await page.getByRole('textbox',{name:'Polly AWS Region',exact:false}).fill('ap-northeast-1')
    }
    if(provider==='google-cloud')assert.equal(await page.getByLabel('Google 服務帳號 JSON',{exact:true}).count(),1)
    if(provider==='cartesia'){
      await page.getByRole('textbox',{name:'Cartesia 合成語言',exact:true}).fill('en')
      await page.getByRole('combobox',{name:'Cartesia 情感（僅英文）',exact:true}).selectOption('sad')
    }
    await page.getByRole('button',{name:'儲存設定',exact:true}).click()
    assert.equal(saved.chain[0].provider,provider);assert.equal(JSON.parse(saved.providerOptions)[provider].format,'wav')
    if(provider==='cartesia')await page.screenshot({path:path.join(root,'.verification','stage6-cartesia-desktop.png'),fullPage:true})
    await page.setViewportSize({width:390,height:844})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),provider+' mobile layout overflows')
    await page.screenshot({path:path.join(root,'.verification','stage6-'+provider+'-mobile.png'),fullPage:true})
    await page.setViewportSize({width:1100,height:1000})
  }
  assert.equal(saved.dashscopeRegion,'ap-southeast-1');assert.equal(saved.dashscopeWorkspace,'fixture-workspace');assert.equal(saved.pollyRegion,'ap-northeast-1');assert.equal(JSON.parse(saved.providerOptions).cartesia.emotion,'sad')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('doubao')
  await page.getByRole('combobox',{name:'豆包傳輸方式',exact:true}).selectOption('websocket')
  await page.getByRole('checkbox',{name:'豆包字詞時間戳',exact:true}).check()
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(JSON.parse(saved.providerOptions).doubao.transport,'websocket')
  assert.equal(JSON.parse(saved.providerOptions).doubao.timestamps,true)
  await page.setViewportSize({width:390,height:844})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Doubao mobile layout overflows')
  await page.screenshot({path:path.join(root,'.verification','doubao-stream-mobile.png'),fullPage:true})
  await page.setViewportSize({width:1100,height:1000})
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('siliconflow')
  await page.getByRole('combobox',{name:'SiliconFlow 聲線來源',exact:true}).selectOption('reference')
  await page.getByRole('textbox',{name:'SiliconFlow 參考 WAV 路徑',exact:false}).fill('C:/test/siliconflow.wav')
  await page.getByRole('textbox',{name:'SiliconFlow 參考逐字稿',exact:false}).fill('這是參考錄音。')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.siliconflowVoiceMode,'reference');assert.equal(saved.siliconflowReferencePath,'C:/test/siliconflow.wav');assert.equal(saved.siliconflowReferenceText,'這是參考錄音。')
  await page.getByRole('combobox',{name:'SiliconFlow 聲線來源',exact:true}).selectOption('preset')
  assert.equal(await page.getByRole('textbox',{name:'SiliconFlow 參考 WAV 路徑',exact:false}).count(),0)
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.siliconflowVoiceMode,'preset')
  for(const provider of ['voai','openai','elevenlabs','google','azure','groq','deepgram','openrouter','siliconflow','deepinfra','minimax','mimo','doubao','fireworks']){
    if(provider==='cosyvoice')await page.getByRole('button',{name:'本機部署',exact:false}).click()
    await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption(provider)
    const guide=page.getByRole('link',{name:'官方金鑰／權限說明',exact:true})
    assert.equal(await guide.count(),1,provider+' needs an official guide')
    assert.ok((await guide.getAttribute('href')).startsWith('https://'))
  }
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('elevenlabs')
  assert.ok(await page.getByText(/text_to_speech.*models_read.*voices_read/).isVisible())
  await fs.mkdir(path.join(root,'.verification'),{recursive:true})
  await page.screenshot({path:path.join(root,'.verification','elevenlabs-permission-guide.png'),fullPage:true})
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('edge')
  assert.equal(await page.getByRole('link',{name:'官方金鑰／權限說明',exact:true}).count(),0)
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('voai')
  const model=page.getByRole('combobox',{name:'模型',exact:true}).first()
  await page.waitForFunction(()=>document.querySelector('[aria-label="模型"]').value==='Sota+')
  assert.equal(await voice.inputValue(),'子墨')
  await model.selectOption('Neo')
  await page.waitForFunction(()=>document.querySelector('[aria-label="聲音"]').value==='佑希')
  await page.getByRole('combobox',{name:'說話風格',exact:true}).first().selectOption('聊天')
  await page.getByRole('slider',{name:'音調偏移',exact:true}).first().fill('-2')
  await page.getByRole('slider',{name:'句間停頓',exact:true}).first().fill('0.5')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.chain[0].model,'Neo');assert.equal(saved.chain[0].style,'聊天');assert.equal(saved.voaiPitch,-2)
  await page.locator('.dts-tune').first().getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.tuning.style,'聊天');assert.equal(preview.tuning.voaiPitch,-2)
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('doubao')
  await model.selectOption('seed-tts-2.0')
  await page.getByRole('textbox',{name:'語氣／心情提示',exact:true}).first().fill('驚喜、帶笑意，但不要喊叫')
  await page.getByRole('slider',{name:'豆包音調（半音）',exact:true}).first().fill('3')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.doubaoInstruction,'驚喜、帶笑意，但不要喊叫');assert.equal(saved.doubaoPitch,3)
  assert.equal(saved.mimoInstruction,undefined)
  await page.locator('.dts-tune').first().getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.provider,'doubao');assert.equal(preview.tuning.instruction,saved.doubaoInstruction);assert.equal(preview.tuning.doubaoPitch,3)
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('openai')
  await page.getByRole('textbox',{name:'語氣／心情提示',exact:true}).first().fill('溫柔、稍微傷心')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.speechInstruction,'溫柔、稍微傷心')
  assert.equal(saved.doubaoInstruction,'驚喜、帶笑意，但不要喊叫')
  await page.locator('.dts-tune').first().getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.provider,'openai');assert.equal(preview.tuning.instruction,'溫柔、稍微傷心')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('minimax')
  await page.getByRole('combobox',{name:'MiniMax 連線方式',exact:true}).selectOption('http')
  await page.getByRole('combobox',{name:'MiniMax 情緒',exact:true}).selectOption('sad')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.minimaxTransport,'http');assert.equal(JSON.parse(saved.providerOptions).minimax.emotion,'sad')
  await page.getByRole('button',{name:'本機部署',exact:false}).click()
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('cosyvoice')
  await page.getByRole('combobox',{name:'CosyVoice 合成模式',exact:true}).selectOption('instruct2')
  await page.getByRole('textbox',{name:'CosyVoice 參考 WAV 路徑',exact:false}).fill('C:/test/reference.wav')
  await page.getByRole('textbox',{name:'語氣／心情提示',exact:true}).first().fill('開心而自然')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.cosyvoiceMode,'instruct2');assert.equal(saved.cosyvoiceReferencePath,'C:/test/reference.wav');assert.equal(saved.speechInstruction,'開心而自然')
  await page.getByRole('button',{name:'線上語音服務',exact:false}).click()
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('mimo')
  await model.selectOption('mimo-v2.5-tts-voiceclone')
  await page.getByRole('textbox',{name:'MiMo 參考錄音路徑',exact:false}).fill('C:/test/mimo.wav')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.mimoReferencePath,'C:/test/mimo.wav')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('deepinfra')
  await model.selectOption('Qwen/Qwen3-TTS-VoiceDesign')
  await page.getByRole('textbox',{name:'描述想要的聲音',exact:false}).first().fill('溫暖、低沉的旁白男聲')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.deepinfraVoiceDesign,'溫暖、低沉的旁白男聲');assert.equal(saved.mimoVoiceDesign,undefined)
  await page.locator('.dts-tune').first().getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.tuning.voiceDesign,'溫暖、低沉的旁白男聲')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('openai')
  await model.selectOption('gpt-realtime-2.1-mini')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  await page.locator('.dts-tune').first().getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.model,'gpt-realtime-2.1-mini')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('custom')
  const entry = page.locator('.dts-entry').first()
  await entry.locator('summary').filter({hasText:'此降級候選的獨立設定'}).click()
  await entry.getByRole('textbox',{name:'獨立 API 端點',exact:true}).fill('http://127.0.0.1:9999/v1')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await entry.getByRole('textbox',{name:'既有安全憑證名稱',exact:true}).fill('SECOND_TTS_KEY')
  await entry.getByRole('textbox',{name:'此候選的合成參數（JSON 物件）',exact:true}).fill('{"speed":1.1}')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.chain[0].baseUrl,'http://127.0.0.1:9999/v1')
  assert.equal(saved.chain[0].keyEnv,'SECOND_TTS_KEY')
  assert.equal(saved.chain[0].options,'{"speed":1.1}')
  await entry.getByRole('button',{name:'試聽',exact:false}).click()
  assert.equal(preview.tuning.baseUrl,'http://127.0.0.1:9999/v1')
  assert.equal(preview.tuning.keyEnv,'SECOND_TTS_KEY')
  assert.equal(preview.tuning.options,'{"speed":1.1}')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('cartesia')
  const local=page.locator('[data-dsh-tts-local]')
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await local.getByRole('combobox',{name:'本機模型家族',exact:true}).selectOption('index2')
  await local.locator('summary').filter({hasText:'新增／管理參考錄音'}).click()
  await local.getByRole('textbox',{name:'錄音名稱',exact:true}).fill('我的參考錄音')
  await local.getByRole('textbox',{name:'錄音逐字稿',exact:true}).fill('錄音原話。')
  await local.getByLabel('參考錄音檔案',{exact:true}).setInputFiles({name:'reference.wav',mimeType:'audio/wav',buffer:Buffer.from('fixture-audio')})
  await local.getByRole('button',{name:'上傳並驗證錄音',exact:true}).click()
  await local.getByRole('combobox',{name:'目前參考錄音',exact:true}).selectOption('12345678-1234-1234-1234-123456789abc')
  assert.equal(referenceUpload.transcript,'錄音原話。');assert.equal(Buffer.from(referenceUpload.sample,'base64').toString(),'fixture-audio')
  assert.equal(localOperation,undefined,'opening local settings must not launch a runtime')
  await local.locator('summary').filter({hasText:'Kokoro 獨立 CPU runtime'}).click()
  await local.getByRole('button',{name:'載入 Kokoro（首次下載模型）',exact:true}).click()
  assert.equal(localOperation.action,'kokoro-load')
  await page.waitForFunction(()=>document.querySelector('[data-dsh-tts-local]')?.textContent.includes('模型已載入，尚未驗證合成'))
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.localTtsReferenceAsset,'12345678-1234-1234-1234-123456789abc');assert.equal(saved.localTtsFamily,'index2')

  const studio=page.locator('[data-dsh-tts-stage3]')
  assert.equal(maintenance.length,0,'opening studio must not install or load models')
  await local.getByRole('combobox',{name:'本機服務類型',exact:true}).selectOption('index-native')
  await studio.getByRole('combobox',{name:'朗讀文字模式',exact:true}).selectOption('raw')
  await studio.locator('summary').filter({hasText:'dots.tts／IndexTTS 直接執行（不經過 Xinference）'}).click()
  await studio.getByRole('combobox',{name:'IndexTTS 的情緒參考錄音（選用）',exact:true}).selectOption('12345678-1234-1234-1234-123456789abc')
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.localTtsBackend,'index-native');assert.equal(saved.textMode,'raw');assert.equal(saved.localTtsEmotionAsset,'12345678-1234-1234-1234-123456789abc')
  await studio.locator('summary').filter({hasText:'RVC 變聲（把合成好的語音換成另一個人的聲音）'}).click()
  assert.equal(await studio.getByRole('button',{name:'匯入音色檔',exact:true}).isDisabled(),true)
  await studio.locator('summary').filter({hasText:'一鍵診斷與用量估算'}).click()
  await studio.getByRole('button',{name:'產生唯讀診斷',exact:true}).click()
  await studio.getByText('"secretsExcluded": true',{exact:false}).waitFor()
  await studio.locator('summary').filter({hasText:'安裝其他引擎（dots.tts、RVC、Kokoro、IndexTTS）'}).click()
  await studio.getByRole('combobox',{name:'安裝環境',exact:true}).selectOption('dots')
  await studio.getByRole('button',{name:'安裝選定的引擎',exact:true}).click()
  assert.equal(localOperation.action,'install');assert.equal(localOperation.backend,'dots')
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  const cloud=page.locator('[data-dsh-tts-cloud-voices]')
  assert.equal(cloudOperations.length,0,'opening the voice manager must not call cloud mutations')
  await cloud.getByRole('button',{name:'重新讀取雲端音色／已儲存服務列',exact:true}).click()
  await cloud.locator('summary').filter({hasText:'建立／匯入音色'}).click()
  await cloud.getByRole('combobox',{name:'雲端音色服務列',exact:true}).selectOption('0')
  await cloud.getByRole('textbox',{name:'音色紀錄名稱',exact:true}).fill('我的永久音色')
  await cloud.getByRole('combobox',{name:'建立音色的參考錄音',exact:true}).selectOption('12345678-1234-1234-1234-123456789abc')
  const createCloud=cloud.getByRole('button',{name:'上傳並建立音色',exact:true})
  assert.equal(await createCloud.isDisabled(),true,'upload consent must be explicit')
  await cloud.getByRole('checkbox',{name:'確認上傳錄音建立雲端音色',exact:true}).check()
  await createCloud.click()
  await cloud.getByRole('button',{name:'合成試聽 我的永久音色（使用額度）',exact:true}).waitFor()
  assert.equal(cloudOperations[0].uploadConfirmed,true);assert.equal(cloudOperations[0].referenceAsset,'12345678-1234-1234-1234-123456789abc')
  assert.ok((await cloud.innerText()).includes('尚未成功合成試聽'),'created does not mean synthesis verified')
  const cloudDelete=cloud.getByRole('button',{name:'永久刪除遠端 我的永久音色',exact:true})
  assert.equal(await cloudDelete.isDisabled(),true)
  await cloud.getByRole('textbox',{name:'遠端名稱 我的永久音色',exact:true}).fill('永久音色改名')
  await cloud.getByRole('button',{name:'儲存 我的永久音色 遠端名稱',exact:true}).click()
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await cloud.getByRole('button',{name:'將 永久音色改名 填入服務列',exact:true}).waitFor()
  // Unsaved credential slot changes must not move an existing cloud voice
  // to another account. Restore the original slot before applying it.
  const savedSlot=cfg.chain[0].keyEnv||''
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await entry.getByRole('textbox',{name:'既有安全憑證名稱',exact:true}).fill('DIFFERENT_SLOT')
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await cloud.getByRole('button',{name:'將 永久音色改名 填入服務列',exact:true}).click()
  await cloud.getByRole('alert').filter({hasText:'請儲存服務列並重新讀取'}).waitFor()
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await entry.getByRole('textbox',{name:'既有安全憑證名稱',exact:true}).fill(savedSlot)
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await cloud.getByRole('button',{name:'將 永久音色改名 填入服務列',exact:true}).click()
  await cloud.getByRole('status').filter({hasText:'已填入原服務列'}).waitFor()
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(saved.chain[0].voice,'fixture-permanent-voice');assert.equal(saved.chain[0].referenceAsset,'')
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await cloud.screenshot({path:path.join(root,'.verification','cloud-voices-mobile.png')})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'cloud manager overflows on mobile')
  await page.setViewportSize({width:1100,height:1000})
  await cloud.getByRole('button',{name:'僅移除 永久音色改名 本機紀錄',exact:true}).click()
  assert.equal(cloudVoices.length,1,'forgetting requires a separate explicit confirmation')
  await cloud.getByRole('button',{name:'確認僅移除本機紀錄',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('[data-dsh-tts-cloud-voices]')?.textContent.includes('Voice ID：'))
  assert.equal(cloudOperations.filter(x=>x.action==='delete-remote').length,0)
  const enrollmentModels={dashscope:'qwen-audio-3.1-tts-plus',minimax:'speech-2.8-hd',siliconflow:'FunAudioLLM/CosyVoice2-0.5B',doubao:'seed-icl-2.0'}
  for(const provider of Object.keys(enrollmentModels)){
    if(provider==='cosyvoice')await page.getByRole('button',{name:'本機部署',exact:false}).click()
    await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption(provider)
    await model.selectOption(enrollmentModels[provider])
    if(provider==='siliconflow')await page.getByRole('combobox',{name:'SiliconFlow 聲線來源',exact:true}).selectOption('reference')
    await page.getByRole('button',{name:'儲存設定',exact:true}).click()
    await page.getByRole('button',{name:'聲音管理',exact:true}).click()
    await cloud.getByRole('button',{name:'重新讀取雲端音色／已儲存服務列',exact:true}).click()
    await cloud.getByRole('combobox',{name:'雲端音色服務列',exact:true}).selectOption('0')
    await cloud.getByRole('textbox',{name:'音色紀錄名稱',exact:true}).fill('UI '+provider)
    await cloud.getByRole('combobox',{name:'建立音色的參考錄音',exact:true}).selectOption('12345678-1234-1234-1234-123456789abc')
    if(provider==='dashscope')await cloud.getByRole('textbox',{name:'DashScope 音色字首',exact:true}).fill('UiVoice')
    if(provider==='minimax')await cloud.getByRole('textbox',{name:'自訂新 voice ID',exact:true}).fill('UiMiniVoice001')
    if(provider==='doubao'){
      await cloud.getByRole('textbox',{name:'豆包註冊音色 ID',exact:true}).fill('S_UiSlot')
      await cloud.getByRole('checkbox',{name:'確認上傳錄音建立雲端音色',exact:true}).check()
      assert.equal(await createCloud.isDisabled(),true,'prepaid slot replacement must require a separate confirmation')
      await cloud.getByRole('checkbox',{name:'確認覆寫已購買的豆包音色槽',exact:true}).check()
    }
    await cloud.getByRole('checkbox',{name:'確認上傳錄音建立雲端音色',exact:true}).check()
    await createCloud.click()
    const localLabel=cloud.getByRole('textbox',{name:'本機標籤 UI '+provider,exact:true})
    await localLabel.waitFor()
    if(provider==='dashscope'){
      assert.equal(cloudOperations.at(-1).prefix,'UiVoice')
      assert.equal(await cloud.getByRole('button',{name:'合成試聽 UI dashscope（使用額度）',exact:true}).isDisabled(),true)
      await cloud.getByRole('button',{name:'查詢 UI dashscope 狀態',exact:true}).click()
      await cloud.getByRole('button',{name:'合成試聽 UI dashscope（使用額度）',exact:true}).waitFor({state:'visible'})
      await cloud.locator('summary').filter({hasText:'更換 UI dashscope 參考錄音／重新訓練'}).click()
      await cloud.getByRole('combobox',{name:'新參考錄音 UI dashscope',exact:true}).selectOption('12345678-1234-1234-1234-123456789abc')
      assert.equal(await cloud.getByRole('button',{name:'上傳並重新訓練 UI dashscope',exact:true}).isDisabled(),true)
      await cloud.getByRole('checkbox',{name:'確認重新訓練 UI dashscope',exact:true}).check()
      await cloud.getByRole('button',{name:'上傳並重新訓練 UI dashscope',exact:true}).click()
      assert.equal(cloudOperations.at(-1).action,'replace-reference');assert.equal(cloudOperations.at(-1).confirmRemoteId,'fixture-permanent-voice')
    }
    if(provider==='minimax'){
      assert.equal(await cloud.getByRole('button',{name:'合成試聽 UI minimax（使用額度）',exact:true}).isDisabled(),true)
      assert.equal(await cloud.getByRole('button',{name:'將 UI minimax 填入服務列',exact:true}).isDisabled(),true)
      await cloud.getByRole('checkbox',{name:'確認啟用音色 UI minimax',exact:true}).check()
      assert.equal(await cloud.getByRole('button',{name:'合成試聽 UI minimax（使用額度）',exact:true}).isDisabled(),false)
      const cleanup=cloud.getByRole('button',{name:'刪除 UI minimax 遠端上傳錄音',exact:true})
      assert.equal(await cleanup.isDisabled(),true)
      await cloud.getByRole('checkbox',{name:'確認刪除上傳檔案 UI minimax',exact:true}).check();await cleanup.click()
      assert.equal(cloudOperations.at(-1).confirmFileId,'341660563456789634')
      await cloud.getByRole('button',{name:'將 UI minimax 填入服務列',exact:true}).click()
      await page.getByRole('button',{name:'儲存設定',exact:true}).click();assert.equal(saved.minimaxTransport,'http')
    }
    if(provider==='siliconflow'){
      await cloud.getByRole('button',{name:'將 UI siliconflow 填入服務列',exact:true}).click()
      await page.getByRole('button',{name:'儲存設定',exact:true}).click();assert.equal(saved.siliconflowVoiceMode,'preset');assert.equal(saved.chain[0].voice,'speech:測試:a:b')
    }
    if(provider==='doubao'){
      assert.equal(cloudOperations.at(-1).slotConfirmed,true)
      assert.equal(await cloud.getByRole('button',{name:'永久刪除遠端 UI doubao',exact:true}).count(),0)
      assert.ok((await cloud.innerText()).includes('剩餘訓練次數：5'))
      await page.setViewportSize({width:390,height:844})
      await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await cloud.screenshot({path:path.join(root,'.verification','voice-enrollment-mobile.png')})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'enrollment manager overflows on mobile')
      await page.setViewportSize({width:1100,height:1000})
    }
    await localLabel.fill('Local '+provider)
    await cloud.getByRole('button',{name:'儲存 UI '+provider+' 本機標籤',exact:true}).click()
    assert.equal(cloudOperations.at(-1).action,'rename-local')
    await cloud.getByRole('button',{name:'僅移除 Local '+provider+' 本機紀錄',exact:true}).click()
    await cloud.getByRole('button',{name:'確認僅移除本機紀錄',exact:true}).click()
    await page.waitForFunction(()=>!document.querySelector('[data-dsh-tts-cloud-voices]')?.textContent.includes('Voice ID：'))
  }
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('cartesia')
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  const capabilities=page.locator('[data-dsh-tts-capabilities]')
  await capabilities.getByRole('combobox',{name:'合成傳輸方式',exact:true}).selectOption('websocket')
  await capabilities.getByRole('combobox',{name:'合成音訊格式',exact:true}).selectOption('wav')
  assert.equal(await capabilities.getByRole('combobox',{name:'合成音訊格式',exact:true}).locator('option[value="mp3"]').count(),0)
  await capabilities.getByRole('checkbox',{name:'回傳時間戳',exact:true}).check()
  await page.getByRole('button',{name:'儲存設定',exact:true}).click()
  assert.equal(JSON.parse(saved.providerOptions).cartesia.transport,'websocket')
  assert.equal(JSON.parse(saved.providerOptions).cartesia.timestamps,true)
  await capabilities.locator('summary').filter({hasText:'多角色語音工作室'}).click()
  await capabilities.getByRole('textbox',{name:'角色 A 音色 ID',exact:true}).fill('speaker-a')
  await capabilities.getByRole('button',{name:'新增台詞',exact:true}).click()
  assert.equal(await capabilities.getByRole('textbox',{name:/段台詞/}).count(),3)
  await capabilities.getByRole('textbox',{name:'第 3 段台詞',exact:true}).fill('測試第三句。')
  await capabilities.getByRole('button',{name:'合成並試聽對話',exact:true}).click()
  assert.equal(dialogueRequest.speakers[0].voice,'speaker-a');assert.equal(dialogueRequest.turns.length,3)
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('polly')
  await capabilities.locator('summary').filter({hasText:'發音詞典與雲端長文工作'}).click()
  assert.equal(operation,undefined,'admin must not submit on opening')
  await capabilities.getByRole('button',{name:'執行所選操作',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('[data-dsh-tts-capabilities] pre')?.textContent.includes('Lexicons'))
  assert.equal(operation.action,'lexicon-list');assert.deepEqual(operation.input,{})
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await services.selectOption('cartesia')
  assert.equal((await page.evaluate(()=>testSlots.filter(s=>s.name==='settings.section'))).length,1)
  const options=await services.locator('option').evaluateAll(opts=>opts.map(o=>o.value))
  assert.equal(options.filter(v=>v==='edge').length,1)
  await fs.mkdir(path.join(root,'.verification'),{recursive:true})
  await page.screenshot({path:path.join(root,'.verification','voice-studio-desktop.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:path.join(root,'.verification','voice-studio-mobile.png'),fullPage:true})
  await page.getByRole('button',{name:'聲音管理',exact:true}).click()
  await local.screenshot({path:path.join(root,'.verification','local-assets-mobile.png')})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile layout overflows')
  await page.getByRole('button',{name:'人格與語言',exact:true}).click()
  await page.getByRole('combobox',{name:'配音模式',exact:true}).selectOption('ja')
  await page.getByRole('textbox',{name:'音色方案名稱',exact:true}).fill('小葵・日文')
  await page.getByRole('button',{name:'以目前設定建立方案',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('[aria-label="選擇音色方案"]')?.options.length===2)
  const profile=(await voiceProfiles.list()).profiles[0]
  assert.equal(profile.config.spokenLanguage,'ja');assert.equal(profile.chain[0].provider,'cartesia')
  await page.getByRole('combobox',{name:'選擇音色方案',exact:true}).selectOption(profile.id)
  await page.getByRole('combobox',{name:'綁定對象',exact:true}).selectOption('dsh-persona-dafeiyu:test')
  await page.getByRole('button',{name:'套用綁定',exact:true}).click()
  await page.getByRole('cell',{name:'小葵',exact:true}).waitFor()
  assert.equal((await voiceProfiles.list()).bindings[0].profileId,profile.id)
  await page.screenshot({path:path.join(root,'.verification','persona-language-mobile.png'),fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'persona bindings overflow on mobile')
  await page.setViewportSize({width:1100,height:1000})
  await page.screenshot({path:path.join(root,'.verification','persona-language-desktop.png'),fullPage:true})
  await page.getByRole('button',{name:'語音來源',exact:true}).click()
  await page.getByRole('button',{name:'本機部署',exact:false}).click()
  assert.equal(await services.inputValue(),'local-tts')
  assert.equal(await services.locator('option[value="openai"]').count(),0)
  assert.equal(await services.locator('option[value="index-native"]').count(),0)
  await page.screenshot({path:path.join(root,'.verification','local-source-desktop.png'),fullPage:true})
  assert.deepEqual(errors,[])
  console.log('Browser checks passed: sidebar registration, deduplication, model/voice/style linkage, sliders, persistence, per-entry endpoint/credential/options save and preview, draft preview and mobile layout.')
}finally{await fs.rm(profileRoot,{recursive:true,force:true});await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
