// 「語音交付」頁：通道能力、格式限制與最近交付結果，以及兩個開關。
//
// 面板原本在獨立插件 dsh-speech-bridge 裡，1.0.2 起併入聲音工坊。
// 電腦上還裝著舊的獨立橋接時，60-settings-page.js 會優先用它註冊的面板。

// 語音交付的兩個開關：讀取與儲存都走聲音工坊自己的設定接口。
function SpeechDeliverySettings({ status, onChanged }) {
  const h = React.createElement
  const [config, setConfig] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const alive = React.useRef(true)
  const read = async () => {
    const response = await clientFetch('/dsh-sound-atelier/config', { cache: 'no-store', timeoutMs: 8000 })
    const data = await response.json()
    if (!response.ok || !data.ok) throw Error('無法讀取設定')
    return data
  }
  React.useEffect(() => {
    alive.current = true
    read()
      .then((data) => alive.current && setConfig(data.config))
      .catch((failure) => alive.current && setError(String(failure?.message || failure)))
    return () => {
      alive.current = false
    }
  }, [])
  const toggle = async (key) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const current = await read()
      const response = await clientFetch('/dsh-sound-atelier/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current.config, [key]: current.config[key] === false, revision: current.revision }),
        timeoutMs: 10000,
      })
      const saved = await response.json().catch(() => ({}))
      if (!response.ok || !saved.ok) throw Error(saved?.error?.message || '儲存失敗（HTTP ' + response.status + '）')
      if (alive.current) setConfig(saved.config)
      onChanged?.()
    } catch (failure) {
      if (alive.current) setError(String(failure?.message || failure))
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  const row = (key, title, help) =>
    h(
      'label',
      { className: 'sv-switch', key },
      h('input', {
        type: 'checkbox',
        'data-speech-bridge-setting': key,
        checked: config ? config[key] !== false : true,
        disabled: !config || busy,
        onChange: () => toggle(key),
      }),
      h('span', null, h('strong', null, title), h('small', { className: 'sv-muted' }, help)),
    )
  const sttPending = config && status && (config.speechBridgeExternalVoice !== false) !== (status.externalVoiceEnabled !== false)
  return h(
    'div',
    { className: 'sv-settings' },
    row(
      'speechBridgeEnabled',
      '讓 AI 用語音訊息回覆',
      '在 QQ（OneBot、QQBot）或 dsh-im 的對話裡，你要求語音回覆時，AI 會合成語音並用原本的通訊插件送出。沒有安裝這些通訊插件時不會有任何作用。',
    ),
    row(
      'speechBridgeExternalVoice',
      '提供 dsh-voice 作為語音辨識來源',
      '需要另外安裝並設定 dsh-voice。開啟只是多一個可選的來源，不會自動切換目前使用的語音辨識。變更後要重新啟動 DSH 才生效。',
    ),
    sttPending ? h('p', { className: 'sv-muted', role: 'status' }, '語音辨識來源的變更已儲存，重新啟動 DSH 後生效。') : null,
    status?.standalone
      ? h(
          'p',
          { className: 'sv-muted', role: 'status' },
          '偵測到另外安裝的 dsh-speech-bridge，目前由它提供語音交付。聲音工坊已內建相同功能，可以把它移除。',
        )
      : null,
    error ? h('p', { className: 'sv-error', role: 'alert' }, error) : null,
  )
}

