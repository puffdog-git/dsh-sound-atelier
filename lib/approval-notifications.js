export function createApprovalNotifications({now=Date.now}={}){
 const seen=new Map()
 function accept(sessionId,event,cfg){
  if(!cfg.announceApproval||!['approval/asked','approval/decided','question/requested'].includes(event.type))return null
  if(event.type==='approval/decided'&&!cfg.announceApprovalDecided)return null
  const data=event.data||{},id=String(data.approvalId||data.approval?.id||data.id||data.questionId||'')
  // Without an upstream ID, dedupe only identical event payloads briefly; never
  // suppress unrelated approvals for the lifetime of the process.
  const key=[sessionId,event.type,id||JSON.stringify([data.toolName,data.status,data.decision,data.text])].join('|'),last=seen.get(key)
  if(last!==undefined&&now()-last<(id?24*3600000:3000))return null
  seen.set(key,now());for(const[k,t]of seen)if(now()-t>24*3600000||seen.size>2048)seen.delete(k)
  const decided=event.type==='approval/decided',question=event.type==='question/requested'
  const text=question?cfg.questionText:decided?(cfg.approvalDecidedText||'已收到批准決定'):(cfg.approvalText||'需要你的批准')+(data.toolName?': '+String(data.toolName).slice(0,200):'')
  if(!text)return null
  return {text,policy:decided?'idle-only':cfg.approvalInterrupt===false?'queue':'interrupt',role:'approval',approvalId:id||null}
 }
 return {accept}
}
