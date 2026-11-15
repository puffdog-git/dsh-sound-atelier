const reasons={
 permission:['服務權限不足','請檢查通訊插件的帳號權限、可發送範圍與媒體權限。'],
 duration:['語音超過時長上限','請縮短回覆，或改用一般音訊附件；系統不會截斷內容。'],
 size:['音訊超過大小上限','請縮短內容或降低音訊大小；橋接輸入上限為 4 MiB。'],
 conversion:['音訊轉碼失敗','請確認音訊可讀取及轉碼引擎可用，再重新產生音訊。'],
 unavailable:['目前會話沒有可用出口','請啟用對應通訊插件，並在它的正式會話使用語音交付。'],
 context:['本回合沒有可用的交付範圍','請在原通訊會話重試；不要複製其他會話的目的地。'],
 unknown:['平台送達結果不明','請先確認平台是否已收到；系統不會自動重送或補送附件。'],
 rate:['服務暫時限制發送','請稍後再試，並檢查原通訊服務的發送頻率限制。'],
 synthesis:['語音合成失敗','請到 TTS 設定檢查目前服務、金鑰權限與可用音色。'],
 failed:['語音交付失敗','請檢查原通訊插件的狀態與紀錄；此處不顯示私人路徑或金鑰。'],
 cancelled:['語音工作已取消','工作已停止；若平台已開始傳輸，請先確認是否收到，避免重送。'],
}
export function failureReason(error={},stage='delivery'){
 const code=String(error.code||''),message=String(error.message||'')
 let key=error.name==='AbortError'||/cancel|abort/i.test(code)?'cancelled'
 :/uncertain|unknown/i.test(code)?'unknown'
 :/permission|forbidden|401|403/i.test(code)||/權限|权限|permission|forbidden|HTTP\s*[(:]?\s*(401|403)/i.test(message)?'permission'
 :/duration/i.test(code)||/時長|上限 \d+ 秒/.test(message)?'duration'
 :/too-large|size-limit|^size$/i.test(code)||/MiB|大小上限|檔案過大/.test(message)?'size'
 :/conversion|ffmpeg|codec/i.test(code)||/轉碼|格式轉換/.test(message)?'conversion'
 :/context|consumer/i.test(code)||/active IM delivery consumer|live Harness Session|交付範圍/i.test(message)?'context'
 :/unavailable|unknown-tool/i.test(code)||/沒有.*工具|正式會話|已停用|多個通訊出口|未啟用|未連線|通道未就緒|通道未就绪|not connected/i.test(message)?'unavailable'
 :/rate|429/i.test(code)||/rate.limit|429|限流|頻率限制/i.test(message)?'rate'
 :stage==='synthesis'?'synthesis':'failed'
 return {code:key,title:reasons[key][0],action:key==='permission'&&stage==='synthesis'?'請到 TTS 供應商設定檢查 API Key 的語音合成權限與模型存取權。':reasons[key][1]}
}
const states=new Set(['generating','queued','sent','attachment','failed','unknown','cancelled'])
const channels=new Set(['auto','onebot','qqbot','im','telegram','whatsapp','discord','matrix','feishu','qq','wecom','wecom-app','dingtalk','weixin','slack','email','imessage'])
export function createDiagnostics({max=30,now=Date.now}={}){
 let rows=[];const references=new Map()
 return {
  record(event){
   let channel=channels.has(event.channel)?event.channel:'auto'
   const id=references.get(event.artifactId)||event.id||event.artifactId
   if(typeof id!=='string'||!/^[\w-]{1,80}$/.test(id))return
   if(event.artifactId&&/^[\w-]{1,80}$/.test(event.artifactId))references.set(event.artifactId,id)
   const old=rows.find(r=>r.id===id),state=states.has(event.state)?event.state:'failed'
   if(channel==='auto'&&old)channel=old.channel
   const reason=['failed','unknown','cancelled'].includes(state)?failureReason({code:event.code||state,name:state==='cancelled'?'AbortError':''},event.stage):null
   const row={id,at:now(),channel,state,stage:event.stage==='synthesis'?'synthesis':'delivery',reason:reason||null}
   if(old)rows=rows.map(r=>r===old?row:r);else rows.unshift(row)
   rows=rows.slice(0,max)
   if(references.size>max*2){const live=new Set(rows.map(r=>r.id));for(const[k,v]of references)if(!live.has(v))references.delete(k)}
  },
  snapshot:()=>rows.map(r=>({...r,reason:r.reason?{...r.reason}:null})),
 }
}
