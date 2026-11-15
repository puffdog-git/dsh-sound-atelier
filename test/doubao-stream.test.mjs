import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { gzipSync } from 'node:zlib'
import { WebSocketServer } from 'ws'
import { synthesizeDoubaoV3, readDoubaoAudio } from '../lib/providers/doubao.js'
import { doubaoFrame, parseDoubaoFrame } from '../lib/providers/doubao-ws.js'
import { runChain } from '../lib/chain.js'
import { hostFixture } from './host-fixture.mjs'

// Independently constructed server fixtures, following the official V3 wire
// tables. In particular 364 is subtitle; 362 belongs to podcast round end.
const u32 = n => { const b=Buffer.alloc(4);b.writeUInt32BE(n);return b }
function serverFrame(event, id, data = {}, { audio = false, gzip = false } = {}) {
  let payload = audio ? Buffer.from(data) : Buffer.from(JSON.stringify(data))
  if (gzip) payload = gzipSync(payload)
  const identity = Buffer.from(id)
  return Buffer.concat([Buffer.from([0x11,audio?0xb4:0x94,(audio?0:0x10)+(gzip?1:0),0]),u32(event),u32(identity.length),identity,u32(payload.length),payload])
}
async function endpoint(onMessage, headers) {
  const wss = new WebSocketServer({ port:0, host:'127.0.0.1' });await once(wss,'listening')
  wss.on('connection',(ws,req)=>{headers?.(req.headers);ws.on('message',raw=>{const packet=parseDoubaoFrame(raw);onMessage(ws,packet)})})
  return { url:'ws://127.0.0.1:'+wss.address().port+'/api/v3/tts/bidirection', async close(){for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r))} }
}
const req = () => ({text:'你好。',models:{doubao:'seed-tts-2.0'},voices:{doubao:'zh_female_vv_uranus_bigtts'},role:'reply'})
const cfg = url => ({doubaoBaseUrl:url,timeoutMs:1000,providerOptions:'{"doubao":{"transport":"websocket","timestamps":true}}',doubaoInstruction:'開心'})
const sentence = {text:'你好。',words:[{word:'你',startTime:.1,endTime:.3},{word:'好',startTime:.3,endTime:.5}]}

test('V3 framing matches official connection/session layout and handles gzip subtitles',()=>{
  const connection=doubaoFrame(1);assert.equal(connection.subarray(0,12).toString('hex'),'111410000000000100000002');assert.equal(connection.subarray(12).toString(),'{}')
  const session=doubaoFrame(102,{},'sid');assert.equal(session.readUInt32BE(8),3);assert.equal(session.subarray(12,15).toString(),'sid');assert.equal(session.readUInt32BE(15),2)
  const parsed=parseDoubaoFrame(serverFrame(364,'sid',sentence,{gzip:true}));assert.equal(parsed.event,364);assert.equal(parsed.id,'sid');assert.deepEqual(parsed.data,sentence)
  assert.throws(()=>parseDoubaoFrame(serverFrame(352,'sid','abc',{audio:true}).subarray(0,10)),/length|Truncated/)
  assert.throws(()=>parseDoubaoFrame(Buffer.concat([serverFrame(152,'sid'),Buffer.from('x')])),/Unexpected data/)
})