const SpeechDeliveryPanel = (() => {
  const h=React.createElement
  const labels={generating:'合成中',queued:'已排程',sent:'已送出',attachment:'附件已送出',failed:'交付失敗',unknown:'結果不明',cancelled:'已取消'}
  const css=`.sv-settings{display:grid;gap:10px;margin:0 0 18px;padding:14px 16px;border:1px solid var(--sv-line);border-radius:14px}.sv-switch{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.sv-switch input{margin-top:5px;flex-shrink:0}.sv-switch span{display:flex;flex-direction:column;gap:2px;min-width:0}.sv-switch small{font-size:12px}.sv-panel{--sv-accent:var(--dsw-alias-brand-primary,#4d6bfe);--sv-line:var(--dsw-alias-border-l2,#8b9c9a35);color:var(--dsw-alias-label-primary,#203b37);max-width:1120px;padding:20px 4px 40px;font:14px/1.6 system-ui;overflow-wrap:anywhere}.sv-panel *{box-sizing:border-box}.sv-panel h2,.sv-panel h3,.sv-panel p{margin:0}.sv-panel button,.sv-panel input,.sv-panel select{font:inherit;color:inherit}.sv-panel button{cursor:pointer}.sv-top{display:flex;justify-content:space-between;align-items:start;gap:16px;margin-bottom:22px}.sv-top h2{font-size:25px;letter-spacing:.04em}.sv-muted{opacity:.7;font-size:13px}.sv-btn{background:transparent;border:1px solid var(--sv-line);border-radius:10px;padding:8px 15px;white-space:nowrap}.sv-btn:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 7%,transparent)}.sv-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.sv-metric{border:1px solid var(--sv-line);border-radius:14px;padding:16px;background:linear-gradient(120deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 5%,transparent),transparent)}.sv-metric strong{font-size:27px;display:block;line-height:1.3}.sv-note{border-left:3px solid var(--sv-accent);padding:12px 15px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 4%,transparent);border-radius:0 10px 10px 0;margin:16px 0}.sv-badge{display:inline-flex;font-size:12px;border-radius:20px;padding:3px 10px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 9%,transparent);color:var(--sv-accent);white-space:nowrap}.sv-badge.warn{color:#9c6419;background:#c18c2520}.sv-badge.bad{color:#b74e48;background:#b74e4818}.sv-tabs{display:flex;gap:8px;border-bottom:1px solid var(--sv-line);margin:24px 0 16px}.sv-tabs button{border:0;background:transparent;padding:10px 16px;border-bottom:3px solid transparent}.sv-tabs button[aria-current=page]{color:var(--sv-accent);border-bottom-color:var(--sv-accent);font-weight:700}.sv-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:16px}.sv-filters label{display:flex;flex-direction:column;gap:5px;font-size:12px}.sv-filters input,.sv-filters select{background:transparent;border:1px solid var(--sv-line);border-radius:9px;padding:8px 10px;max-width:100%;min-width:0}.sv-filters label:first-child{flex:1;min-width:170px}.sv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(285px,100%),1fr));gap:12px}.sv-card{border:1px solid var(--sv-line);border-radius:14px;padding:17px;background:var(--dsw-alias-bg-layer-3,transparent)}.sv-card-head{display:flex;justify-content:space-between;gap:8px;align-items:start}.sv-card h3{font-size:16px}.sv-spec{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 12px}.sv-spec span{display:block;font-size:11px;opacity:.65}.sv-spec strong{font-size:14px}.sv-card details{font-size:12px;margin:12px 0}.sv-card summary{cursor:pointer;color:var(--sv-accent)}.sv-card footer{border-top:1px solid var(--sv-line);padding-top:10px;font-size:12px;opacity:.7}.sv-results{display:grid;gap:10px}.sv-result{border:1px solid var(--sv-line);border-radius:12px;padding:16px}.sv-result p{margin-top:8px}.sv-empty{text-align:center;border:1px dashed var(--sv-line);border-radius:14px;padding:36px 18px}.sv-error{padding:14px;border:1px solid #b74e4870;border-radius:12px;color:#b74e48}.sv-panel :focus-visible{outline:3px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:3px}@media(max-width:500px){.sv-panel{padding:12px 0 24px}.sv-metrics{gap:7px}.sv-metric{padding:12px 9px}.sv-metric strong{font-size:23px}.sv-metric span{font-size:11px}.sv-top h2{font-size:22px}.sv-filters label{flex:1;min-width:100px}.sv-tabs button{padding:10px}.sv-card{padding:15px}}@media(prefers-color-scheme:dark){.sv-panel{--sv-accent:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary,#e2eee9)}.sv-panel option{background:#182923;color:#e2eee9}}`
  function Panel({active=true}){
   const [data,setData]=React.useState(null),[error,setError]=React.useState(''),[tab,setTab]=React.useState('channels'),[filter,setFilter]=React.useState('all'),[search,setSearch]=React.useState(''),[onlyFailures,setOnlyFailures]=React.useState(false),[updated,setUpdated]=React.useState('')
   const current=React.useRef(null),alive=React.useRef(true)
   const load=React.useCallback(async()=>{
    if(current.current)return
    const controller=new AbortController();current.current=controller;const timer=setTimeout(()=>controller.abort(),10000)
    try{const r=await fetch('/dsh-sound-atelier/speech-bridge/status',{credentials:'same-origin',signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error();const out=await r.json();if(!out.ok||!Array.isArray(out.catalog))throw Error();if(!alive.current)return;setData(out);setError('');setUpdated(new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))}catch{if(alive.current)setError(controller.signal.aborted?'讀取狀態逾時，請稍後按「更新」重試。':'無法讀取交付狀態，請稍後按「更新」重試。')}finally{clearTimeout(timer);if(current.current===controller)current.current=null}
   },[])
   React.useEffect(()=>{if(!active)return;alive.current=true;load();const timer=setInterval(()=>{if(!document.hidden)load()},5000);return()=>{alive.current=false;clearInterval(timer);current.current?.abort()}},[load,active])
   const catalog=data?.catalog||[],recent=data?.recent||[],failed=recent.filter(r=>['failed','unknown'].includes(r.state)),shown=catalog.filter(c=>(filter==='all'||filter==='native'&&c.native||filter==='attachment'&&!c.native)&&`${c.name} ${c.source} ${c.format}`.toLowerCase().includes(search.toLowerCase())),results=onlyFailures?failed:recent
   const nameFor=id=>catalog.find(c=>c.channel===id)?.name||({auto:'自動選擇',im:'dsh-im',onebot:'OneBot',qqbot:'QQBot'})[id]||'其他通道'
   const badge=(text,kind)=>h('span',{className:'sv-badge '+(kind||'')},text)
   return h('section',{className:'sv-panel','aria-label':'語音交付狀態'},h('style',null,css),
    h('header',{className:'sv-top'},h('div',null,h('h2',null,'語音交付'),h('p',{className:'sv-muted'},'查看通道格式、限制與最近交付結果。')),h('button',{type:'button',className:'sv-btn',onClick:load},'更新')),
    error?h('p',{className:'sv-error',role:'alert'},error):null,
    h(SpeechDeliverySettings,{status:data,onChanged:load}),
    !data&&!error?h('p',{role:'status'},'正在讀取通道能力…'):null,
    data?h(React.Fragment,null,
     h('div',{className:'sv-card-head'},badge(!data.deliveryEnabled?'語音交付已關閉':data.deliveryReady||data.standalone?'語音交付已就緒':'語音交付尚未就緒',data.deliveryEnabled&&(data.deliveryReady||data.standalone)?'':'warn'),h('span',{className:'sv-muted'},'最後更新 ',updated)),
     h('div',{className:'sv-metrics'},[[catalog.filter(c=>c.native).length,'原生語音介面'],[catalog.filter(c=>!c.native).length,'附件交付通道'],[failed.length,'失敗或結果不明']].map(([n,label])=>h('div',{className:'sv-metric',key:label},h('strong',null,n),h('span',null,label)))),
     h('div',{className:'sv-note'},'已排程 ≠ 已送達。原生語音只在支援的通道使用；超過上限會拒絕，不會截斷句尾。',h('p',{className:'sv-muted'},data.imLoaded?'dsh-im 語音擴充已載入；帳號連線由原通訊插件確認。':'dsh-im 語音擴充尚未載入；下列顯示已實作的能力，啟用原插件後才能交付。')),
     h('nav',{className:'sv-tabs','aria-label':'語音交付頁籤'},[['channels','通道能力'],['recent','最近交付']].map(([id,title])=>h('button',{type:'button',key:id,'aria-current':tab===id?'page':undefined,onClick:()=>setTab(id)},title))),
     tab==='channels'?h(React.Fragment,null,
      h('div',{className:'sv-filters'},h('label',null,'搜尋通道',h('input',{type:'search',value:search,placeholder:'例如：微信、Discord','aria-label':'搜尋通道',onChange:e=>setSearch(e.target.value)})),h('label',null,'交付類型',h('select',{value:filter,'aria-label':'交付類型',onChange:e=>setFilter(e.target.value)},h('option',{value:'all'},'全部通道'),h('option',{value:'native'},'原生語音'),h('option',{value:'attachment'},'音訊附件')))),
      h('div',{className:'sv-grid'},shown.length?shown.map(c=>h('article',{className:'sv-card',key:c.id},h('div',{className:'sv-card-head'},h('div',null,h('h3',null,c.name),h('p',{className:'sv-muted'},c.source)),badge(c.native?'原生語音':'音訊附件',c.native?'':'warn')),h('div',{className:'sv-spec'},h('div',null,h('span',null,'單則時長'),h('strong',null,c.maxSeconds?c.maxSeconds+' 秒':c.native?'依平台限制':'依附件限制')),h('div',null,h('span',null,'橋接輸入上限'),h('strong',null,'4 MiB'))),h('p',null,c.format),h('details',null,h('summary',null,'格式與限制說明'),h('p',null,c.limitNote),h('p',null,c.note)),h('footer',null,c.availability==='not-loaded'?'語音擴充未載入':c.availability==='loaded'?'擴充已載入 · 連線由原插件確認':'由目前通訊會話確認可用性'))):h('p',{className:'sv-empty'},'沒有符合條件的通道。'))
     ):h(React.Fragment,null,h('div',{className:'sv-filters'},h('label',{style:{display:'flex',flexDirection:'row',alignItems:'center'}},h('input',{type:'checkbox',checked:onlyFailures,onChange:e=>setOnlyFailures(e.target.checked)}),'僅顯示失敗或結果不明')),h('p',{className:'sv-muted'},'只保留本次啟動最近 30 筆狀態，不保存文字、錄音、收件人或私人路徑。'),h('div',{className:'sv-results'},results.length?results.map(r=>h('article',{className:'sv-result',key:r.id},h('div',{className:'sv-card-head'},h('strong',null,nameFor(r.channel)),badge(labels[r.state]||'待確認',['failed','unknown'].includes(r.state)?'bad':r.state==='queued'?'warn':'')),h('small',{className:'sv-muted'},new Date(r.at).toLocaleString('zh-TW')),r.reason?h(React.Fragment,null,h('p',null,h('strong',null,r.reason.title)),h('p',null,r.reason.action)):r.state==='queued'?h('p',null,'音訊已交給本回合流程，等待通訊插件的送達結果。'):null)):h('div',{className:'sv-empty'},h('strong',null,onlyFailures?'目前沒有失敗紀錄':'還沒有語音交付紀錄'),h('p',{className:'sv-muted'},'使用通訊會話的語音回覆工具後，狀態會出現在這裡。'))))
    ):null)
  }
  return Panel
})()
