// Calibrate with observed synthesis latency. No extra provider calls are made.
export function createChunkPlanner(){
 const profiles=new Map()
 const key=cfg=>JSON.stringify([cfg.chain?.[0]?.provider,cfg.chain?.[0]?.model,cfg.localTtsBackend,cfg.localTtsFamily])
 function size(cfg){const ceiling=Math.min(300,Math.max(10,Number(cfg.sentenceChars)||300));if(cfg.adaptiveChunks===false)return ceiling;const p=profiles.get(key(cfg));return p?Math.min(ceiling,Math.max(60,Math.round(4000/p.msPerCharacter))):Math.min(ceiling,120)}
 function observe(cfg,text,item){if(!Number.isFinite(item.tookMs)||item.tookMs<=0||!text.length)return;const id=key(cfg),old=profiles.get(id),value=item.tookMs/Array.from(text).length;profiles.set(id,{msPerCharacter:old?old.msPerCharacter*.75+value*.25:value,samples:(old?.samples||0)+1});if(profiles.size>100)profiles.delete(profiles.keys().next().value)}
 return {size,observe,status:()=>[...profiles.values()].map(v=>({...v}))}
}
