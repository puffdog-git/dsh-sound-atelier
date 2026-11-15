const rows=[
 ['telegram','Telegram','Ogg Opus',120,'保留主題與引用回覆'],
 ['whatsapp','WhatsApp','Ogg Opus',120,'以 PTT 語音便箋交付'],
 ['discord','Discord','Ogg Opus',120,'包含時長與波形'],
 ['matrix','Matrix','Ogg Opus',120,'語音外觀依客戶端擴充支援'],
 ['feishu','飛書','Ogg Opus',120,'保留討論串回覆'],
 ['qq','QQ','MP3',120,'由 QQ SDK 處理語音上傳'],
 ['wecom','企微機器人','AMR-NB',60,'使用官方 SDK 的語音訊息'],
 ['wecom-app','企微自建應用','AMR-NB',60,'使用應用語音訊息接口'],
 ['dingtalk','釘釘','AMR-NB',60,'使用語音模板，時長以毫秒傳遞'],
 ['weixin','微信 iLink','Tencent SILK',60,'依官方專案協定接線；尚無真平台驗收'],
 ['slack','Slack','原音訊附件',null,'目前通道使用檔案上傳，非原生語音泡泡'],
 ['email','Email','原音訊附件',null,'電子郵件附件不提供聊天語音泡泡'],
 ['imessage','iMessage','原音訊附件',null,'目前通道未提供原生語音便箋接口'],
]
export function channelCatalog({imLoaded=false,reported=[]}={}){
 return rows.map(([id,name,format,maxSeconds,note])=>{
  const report=reported.find(r=>r.id===id),native=maxSeconds!==null
  return {id:'im:'+id,channel:id,name,source:'dsh-im',native,format,maxSeconds:native?(report?.maxSeconds||maxSeconds):null,maxBytes:4*1024*1024,availability:imLoaded?'loaded':'not-loaded',note,limitNote:native?'本機交付上限，超限拒絕，不截斷':'受附件大小及平台限制；不套用原生語音時長上限'}
 }).concat([
  {id:'onebot',channel:'onebot',name:'OneBot',source:'獨立通訊插件',native:true,format:'MP3 → OneBot record',maxSeconds:null,maxBytes:4*1024*1024,availability:'session',note:'權限與可用性由目前會話的 OneBot 工具確認',limitNote:'時長依 NapCat 等後端限制'},
  {id:'qqbot',channel:'qqbot',name:'QQBot',source:'獨立通訊插件',native:true,format:'MP3 → QQ voice',maxSeconds:null,maxBytes:4*1024*1024,availability:'session',note:'權限與可用性由目前會話的 QQBot 工具確認',limitNote:'時長及回覆時效依 QQ 平台限制'},
 ])
}