test('native bidirectional socket sends more text after receiving audio and preserves late subtitles',async()=>{
  const events=[], texts=[];let gotAudio;const audioSeen=new Promise(r=>{gotAudio=r});let sid,headers
  const server=await endpoint((ws,p)=>{
    events.push(p.event)
    if(p.event===1)ws.send(serverFrame(50,'connection'))
    if(p.event===100){sid=p.id;assert.equal(p.data.namespace,'BidirectionalTTS');assert.equal(p.data.req_params.audio_params.enable_timestamp,true);assert.equal(p.data.req_params.speaker,'zh_female_vv_uranus_bigtts');assert.deepEqual(JSON.parse(p.data.req_params.additions).context_texts,['開心']);ws.send(serverFrame(150,sid))}
    if(p.event===200){texts.push(p.data.req_params.text);ws.send(serverFrame(352,sid,Buffer.from('audio'+texts.length),{audio:true}))}
    if(p.event===102){ws.send(serverFrame(351,sid,{text:'',words:[]}));ws.send(serverFrame(364,sid,sentence,{gzip:true}));ws.send(serverFrame(152,sid,{status_code:20000000}))}
  },h=>{headers=h})
  async function* source(){yield '第一段🙂';await audioSeen;yield '第二段。'}
  try{
    const out=await synthesizeDoubaoV3({cfg:cfg(server.url),req:{...req(),textChunks:source(),onAudioChunk:()=>gotAudio()},key:'fixture-key'})
    assert.deepEqual(texts,['第一段🙂','第二段。']);assert.equal(out.audio.toString(),'audio1audio2');assert.ok(events.indexOf(100)>events.indexOf(1));assert.ok(events.indexOf(102)>events.indexOf(200));assert.equal(headers['x-api-key'],'fixture-key');assert.equal(headers['x-api-resource-id'],'seed-tts-2.0')
    assert.equal(out.timing.available,true);assert.equal(out.timing.scope,'segment');assert.equal(out.timing.unit,'seconds');assert.deepEqual(out.timing.sentences[0].words[0],{word:'你',start:.1,end:.3})
  }finally{await server.close()}
})

test('long input is split into ordered Unicode-safe task packets in one session',async()=>{
  const texts=[];let starts=0
  const server=await endpoint((ws,p)=>{if(p.event===1)ws.send(serverFrame(50,'c'));if(p.event===100){starts++;ws.send(serverFrame(150,p.id))}if(p.event===200)texts.push(p.data.req_params.text);if(p.event===102){ws.send(serverFrame(352,p.id,'audio',{audio:true}));ws.send(serverFrame(152,p.id))}})
  try{const text='🙂漢字'.repeat(160);await synthesizeDoubaoV3({cfg:cfg(server.url),req:{...req(),text},key:'key'});assert.equal(starts,1);assert.ok(texts.length>1);assert.equal(texts.join(''),text);assert.ok(texts.every(t=>!t.includes('\uFFFD')&&Array.from(t).length<=200))}finally{await server.close()}
})

test('late errors, premature finish, foreign sessions and disconnects never return partial audio',async()=>{
  for(const kind of ['failed','premature','foreign','closed','malformed','binary-error']){
    const server=await endpoint((ws,p)=>{
      if(p.event===1)ws.send(serverFrame(50,'c'))
      if(p.event===100){ws.send(serverFrame(150,p.id));if(kind==='premature')ws.send(serverFrame(152,p.id))}
      if(p.event===102){ws.send(serverFrame(352,p.id,'partial',{audio:true}));if(kind==='failed')ws.send(serverFrame(153,p.id,{status_code:45000000,message:'private-key'}));if(kind==='foreign')ws.send(serverFrame(152,'other'));if(kind==='closed')ws.close();if(kind==='malformed')ws.send(Buffer.from([0x11,0xb4,0,0]));if(kind==='binary-error'){const payload=Buffer.from('private-key');ws.send(Buffer.concat([Buffer.from([0x11,0xf0,0,0]),u32(45000000),u32(payload.length),payload]))}}
    })
    try{await assert.rejects(synthesizeDoubaoV3({cfg:cfg(server.url),req:req(),key:'private-key'}),e=>!e.message.includes('private-key')&&/Doubao/.test(e.message),kind)}finally{await server.close()}
  }
})

test('cancelling before finish sends CancelSession and rejects partial audio',async()=>{
  const controller=new AbortController(),events=[]
  const server=await endpoint((ws,p)=>{events.push(p.event);if(p.event===1)ws.send(serverFrame(50,'c'));if(p.event===100)ws.send(serverFrame(150,p.id));if(p.event===200)ws.send(serverFrame(352,p.id,'partial',{audio:true}))})
  async function* text(){yield '正在說話';await new Promise(()=>{})}
  try{await assert.rejects(synthesizeDoubaoV3({cfg:cfg(server.url),req:{...req(),textChunks:text(),onAudioChunk:()=>controller.abort()},key:'key',signal:controller.signal}),/cancelled/);await new Promise(r=>setTimeout(r,20));assert.ok(events.includes(101));assert.ok(!events.includes(102))}finally{await server.close()}
})

