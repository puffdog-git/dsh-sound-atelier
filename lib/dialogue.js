import { chainCandidates } from './candidates.js'
import { joinAudio } from './audio-join.js'
import { splitSentencesWithOffsets } from './text.js'

export function validateDialogue(value) {
 if(!value||!Array.isArray(value.speakers)||!Array.isArray(value.turns)||value.speakers.length<1||value.speakers.length>16||value.turns.length<1||value.turns.length>100)throw Error('Dialogue requires 1–16 speakers and 1–100 turns')
 const ids=new Set()
 const speakers=value.speakers.map(s=>{if(!s||!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(s.id||'')||ids.has(s.id)||typeof s.voice!=='string'||!s.voice&&!s.referenceAsset||s.voice.length>256||s.referenceAsset!==undefined&&!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(s.referenceAsset))throw Error('Dialogue speaker IDs must be unique and voices required');ids.add(s.id);return {id:s.id,voice:s.voice,...(s.referenceAsset?{referenceAsset:s.referenceAsset}:{}),...(s.provider?{provider:String(s.provider)}:{}),...(s.model?{model:String(s.model)}:{})}})
 let size=0
 const turns=value.turns.map(t=>{if(!t||!ids.has(t.speaker)||typeof t.text!=='string'||!t.text.trim()||t.instruction!==undefined&&typeof t.instruction!=='string'||t.speed!==undefined&&(typeof t.speed!=='number'||t.speed<.5||t.speed>1.5))throw Error('Invalid dialogue turn');size+=Buffer.byteLength(t.text);if(size>256*1024)throw Error('Dialogue text exceeds size limit');return {speaker:t.speaker,text:t.text,instruction:(t.instruction||'').slice(0,2000),...(t.speed?{speed:t.speed}:{})}})
 return {speakers,turns}
}

export async function synthesizeDialogue(value,cfg,signal,synthesize) {
 const dialogue=validateDialogue(value),candidate=chainCandidates(cfg,'reply')[0]
 if(!candidate)throw Error('No dialogue provider configured')
 const provider=candidate.provider,model=candidate.model,mode=value.mode||'auto'
 if(!['auto','native','segments'].includes(mode))throw Error('Invalid dialogue mode')
 const common=dialogue.speakers.every(s=>(!s.provider||s.provider===provider)&&(!s.model||s.model===model))
 const native=common&&!candidate.cfg.chain?.[0]?.referenceAsset&&dialogue.speakers.every(s=>!s.referenceAsset)&&dialogue.turns.every(t=>(!t.speed||t.speed===1||provider==='inworld')&&(!t.instruction||provider!=='google-cloud'||/^gemini-.*tts/.test(model)))&&(provider==='fish'||provider==='inworld'&&model==='inworld-tts-2'||provider==='google'&&dialogue.speakers.length===2&&dialogue.speakers.every(s=>! /^(?:voice_|voicekey_)/.test(s.voice))||provider==='google-cloud'&&dialogue.speakers.length===2&&(/^gemini-.*tts/.test(model)||/Studio-MultiSpeaker/.test(candidate.voice)))
 if(mode==='native'&&!native)throw Error('Selected model has no native dialogue contract; choose segmented mode')
 if(native&&mode!=='segments'){
  const text=dialogue.turns.map(t=>t.text).join('\n')
  const out=await synthesize(text,{...candidate.cfg,chain:[{provider,model,voice:candidate.voice}]},signal,'reply',{skipClean:true,dialogue})
  const joined=await joinAudio([{audioBase64:out.audio.toString('base64'),mime:out.mime,timing:out.timing}],signal,{timeline:true})
  return {...out,...joined,dialogueMode:'native',speakerIds:dialogue.speakers.map(s=>s.id)}
 }
 const segments=[];let charStart=0
 for(const turn of dialogue.turns){
  signal?.throwIfAborted();const speaker=dialogue.speakers.find(s=>s.id===turn.speaker)
  const target=chainCandidates({...cfg,roles:{...cfg.roles,reply:{provider:speaker.provider||provider,model:speaker.model||model,voice:speaker.voice,instruction:turn.instruction}}},'reply')[0]
  const role='dialogue';const config={...target.cfg,chain:[{provider:target.provider,model:target.model,voice:speaker.voice,...((speaker.referenceAsset||target.cfg.chain?.[0]?.referenceAsset)?{referenceAsset:speaker.referenceAsset||target.cfg.chain[0].referenceAsset}:{})}],roles:{...cfg.roles,[role]:{instruction:turn.instruction}}}
  for(const piece of splitSentencesWithOffsets(turn.text,Math.min(Number(cfg.sentenceChars)||300,300))){
   const out=await synthesize(piece.text,config,signal,role,{skipClean:true})
   segments.push({text:piece.text,speaker:turn.speaker,synthesisSpeed:turn.speed||1,charStart:charStart+piece.charStart,charEnd:charStart+piece.charEnd,mime:out.mime,audioBase64:out.audio.toString('base64'),...(out.timing?{timing:out.timing}:{})})
  }
  charStart+=turn.text.length+1
 }
 const out=await joinAudio(segments,signal,{timeline:true})
 return {...out,provider:'dialogue',dialogueMode:'segments',speakerIds:dialogue.speakers.map(s=>s.id),segments:segments.map(({audioBase64,...s})=>s)}
}