test('timeout closes a stalled handshake and handshake errors do not expose secrets',async()=>{
  const server=await endpoint(()=>{})
  try{await assert.rejects(synthesizeDoubaoV3({cfg:{...cfg(server.url),timeoutMs:30},req:req(),key:'secret'}),/timed out/)}finally{await server.close()}
  const httpServer=http.createServer();httpServer.on('upgrade',(_req,socket)=>socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));httpServer.listen(0,'127.0.0.1');await once(httpServer,'listening')
  try{await assert.rejects(synthesizeDoubaoV3({cfg:cfg('ws://127.0.0.1:'+httpServer.address().port),req:req(),key:'secret'}),e=>e.message.includes('401')&&!e.message.includes('secret'))}finally{await new Promise(r=>httpServer.close(r))}
})

test('timestamp scope survives provider fallback and retained speech jobs; timestamp requests bypass audio-only cache',async()=>{
  const timing={provider:'doubao',scope:'segment',unit:'seconds',available:true,sentences:[sentence]}
  assert.deepEqual((await runChain(['a'],{a:async()=>({ok:true,audio:Buffer.alloc(100),timing})})).timing,timing)
  let calls=0
  const f=await hostFixture({chain:[{provider:'doubao',model:'seed-tts-2.0'}],cache:true,providerOptions:'{"doubao":{"timestamps":true}}'},()=>({doubao:async()=>{calls++;return {ok:true,provider:'doubao',audio:Buffer.alloc(100),mime:'audio/mpeg',timing}}}))
  try{for(let i=0;i<2;i++)assert.equal((await f.tools[0].execute({text:'你好。'},{session:{id:'timing'}})).ok,true);assert.equal(calls,2);const rows=(await f.read('/dsh-tts/pending')).items;const view=await f.read('/dsh-tts/job?id='+rows[0].jobId+'&sessionId=timing&clientId=fixture');assert.equal(view.timings[0].scope,'segment');assert.equal(view.timings[0].segmentIndex,0);assert.deepEqual(rows[0].timing,timing)}finally{f.close()}
})

test('HTTP chunked/SSE retains word timing and honestly marks missing timestamps',async()=>{
  for(const withTiming of [true,false]){
    let body
    const out=await synthesizeDoubaoV3({cfg:{providerOptions:'{"doubao":{"timestamps":true}}'},req:req(),key:'key',fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({code:0,data:Buffer.from('audio').toString('base64')})+'\n'+(withTiming?JSON.stringify({code:0,sentence})+'\n':'')+JSON.stringify({code:20000000}))}})
    assert.equal(body.req_params.audio_params.enable_timestamp,true);assert.equal(out.timing.available,withTiming);assert.equal(out.timing.sentences.length,withTiming?1:0)
  }
})

test('invalid transport and insecure external WebSocket URLs fail before opening a connection',async()=>{
  await assert.rejects(synthesizeDoubaoV3({cfg:{providerOptions:'{"doubao":{"transport":"guess"}}'},req:req(),key:'key'}),/unsupported transport/)
  await assert.rejects(synthesizeDoubaoV3({cfg:cfg('ws://external.example/tts'),req:req(),key:'key'}),/secure WebSocket/)
})

test('HTTP audio requires a completion marker instead of accepting a truncated stream',async()=>{
  await assert.rejects(readDoubaoAudio(new Response(JSON.stringify({code:0,data:Buffer.from('partial').toString('base64')}))),/session completion/)
  await assert.rejects(readDoubaoAudio(new Response(JSON.stringify({code:0,data:'abc'})+'\n'+JSON.stringify({code:20000000}))),/Invalid Doubao audio data/)
})
