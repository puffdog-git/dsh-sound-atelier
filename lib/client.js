// 建置產物：由 tools/build-client.mjs 從 lib/client-src/ 產生；請修改來源後重新建置。
window.__ModuleLoader__.load({
  id: 'dsh-sound-atelier',
  factory: (require) => {
// ---- styles.css
const SET_CSS = "/* dsh-tts 設定介面樣式。色彩取宿主 --dsw-* 變數，深淺色跟隨宿主。 */\n.dts-wrap, .dts-page, .dts-menu {\n  --dts-accent: var(--dsw-alias-brand-primary, #4d6bfe);\n  --dts-accent-soft: color-mix(in srgb, var(--dts-accent) 11%, transparent);\n  /* 強調色底上的文字色。宿主的強調色可能是白或黑（單色主題），不能寫死白字。 */\n  --dts-on-accent: var(--dsw-alias-bg-layer-3, light-dark(#ffffff, #1c1f23));\n  --dts-line: var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 14%, transparent));\n}\n.dts-wrap [hidden]{display:none!important}\n.dts-studio-page{display:flex;flex-direction:column;gap:18px}\n.dts-studio-nav{display:flex;gap:8px;overflow:auto;padding:6px;border-radius:16px;background:var(--dsw-alias-bg-layer-2,light-dark(#eef2f5,#24282d))}\n.dts-studio-nav button{flex:1;white-space:nowrap;border:0;border-radius:11px;padding:12px 16px;background:transparent;color:inherit;cursor:pointer}\n.dts-studio-nav button[aria-current]{background:var(--dts-accent);color:#fff;box-shadow:0 3px 12px color-mix(in srgb,var(--dts-accent) 15%,transparent)}\n.dts-source-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}\n.dts-source-choices button{display:flex;flex-direction:column;gap:10px;text-align:left;padding:22px;border:1px solid var(--dts-line);border-radius:18px;background:transparent;color:inherit;cursor:pointer}\n.dts-source-choices button[aria-pressed=true]{border-color:var(--dts-accent);background:var(--dts-accent-soft);box-shadow:inset 0 0 0 1px var(--dts-accent)}\n.dts-source-choices strong{font-size:18px}\n.dts-source-choices span{font-size:13px;line-height:1.7;opacity:.75}\n.dts-bindings{overflow:auto}\n.dts-bindings table{width:100%;border-collapse:collapse;font-size:13px}\n.dts-bindings th,.dts-bindings td{text-align:left;padding:12px;border-bottom:1px solid var(--dts-line)}\n.dts-foot{position:sticky;bottom:0;z-index:3;backdrop-filter:blur(15px);background:var(--dsw-alias-bg-layer-3,light-dark(#ffffffed,#1c1f23ed));padding:14px;border-radius:14px;border:1px solid var(--dts-line)}\n.dts-wrap{display:flex;flex-direction:column;gap:18px;padding:4px 0 24px;max-width:900px}\n.dts-header{display:flex;flex-direction:column;gap:8px;padding-bottom:14px;border-bottom:1px solid var(--dsw-alias-border-l2)}\n.dts-page{padding:0}\n.dts-page-title{font-size:20px;font-weight:700;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:10px}\n.dts-page-sub{font-size:13px;color:var(--dsw-alias-label-secondary);line-height:1.5}\n.dts-block{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}\n.dts-h{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);display:flex;align-items:center;justify-content:space-between}\n.dts-sub{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.4}\n.dts-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none}\n.dts-head{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}\n.dts-headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}\n.dts-title{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}\n.dts-chev{margin-left:auto;color:var(--dsw-alias-label-secondary);flex:none;transition:transform .16s}\n.dts-chevOpen{transform:rotate(180deg)}\n.dts-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:12px 0}\n.dts-field{display:flex;flex-direction:column;gap:6px;padding:6px 0;font-size:13px;color:var(--dsw-alias-label-primary)}\n.dts-input{height:34px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font-size:13px;box-sizing:border-box}\n.dts-catalog{width:100%;min-width:0;display:grid;gap:10px;margin:12px 0}\n.dts-catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.dts-catalog-field{display:grid;gap:6px;min-width:0}\n.dts-catalog-field .dts-input{width:100%}\n.dts-catalog-label{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}\n.dts-catalog-label small{font-size:11px;opacity:.7}\n.dts-catalog-tools{display:flex;flex-wrap:wrap;gap:8px}\n.dts-catalog-tools input{flex:1;min-width:160px}\n.dts-extras summary{cursor:pointer;padding:8px 0}\n.dts-foot{position:sticky;bottom:0;z-index:2;background:var(--dsw-alias-bg-layer-2);padding:12px!important;border-radius:10px;box-shadow:0 -4px 16px #0000000a}\n.dts-entry{padding:16px!important}\n.dts-row{flex-wrap:wrap}\n.dts-page{max-width:1000px;margin:auto}\n@media(max-width:600px){.dts-catalog-grid{grid-template-columns:1fr}\n}\n.dts-tune{width:100%;box-sizing:border-box;display:grid;gap:16px;padding:20px;margin:12px 0;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-2)}\n.dts-tune-header,.dts-tune-label,.dts-tune-ends{display:flex;justify-content:space-between;align-items:center;gap:12px}\n.dts-tune-slider{display:grid;gap:8px}\n.dts-tune-slider input{width:100%;accent-color:var(--dsw-alias-brand-primary,#5b8def);cursor:pointer}\n.dts-tune-slider input:disabled{cursor:not-allowed;opacity:.4}\n.dts-tune-label output{font-variant-numeric:tabular-nums;font-weight:600;min-width:70px;text-align:right}\n.dts-tune-ends{font-size:11px;opacity:.65}\n.dts-tune>.dts-btn{justify-self:start}\n.dts-studio-hero{position:relative;padding:24px!important;margin-bottom:16px;border-radius:16px;background:var(--dts-accent-soft);overflow:hidden}\n.dts-studio-mark{display:flex;align-items:center;gap:4px;margin-bottom:10px;height:40px}\n.dts-studio-mark span{width:5px;border-radius:6px;background:var(--dsw-alias-brand-primary,#7f9eff)}\n.dts-studio-status{font-size:12px;opacity:.75;margin-top:12px;overflow-wrap:anywhere}\n.dts-studio-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}\n.dts-studio-action{display:grid;gap:8px;justify-items:start;text-align:left;padding:16px;border:1px solid var(--dsw-alias-border-l2,#555);border-radius:12px;background:var(--dsw-alias-bg-layer-2,light-dark(#f5f7fa,#222));color:inherit;cursor:pointer}\n.dts-studio-action[aria-pressed=true]{background:var(--dts-accent-soft);border-color:var(--dsw-alias-brand-primary,#7f9eff)}\n.dts-studio-action-icon{font-size:22px;color:var(--dsw-alias-brand-primary,#7f9eff)}\n.dts-studio-action small{opacity:.7}\n.dts-btn[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary,#7f9eff)}\n@media(max-width:480px){.dts-studio-actions{grid-template-columns:1fr}\n.dts-studio-action{display:flex;align-items:center}\n}\n.dts-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}\n.dts-foot{border-top:1px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:14px 0 4px}\n.dts-save{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:6px 16px;font-size:13px;font-weight:500;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);transition:all .15s ease}\n.dts-save:hover:not(:disabled){opacity:0.88}\n.dts-btn{appearance:none;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 12px;font-size:13px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all .15s ease}\n.dts-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-2));border-color:var(--dsw-alias-label-dimmed, var(--dsw-alias-border-l2))}\n.dts-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent)}\n.dts-btn-danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent)}\n.dts-karaoke-active{background:var(--dsw-alias-bg-hover, rgba(128,128,128,0.2)) !important;border-radius:4px;transition:background .2s ease}\n.dts-entry{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2)}\n.dts-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.dts-row .dts-model{flex:1;min-width:120px}\n.dts-row .dts-key{flex:1;min-width:180px}\n.dts-mini{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:6px;width:28px;height:28px;cursor:pointer;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:13px;transition:all .15s ease}\n.dts-mini:hover:not(:disabled){background:var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-2))}\n.dts-ok{font-size:12px;color:var(--dsw-alias-state-success-primary);font-weight:500}\n.dts-bad{font-size:12px;color:var(--dsw-alias-state-error-primary);font-weight:500}\n.dts-badge{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-weight:500}\n.dts-badge-on{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent)}\n.dts-badge-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent)}\n.dts-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}\n.dts-link{background:none;border:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;padding:0;text-decoration:underline}\n.dts-link:hover:not(:disabled){color:var(--dsw-alias-label-primary)}\n.dts-alert{padding:10px 14px;border-radius:8px;font-size:13px}\n.dts-alert-err{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);color:var(--dsw-alias-state-error-primary);border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 20%, transparent)}\n.dts-alert-warn{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);color:var(--dsw-alias-state-warn-primary);border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent)}\n.dts-alert-ok{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary);border:1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 20%, transparent)}\n.dts-act{box-sizing:border-box;width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));display:inline-flex;align-items:center;justify-content:center;padding:6px;cursor:pointer;border:none;border-radius:var(--dsw-radius-sm, 8px);background:none;color:var(--dsw-alias-label-tertiary);transition:background .15s ease,color .15s ease}\n.dts-act:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}\n.dts-act:active{background:color-mix(in srgb, var(--dsw-alias-label-secondary) 16%, transparent)}\n.dts-act[data-active]{color:var(--dsw-alias-brand-primary)}\n.dts-act[data-active]:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}\n.dts-act:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}\n.dts-act svg{width:calc(17px + var(--dsh-content-font-delta,0px));height:calc(17px + var(--dsh-content-font-delta,0px));display:block}\n@keyframes dts-act-pulse{0%,100%{opacity:.35}\n50%{opacity:1}\n}\n.dts-act[data-busy] [data-wave]{animation:dts-act-pulse 1.1s ease-in-out infinite}\n.dts-act[data-busy] [data-wave=\"2\"]{animation-delay:.22s}\n.dts-menu{position:fixed;z-index:2147483000;box-sizing:border-box;min-width:210px;max-width:300px;max-height:min(64vh, 460px);overflow:hidden;padding:6px;display:flex;flex-direction:column;gap:2px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-alias-shadow-menu, 0 12px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent), 0 2px 6px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent));font-size:13px;line-height:1.4}\n.dts-menu-item{display:flex;align-items:center;gap:8px;box-sizing:border-box;width:100%;padding:7px 10px;border:none;border-radius:8px;background:none;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}\n.dts-menu-item:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}\n.dts-menu-item:disabled{opacity:.42;cursor:default}\n.dts-menu-item span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dts-menu-list{display:flex;flex-direction:column;gap:2px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}\n.dts-menu-list::-webkit-scrollbar{width:8px}\n.dts-menu-list::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}\n.dts-menu-list::-webkit-scrollbar-track{background:transparent}\n.dts-menu-text{flex:none;width:100%;box-sizing:border-box;padding:6px 10px;border:none;border-radius:8px;background:none;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dts-menu-text:hover{background:var(--dsw-alias-interactive-bg-hover)}\n[data-actions-reveal]:has(.dts-transport) [class*=\"actions\"]{opacity:1 !important}\n.dts-transport{display:inline-flex;align-items:center;gap:2px;margin-left:4px;order:999}\n.dts-tbtn{box-sizing:border-box;width:27px;height:27px;display:inline-flex;align-items:center;justify-content:center;padding:4px;border:none;border-radius:7px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background .15s ease,color .15s ease}\n.dts-tbtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}\n.dts-tbtn:disabled{opacity:.38;cursor:default}\n.dts-tbtn svg{width:16px;height:16px;display:block}\n.dts-grow{flex:1;min-width:100px}\n.dts-page,.dts-wrap{min-width:0;container-type:inline-size}\n.dts-wrap button:not(.dts-act):not(.dts-mini),.dts-page>[role=tablist] button{flex-shrink:0;white-space:nowrap}\n.dts-studio-nav{flex-wrap:wrap;overflow:visible}\n.dts-studio-nav button{flex:1 0 auto}\n.dts-source-choices{grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr))}\n.dts-wrap .dts-source-choices button,.dts-wrap .dts-studio-action{white-space:normal!important;min-width:0}\n.dts-source-choices strong,.dts-source-choices span{max-width:100%;overflow-wrap:anywhere}\n.dts-wrap .dts-head{white-space:normal!important;min-width:0;max-width:100%}\n.dts-headText{overflow-wrap:anywhere}\n.dts-wrap .dts-row{min-width:0}\n.dts-wrap .dts-input{max-width:100%;box-sizing:border-box}\n@container(max-width:600px){.dts-catalog-grid{grid-template-columns:1fr}\n.dts-studio-actions{grid-template-columns:1fr}\n.dts-studio-action{display:flex;align-items:center;flex-wrap:wrap}\n.dts-tune{padding:12px}\n}\n\n/* ---- 改版新增 ---- */\n.dts-studio-head{padding-bottom:12px}\n.dts-studio-head .dts-studio-status{margin-top:4px}\n.dts-start{display:grid;gap:10px;padding:14px 16px;border-radius:12px;background:var(--dts-accent-soft);border:1px solid color-mix(in srgb,var(--dts-accent) 30%,transparent)}\n.dts-start-steps{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:dts-step}\n.dts-start-steps li{counter-increment:dts-step;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}\n.dts-start-steps li::before{content:counter(dts-step);flex:none;width:22px;height:22px;border-radius:99px;display:grid;place-items:center;font-size:12px;font-weight:650;border:1.5px solid var(--dts-accent);color:var(--dts-accent)}\n.dts-start-steps li[data-done=true]::before{content:\"✓\";background:var(--dts-accent);color:var(--dts-on-accent)}\n.dts-start-steps li>div{flex:1 1 220px;min-width:0;display:grid;gap:2px}\n.dts-start-steps li span{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5}\n.dts-toggle-list{display:grid}\n.dts-toggle-row{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--dts-line)}\n.dts-toggle-row:last-child{border-bottom:0;padding-bottom:0}\n.dts-toggle-row>div{min-width:0;display:grid;gap:2px}\n.dts-toggle-row strong{font-size:14px;font-weight:600}\n.dts-toggle-row small{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5}\n.dts-switch{position:relative;flex:none;width:36px;height:20px;border-radius:99px;border:0;padding:0;cursor:pointer;background:color-mix(in srgb,currentColor 22%,transparent);transition:background .16s}\n.dts-switch::after{content:\"\";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:99px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .16s}\n.dts-switch[aria-checked=true]{background:var(--dts-accent)}\n.dts-switch[aria-checked=true]::after{transform:translateX(16px)}\n.dts-switch:disabled{opacity:.45;cursor:not-allowed}\n.dts-state{display:flex;gap:10px;align-items:center;justify-content:center;padding:28px 16px;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dts-line);border-radius:12px}\n.dts-spinner{width:18px;height:18px;border-radius:99px;border:2px solid var(--dts-line);border-top-color:var(--dts-accent);animation:dts-spin .8s linear infinite}\n@keyframes dts-spin{to{transform:rotate(360deg)}}\n@media(prefers-reduced-motion:reduce){.dts-spinner{animation:none}}\n.dts-wrap :focus-visible,.dts-page :focus-visible{outline:2px solid var(--dts-accent);outline-offset:2px}\n.dts-studio-nav{gap:4px;padding:4px;border-radius:12px}\n.dts-studio-nav button{padding:9px 14px;border-radius:8px;font-size:13px;font-weight:560;color:var(--dsw-alias-label-secondary)}\n.dts-studio-nav button[aria-current]{background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary);font-weight:650;box-shadow:0 1px 2px rgba(0,0,0,.14)}\n.dts-source-choices button{padding:16px 18px;border-radius:14px;gap:6px}\n.dts-source-choices strong{font-size:15px}\n.dts-page>[role=tablist] .dts-btn[aria-selected=true]{background:var(--dts-accent-soft);border-color:color-mix(in srgb,var(--dts-accent) 45%,transparent);color:var(--dts-accent);font-weight:640}\n.dts-save{background:var(--dts-accent);color:var(--dts-on-accent);padding:8px 18px;font-weight:600}\n.dts-bad[role=alert]{flex:1 1 100%;order:-1;padding:8px 12px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}\n.dts-studio-nav button[aria-current]{background:var(--dts-accent-soft);color:var(--dts-accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dts-accent) 40%,transparent)}\n\n/* 進階設定：欄位依用途分組並排成多欄 */\n/* 新版 Chromium 把折疊區內容包在 ::details-content 內，格線要設在那一層；舊版則直接設在 details。 */\n@supports selector(::details-content){.dts-extras[open]::details-content{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:6px 24px;align-items:start}}\n@supports not selector(::details-content){.dts-extras[open]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:6px 24px;align-items:start}}\n.dts-extras[open]>summary,.dts-extras[open]>.dts-group-title,.dts-extras[open]>.dts-block,.dts-extras[open]>details,.dts-extras[open]>div:not(.dts-field){grid-column:1/-1}\n.dts-group-title{margin-top:10px;padding-top:12px;border-top:1px solid var(--dts-line);font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary)}\n.dts-extras>summary+.dts-group-title{margin-top:0;border-top:0;padding-top:4px}\n.dts-field:has(>input[type=checkbox]){display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center}\n.dts-field:has(>input[type=checkbox])>input{grid-row:1;grid-column:1;margin:0}\n.dts-field:has(>input[type=checkbox])>.dts-sub{grid-column:2}\n.dts-field>.dts-input{width:100%}\n.dts-btn[aria-pressed=true]{background:var(--dts-accent-soft);border-color:color-mix(in srgb,var(--dts-accent) 50%,transparent);color:var(--dts-accent);font-weight:640}\n\n/* 服務順序：主要服務以強調色標示，備援較低調 */\n.dts-entry{border-radius:12px;gap:10px}\n.dts-entry[data-primary=true]{border-color:color-mix(in srgb,var(--dts-accent) 45%,transparent);box-shadow:inset 3px 0 0 var(--dts-accent)}\n.dts-entry>.dts-h{font-size:14px}\n.dts-entry[data-primary=true]>.dts-h{color:var(--dts-accent)}\n.dts-entry>.dts-row>select.dts-input{flex:1 1 200px;min-width:0}\n.dts-mini{border-radius:8px}\n.dts-mini:disabled,.dts-btn:disabled,.dts-save:disabled{opacity:.45;cursor:not-allowed}\n.dts-input{min-height:34px}\nselect.dts-input{cursor:pointer;color-scheme:inherit}\n\n/* 各服務的專屬參數區塊：欄位兩欄並排，標題、說明與其他元件佔滿整列 */\n.dts-studio-page>.dts-block:has(>.dts-field~.dts-field){display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:8px 24px;align-items:start}\n.dts-studio-page>.dts-block:has(>.dts-field~.dts-field)>:not(.dts-field){grid-column:1/-1}\n.dts-field:has(>textarea){grid-column:1/-1}\n.dts-field>textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}\n.dts-switch[aria-checked=true]::after{background:var(--dts-on-accent)}\n.dts-studio-nav button[aria-current],.dts-page>[role=tablist] .dts-btn[aria-selected=true],.dts-btn[aria-pressed=true]{background:color-mix(in srgb,currentColor 14%,transparent);border-color:color-mix(in srgb,currentColor 45%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 22%,transparent);color:var(--dsw-alias-label-primary)}\n.dts-source-choices button[aria-pressed=true]{border-color:color-mix(in srgb,currentColor 55%,transparent);background:color-mix(in srgb,currentColor 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 55%,transparent)}\n.dts-entry[data-primary=true]>.dts-h{color:var(--dsw-alias-label-primary)}\n\n/* 儲存列：沒有未儲存的變更時留在頁面最下方，不固定、不遮內容 */\n.dts-foot[data-dirty=false]{position:static;box-shadow:none;backdrop-filter:none;background:transparent;border-color:transparent}\n.dts-foot[data-dirty=true]{box-shadow:0 8px 24px rgba(0,0,0,.18);border:1px solid var(--dts-line)}\n.dts-foot-note{margin-right:auto;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}\n/* 快速開始：改為淡底加外框，淺色主題下不會是一大塊灰 */\n.dts-start{background:color-mix(in srgb,currentColor 3%,transparent);border-color:var(--dts-line)}\n.dts-start-steps li::before{border-color:color-mix(in srgb,currentColor 45%,transparent);color:var(--dsw-alias-label-secondary)}\n\n/* 音色試聽牆、用量表、設定搜尋 */\n.dts-voice-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:8px}\n.dts-voice-card{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);min-width:0}\n.dts-voice-card[data-selected=\"true\"]{border-color:var(--dsw-alias-state-success-primary)}\n.dts-voice-name{flex:1 1 100%;min-width:0;font-size:13px;font-weight:500;overflow-wrap:anywhere}\n.dts-voice-name small{display:block;font-weight:400;color:var(--dsw-alias-label-secondary);font-size:11px}\n.dts-usage-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}\n.dts-usage-table th,.dts-usage-table td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums}\n.dts-search{display:flex;flex-direction:column;gap:6px;margin:10px 0}\n.dts-search-results{display:flex;flex-wrap:wrap;gap:6px}\n.dts-search-results .dts-btn small{margin-left:6px;color:var(--dsw-alias-label-secondary);font-size:11px}\n.dts-search-hit{outline:2px solid var(--dsw-alias-state-warn-primary);outline-offset:3px;border-radius:6px;transition:outline-color .3s}\n\n/* 語音交付頁的 Discord 連線卡 */\n.dts-link-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}\n.dts-link-row:last-of-type{border-bottom:0}\n.dts-link-label{font-size:13px;min-width:120px}\n.dts-link-row .dts-badge{white-space:normal;text-align:right;max-width:100%}\n";
// ---- 01-locale-store.js
var module = { exports: {} }
var exports = module.exports

// UI-only dictionary: never convert configuration values, prompts or chat payloads.
const UiReact = require('react')
const uiLocaleKey = Symbol.for('dsh.voice.ui.locale.v1')
const uiLocale =
  window[uiLocaleKey] ||
  (window[uiLocaleKey] = (() => {
    let language = 'zh-Hant'
    try {
      if (localStorage.getItem('dsh.voice.ui.locale') === 'zh-Hans') language = 'zh-Hans'
    } catch {}
    const listeners = new Set()
    const store = {
      dictionary: Object.create(null),
      get: () => language,
      subscribe(fn) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
      set(next) {
        if (!['zh-Hant', 'zh-Hans'].includes(next) || next === language) return
        language = next
        try {
          localStorage.setItem('dsh.voice.ui.locale', next)
        } catch {}
        for (const fn of listeners) fn()
      },
    }
    window.addEventListener?.('storage', (event) => {
      if (event.key === 'dsh.voice.ui.locale') store.set(event.newValue || 'zh-Hant')
    })
    return store
  })())
// OpenCC-JS 1.4.2: MIT code, Apache-2.0 dictionary. See UI-LOCALE-NOTICE.md.
// ---- 02-opencc.vendor.js
    if (!uiLocale.convert) { let openccConvert = null; const buildOpencc = () => { const module={exports:{}}; const exports=module.exports;
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((n="undefined"!=typeof globalThis?globalThis:n||self).OpenCC={})}(this,function(n){"use strict";class e{constructor(){this.map=new Map}addWord(n,e){let{map:t}=this;for(const e of n){const n=e.codePointAt(0),r=t.get(n);if(null==r){const e=new Map;t.set(n,e),t=e}else t=r}t.trie_val=e}loadDict(n){if("string"==typeof n){n=n.split("|");for(const e of n){const[n,t]=e.split(" ");if("string"!=typeof t)throw new TypeError('Invalid dictionary entry: expected string entries to use "source replacement" format.');this.addWord(n,t)}}else for(const e of n){if(!Array.isArray(e)||"string"!=typeof e[0]||"string"!=typeof e[1])throw new TypeError("Invalid dictionary entry: expected [source, replacement] pairs. If you are passing locale dictionaries to ConverterFactory, spread them, for example: ConverterFactory(...Locale.from.cn, ...Locale.to.hk).");const[n,t]=e;this.addWord(n,t)}}loadDictGroup(n){n.slice().reverse().forEach(n=>{this.loadDict(n)})}matchPrefix(n,e){const t=n.length;let r,o=this.map,i=0;for(let a=e;a<t;){const e=n.codePointAt(a);a+=e>65535?2:1;const t=o.get(e);if(void 0===t)break;o=t;const l=o.trie_val;void 0!==l&&(i=a,r=l)}return i>0?{end:i,value:r}:null}segment(n){const e=n.length,t=[];let r=null;for(let i=0;i<e;){const e=this.matchPrefix(n,i);e?(null!==r&&(t.push(n.slice(r,i)),r=null),t.push(n.slice(i,e.end)),i=e.end):(null===r&&(r=i),i+=o(n,i))}return null!==r&&t.push(n.slice(r,e)),t}convert(n){const e=n.length,t=[];let r=null;for(let i=0;i<e;){const e=this.matchPrefix(n,i);e?(null!==r&&(t.push(n.slice(r,i)),r=null),t.push(e.value),i=e.end):(null===r&&(r=i),i+=o(n,i))}return null!==r&&t.push(n.slice(r,e)),t.join("")}}function t(n,e){return n.codePointAt(e)>65535?2:1}function r(n,e){const o=function(n){return n>=12272&&n<=12273?2:n>=12274&&n<=12275?3:n>=12276&&n<=12287?2:0}(n.codePointAt(e));if(0===o)return 0;let i=e+t(n,e);for(let e=0;e<o;e+=1){if(i>=n.length)return 0;i=r(n,i)||i+t(n,i)}return i}function o(n,e){const o=r(n,e);return o>e?o-e:t(n,e)}function i(...n){const t=function(n){return n.flatMap(n=>{if(function(n){return Array.isArray(n)&&n.every(c)}(n))return n;if(c(n))return[n];if(!Array.isArray(n))throw new TypeError("Invalid ConverterFactory argument: expected a dictionary group or locale dictionary collection.");const e=[];let t=0;for(;t<n.length&&c(n[t]);)e.push(n[t].slice()),t+=1;const r=n.slice(t);return e.length>0&&r.length>0&&r.every(l)?(e[e.length-1].push(...r),e):[n]})}(n).map(n=>{const t=new e;return t.loadDictGroup(n),t});return function(n){return t.reduce((n,e)=>e.convert(n),n)}}function a(n){return Array.isArray(n)&&"string"==typeof n[0]&&"string"==typeof n[1]}function l(n){return"string"==typeof n||Array.isArray(n)&&n.every(a)}function c(n){return Array.isArray(n)&&n.every(n=>function(n){return"string"==typeof n&&(""===n||n.includes(" "))}(n)||Array.isArray(n)&&n.every(a))}function s(n){return i([n])}function u(n,e,t,r){return{convert:function(){!function e(o,i){if(o.nodeType!==Node.ELEMENT_NODE||!o.classList.contains("ignore-opencc")){if(o.lang===t?(i=!0,o.shouldChangeLang=!0,o.lang=r):o.lang&&o.lang.length&&(i=!1),i){if("SCRIPT"===o.tagName)return;if("STYLE"===o.tagName)return;"META"===o.tagName&&"description"===o.name||"META"===o.tagName&&"keywords"===o.name?(null==o.originalContent&&(o.originalContent=o.content),o.content=n(o.originalContent)):"IMG"===o.tagName?(null==o.originalAlt&&(o.originalAlt=o.alt),o.alt=n(o.originalAlt)):"INPUT"===o.tagName&&"button"===o.type&&(null==o.originalValue&&(o.originalValue=o.value),o.value=n(o.originalValue)),o.nodeType===Node.ELEMENT_NODE&&(o.hasAttribute("placeholder")&&(null==o.originalPlaceholder&&(o.originalPlaceholder=o.getAttribute("placeholder")),o.setAttribute("placeholder",n(o.originalPlaceholder))),o.hasAttribute("aria-label")&&(null==o.originalAriaLabel&&(o.originalAriaLabel=o.getAttribute("aria-label")),o.setAttribute("aria-label",n(o.originalAriaLabel))))}for(const t of o.childNodes)t.nodeType===Node.TEXT_NODE&&i?(null==t.originalString&&(t.originalString=t.nodeValue),t.nodeValue=n(t.originalString)):e(t,i)}}(e,!1)},restore:function(){!function n(e){if(e.nodeType!==Node.ELEMENT_NODE||!e.classList.contains("ignore-opencc")){e.shouldChangeLang&&(e.lang=t),void 0!==e.originalString&&(e.nodeValue=e.originalString),"META"===e.tagName&&"description"===e.name||"META"===e.tagName&&"keywords"===e.name?void 0!==e.originalContent&&(e.content=e.originalContent):"IMG"===e.tagName?void 0!==e.originalAlt&&(e.alt=e.originalAlt):"INPUT"===e.tagName&&"button"===e.type&&void 0!==e.originalValue&&(e.value=e.originalValue),void 0!==e.originalPlaceholder&&e.setAttribute("placeholder",e.originalPlaceholder),void 0!==e.originalAriaLabel&&e.setAttribute("aria-label",e.originalAriaLabel);for(const t of e.childNodes)n(t)}}(e)}}}var f="一口吃個 一口喫個|一口吃成 一口喫成|一家三口 一家三口|一家五口 一家五口|一家六口 一家六口|一家四口 一家四口|一針 一針|一針見血 一針見血|三針 三針|丟巧針 丟巧針|丹稜 丹稜|九針 九針|亂針繡 亂針繡|仙台 仙台|倒扣針兒 倒扣針兒|做針線 做針線|八字方針 八字方針|刀割針扎 刀割針扎|分針 分針|別針 別針|刺胳針 刺胳針|刺針 刺針|北港島綫 北港島線|十針 十針|南港島綫 南港島線|南針 南針|反時針 反時針|口吃 口吃|台山 台山|台山市 台山市|台州 台州|台州地區 台州地區|台州市 台州市|吃口 喫口|吃口令 吃口令|吃口飯 喫口飯|吃吃 喫喫|吃子 喫子|向風針 向風針|唱針 唱針|啄針兒 啄針兒|嗎啡針 嗎啡針|大政方針 大政方針|大海撈針 大海撈針|大頭針 大頭針|天台 天台|天台女 天台女|天台宗 天台宗|天台山 天台山|天台縣 天台縣|太乙神針 太乙神針|奇台 奇台|女人心海底針 女人心海底針|定南針 定南針|定風針 定風針|將軍澳綫 將軍澳線|對針 對針|小針 小針|小針美容 小針美容|屯馬綫 屯馬線|平針縫 平針縫|幾針 幾針|引線穿針 引線穿針|張口 張口|張柏芝 張柏芝|張栢芝 張栢芝|張飛穿針 張飛穿針|強心針 強心針|弼針 弼針|彈針 彈針|懸針 懸針|懸針垂露 懸針垂露|手腕式指北針 手腕式指北針|扎針 扎針|打完針 打完針|打針 打針|披針形葉 披針形葉|抵針 抵針|拈針指 拈針指|指北針 指北針|指南針 指南針|指揮台 指揮台|指針 指針|指針式 指針式|探針 探針|控制台 控制台|插針 插針|搖針 搖針|搗針 搗針|撞針 撞針|擺針 擺針|收針 收針|教育方針 教育方針|敹一針 敹一針|方針 方針|時針 時針|暈針 暈針|曲別針 曲別針|東九龍綫 東九龍線|東海撈針 東海撈針|東涌綫 東涌線|東鐵綫 東鐵線|松針 松針|枝針 枝針|桑針 桑針|棒針 棒針|棒針衫 棒針衫|棘針 棘針|棘針科 棘針科|棘針門 棘針門|機場快綫 機場快線|步線行針 步線行針|毒針 毒針|毛線針 毛線針|毫針 毫針|水底撈針 水底撈針|沙中綫 沙中線|注射針 注射針|注射針頭 注射針頭|洗面皂 洗面皂|洗髮皂 洗髮皂|浙江天台縣 浙江天台縣|海底撈針 海底撈針|港島綫 港島線|漏針 漏針|炮台山循道衛理中學 炮台山循道衛理中學|無線新聞台 無線新聞台|無針不引線 無針不引線|無針注射器 無針注射器|燔針 燔針|留針 留針|皂化 皂化|皂莢 皂莢|皂莢樹 皂莢樹|皂角 皂角|短針 短針|石針 石針|硬肥皂 硬肥皂|磁針 磁針|磨杵成針 磨杵成針|磨針溪 磨針溪|磨鐵成針 磨鐵成針|秒針 秒針|秧針 秧針|穆稜 穆稜|穿針 穿針|穿針引線 穿針引線|穿針走線 穿針走線|紋光針 紋光針|細針密縷 細針密縷|絞包針 絞包針|給個棒錘當針認 給個棒錘當針認|綏稜 綏稜|綿裏藏針 綿裏藏針|綿裏針 綿裏針|縫衣針 縫衣針|縫針 縫針|縫針補線 縫針補線|縫針跡 縫針跡|總方針 總方針|繃針 繃針|繡花針 繡花針|繡花針兒 繡花針兒|繡針 繡針|羅盤針 羅盤針|美白針 美白針|耳針 耳針|肥皂 肥皂|肥皂劇 肥皂劇|肥皂泡 肥皂泡|肥皂粉 肥皂粉|肥皂絲 肥皂絲|肥皂莢 肥皂莢|胃口 胃口|胸針 胸針|臺灣台 臺灣台|船不漏針漏針沒外人 船不漏針漏針沒外人|花兒針 花兒針|茅針 茅針|荃灣綫 荃灣線|葉針 葉針|藏針縫 藏針縫|藥皂 藥皂|藥針 藥針|蛇口蜂針 蛇口蜂針|螫針 螫針|蠻針瞎灸 蠻針瞎灸|補血針 補血針|補針 補針|見縫插針 見縫插針|觀塘綫 觀塘線|討針線 討針線|象牙針尖 象牙針尖|賀爾蒙針 賀爾蒙針|跳針 跳針|蹇吃 蹇吃|軟肥皂 軟肥皂|迪士尼綫 迪士尼線|迴紋針 迴紋針|退針 退針|逆時針 逆時針|避雷針 避雷針|郭台成 郭台成|郭台銘 郭台銘|鄧艾吃 鄧艾吃|金針 金針|金針山 金針山|金針度人 金針度人|金針花 金針花|金針菇 金針菇|金針菜 金針菜|釘書針 釘書針|針具 針具|針刺 針刺|針刺麻醉 針刺麻醉|針劑 針劑|針孔 針孔|針孔攝影機 針孔攝影機|針孔照像 針孔照像|針孔照像機 針孔照像機|針孔現象 針孔現象|針對 針對|針對性 針對性|針對於 針對於|針尖 針尖|針尖兒 針尖兒|針工 針工|針布 針布|針形葉 針形葉|針指 針指|針挑刀挖 針挑刀挖|針梳機 針梳機|針氈 針氈|針法 針法|針炙 針炙|針狀 針狀|針狀物 針狀物|針盤 針盤|針眼 針眼|針眼子 針眼子|針神 針神|針筆 針筆|針筆匠 針筆匠|針筒 針筒|針箍 針箍|針箍兒 針箍兒|針線 針線|針線包 針線包|針線娘 針線娘|針線活 針線活|針線活計 針線活計|針線盒 針線盒|針線箔籬 針線箔籬|針織 針織|針織品 針織品|針織廠 針織廠|針織料 針織料|針腳 針腳|針葉 針葉|針葉林 針葉林|針葉植物 針葉植物|針葉樹 針葉樹|針針見血 針針見血|針釦 針釦|針鋒 針鋒|針鋒相對 針鋒相對|針鋒相投 針鋒相投|針鋩 針鋩|針頭 針頭|針餌莫減 針餌莫減|針骨 針骨|針魚 針魚|針黹 針黹|針黹紡績 針黹紡績|針鼴 針鼴|針鼻 針鼻|針鼻兒 針鼻兒|釦針 釦針|鉤針 鉤針|銀針 銀針|鋼針 鋼針|錶針 錶針|鐵針 鐵針|長針 長針|開口 開口|防疫針 防疫針|電唱針 電唱針|電針 電針|電針麻醉 電針麻醉|面皂 面皂|頂針 頂針|頂針兒 頂針兒|頂針捱住 頂針捱住|頂門針 頂門針|順時針 順時針|預防針 預防針|領帶針 領帶針|風向針 風向針|飛針走線 飛針走線|香皂 香皂|骨針 骨針|髮針 髮針|鬼針草 鬼針草|鳳台 鳳台|鹽水針 鹽水針|麻醉針 麻醉針|黃成 黃成|鼻針療法 鼻針療法|齧蘗吞針 齧蘗吞針|龍應台 龍應台",g="偽 僞|兑 兌|卧 臥|叁 叄|台 臺|吃 喫|唇 脣|啟 啓|囱 囪|媪 媼|媯 嬀|悦 悅|愠 慍|户 戶|捝 挩|揾 搵|敍 敘|敚 敓|枱 檯|枴 柺|棁 梲|榅 榲|氲 氳|涚 涗|温 溫|溈 潙|潀 潨|濕 溼|灶 竈|為 爲|煴 熅|痴 癡|皂 皁|眾 衆|秘 祕|税 稅|稜 棱|粧 妝|粽 糉|糭 糉|綫 線|緼 縕|缽 鉢|脱 脫|腽 膃|葱 蔥|蒀 蒕|蒍 蔿|藴 蘊|蜕 蛻|衞 衛|衹 只|説 說|踴 踊|輼 轀|醖 醞|針 鍼|鈎 鉤|鋭 銳|閲 閱|鰛 鰮",d="丹尼·波爾 丹尼·博伊爾|伊利諾 伊利諾伊|伊利諾州 伊利諾伊州|伊力·卡山 伊利亞·卡贊|伺服器 服務器|佐治·古尼 喬治·克魯尼|作業系統 操作系統|保羅·夏傑斯 保羅·哈吉斯|保羅·湯馬士·安德遜 保羅·托馬斯·安德森|北卡羅萊納 北卡羅來納|北卡羅萊納州 北卡羅來納州|南卡羅萊納 南卡羅來納|南卡羅萊納州 南卡羅來納州|占士·金馬倫 詹姆斯·卡梅隆|古利姆·迪托路 吉列爾莫·德爾托羅|史提夫·麥昆 史蒂夫·麥奎因|史提芬·史匹堡 斯蒂芬·斯皮爾伯格|嘉芙蓮·碧格露 凱瑟琳·畢格羅|基斯杜化·路蘭 克里斯托弗·諾蘭|大衛·連 大衛·利恩|奇連·伊士活 克林特·伊斯特伍德|奇雲·高士拿 凱文·科斯特納|奧克拉荷馬 俄克拉何馬|奧克拉荷馬州 俄克拉何馬州|奧利華·史東 奧利弗·斯通|威廉·佛烈金 威廉·弗萊德金|密芝根 密歇根|密芝根州 密歇根州|寬頻 寬帶|彼德·積遜 彼得·傑克遜|德薩斯 得克薩斯|德薩斯州 得克薩斯州|愛瑪·湯馬士 艾瑪·托馬斯|愛黛兒·羅曼斯基 阿黛爾·羅曼斯基|搜尋 搜索|朗·侯活 朗·霍華德|查理士·路雲 查爾斯·羅文|梳芙厘 舒芙蕾|森·曼特斯 山姆·曼德斯|概率 概率|機會率 概率|機率 幾率|法蘭絲·麥杜雯 弗朗西絲·麥克多曼德|活地·亞倫 伍迪·艾倫|游標 光標|湯賀柏 湯姆·霍伯|滑鼠 鼠標|珍·甘比茵 簡·坎皮恩|畢·彼特 布拉德·皮特|硬碟 硬盤|私隱權 隱私權|程式語言 編程語言|米克·尼高斯 邁克·尼科爾斯|米路·吉遜 梅爾·吉布森|米高·哈薩拿維斯 米歇爾·阿扎納維西於斯|米高·德格拉斯 邁克爾·道格拉斯|約瑟·曼基威士 約瑟夫·曼凱維奇|維珍尼亞 弗吉尼亞|維珍尼亞州 弗吉尼亞州|羅德島 羅得島|羅德島州 羅得島州|羅拔·淮斯 羅伯特·懷斯|羅拔·湛米基斯 羅伯特·澤米吉斯|羅拔·烈福 羅伯特·雷德福|艾力謝路·高沙里斯·依拿力圖 亞歷杭德羅·岡薩雷斯·伊納裏圖|華倫·比提 沃倫·比蒂|西維珍尼亞 西弗吉尼亞|西維珍尼亞州 西弗吉尼亞州|記憶體模組 內存條|資料夾 文件夾|賓·艾佛力 本·阿弗萊克|賓夕凡尼亞 賓夕法尼亞|賓夕凡尼亞州 賓夕法尼亞州|路蘭 諾蘭|辛·貝克 肖恩·貝克|馬利蘭 馬里蘭|馬利蘭州 馬里蘭州|馬田·史高西斯 馬丁·斯科塞斯|高安兄弟 科恩兄弟",p="一口吃個 一口喫個|一口吃成 一口喫成|一家三口 一家三口|一家五口 一家五口|一家六口 一家六口|一家四口 一家四口|一展長才 一展長才|一流人才 一流人才|一表人才 一表人才|一針 一針|一針見血 一針見血|七步之才 七步之才|七步奇才 七步奇才|三才 三才|三才圖會 三才圖會|三針 三針|上梁 上樑|上梁不正 上樑不正|上梁不正下梁歪 上樑不正下樑歪|上梁文 上樑文|下才 下才|下梁 下樑|不成才 不成才|不才 不才|不打不成才 不打不成才|不良才 不良才|丟巧針 丟巧針|中才 中才|中核 中核|丹稜 丹稜|主梁 主樑|之核 之核|九針 九針|乾奴才 乾奴才|亂針繡 亂針繡|二流人才 二流人才|亞核 亞核|人才 人才|人才出衆 人才出衆|人才外流 人才外流|人才庫 人才庫|人才流失 人才流失|人才濟濟 人才濟濟|人才輩出 人才輩出|人才難得 人才難得|人盡其才 人盡其才|什么 什麼|仙才 仙才|伊核 伊核|作育英才 作育英才|佳人才子 佳人才子|個核 個核|倒了核桃車子 倒了核桃車子|倒扣針兒 倒扣針兒|偏才 偏才|做針線 做針線|偷梁換柱 偷樑換柱|傲世輕才 傲世輕才|僅作參考 僅作參考|僅供參考 僅供參考|儲訓人才 儲訓人才|光脊梁 光脊樑|免參 免參|內參 內參|內核 內核|全才 全才|全程參加 全程參加|全面禁止核試驗條約 全面禁止核試驗條約|八字方針 八字方針|八斗之才 八斗之才|八斗才 八斗才|公才公望 公才公望|公衆參與 公衆參與|六才子書 六才子書|其核 其核|冠世之才 冠世之才|冰核 冰核|几案之才 几案之才|凡才 凡才|出倫之才 出倫之才|刀割針扎 刀割針扎|分針 分針|初露才華 初露才華|別針 別針|利弊參半 利弊參半|刺股懸梁 刺股懸樑|刺胳針 刺胳針|刺針 刺針|刺骨懸梁 刺骨懸樑|剋核 剋核|前核 前核|力薄才疏 力薄才疏|功過參半 功過參半|動如參商 動如參商|匡濟之才 匡濟之才|十針 十針|千噸級核武器 千噸級核武器|南針 南針|博學多才 博學多才|卯酉參辰 卯酉參辰|印核 印核|卵核 卵核|原子核 原子核|原核 原核|去核 去核|參予 參予|參事 參事|參伍 參伍|參佐 參佐|參假 參假|參兩院 參兩院|參前落後 參前落後|參加 參加|參加人 參加人|參加國 參加國|參加完 參加完|參加爲 參加爲|參加獎 參加獎|參加者 參加者|參劾 參劾|參半 參半|參合 參合|參同契 參同契|參商 參商|參團 參團|參堂 參堂|參場 參場|參天 參天|參奏 參奏|參孫 參孫|參宿 參宿|參宿七 參宿七|參將 參將|參展 參展|參展商 參展商|參展團 參展團|參差 參差|參差不齊 參差不齊|參差錯落 參差錯落|參度 參度|參悟 參悟|參戰 參戰|參戰國 參戰國|參拜 參拜|參拾壹 參拾壹|參拾陸 參拾陸|參政 參政|參政權 參政權|參數 參數|參數表 參數表|參會 參會|參朝 參朝|參本 參本|參校 參校|參演 參演|參照 參照|參照卡 參照卡|參照物 參照物|參照系 參照系|參看 參看|參知政事 參知政事|參破 參破|參禪 參禪|參綜 參綜|參考 參考|參考值 參考值|參考價 參考價|參考價值 參考價值|參考參考 參考參考|參考座標 參考座標|參考性 參考性|參考手冊 參考手冊|參考文獻 參考文獻|參考書 參考書|參考書目 參考書目|參考材料 參考材料|參考法 參考法|參考消息 參考消息|參考特藏 參考特藏|參考系 參考系|參考資料 參考資料|參股 參股|參與 參與|參與人員 參與人員|參與制 參與制|參與度 參與度|參與感 參與感|參與權 參與權|參與率 參與率|參與者 參與者|參衆兩院 參衆兩院|參見 參見|參見互照 參見互照|參見注 參見注|參觀 參觀|參觀券 參觀券|參觀參觀 參觀參觀|參觀團 參觀團|參觀團體 參觀團體|參觀完 參觀完|參觀者 參觀者|參訂 參訂|參訓 參訓|參訪 參訪|參訪團 參訪團|參評 參評|參話頭 參話頭|參請 參請|參謀 參謀|參謀總部 參謀總部|參謀總長 參謀總長|參謀長 參謀長|參謁 參謁|參譚 參譚|參議 參議|參議員 參議員|參議會 參議會|參議院 參議院|參賽 參賽|參賽國 參賽國|參賽權 參賽權|參賽片 參賽片|參賽者 參賽者|參贊 參贊|參軍 參軍|參辰 參辰|參辰卯酉 參辰卯酉|參辰日月 參辰日月|參透 參透|參道 參道|參選 參選|參選人 參選人|參酌 參酌|參量 參量|參量空間 參量空間|參錯 參錯|參閱 參閱|參院 參院|參雜 參雜|參靈 參靈|參革 參革|參預 參預|參頭 參頭|參驗 參驗|反時針 反時針|反核 反核|取才 取才|口吃 口吃|口才 口才|口才好 口才好|口才辨給 口才辨給|可供參考 可供參考|可憎才 可憎才|吃口 喫口|吃口令 吃口令|吃口飯 喫口飯|吃吃 喫喫|吃子 喫子|合著 合著|合著者 合著者|同參 同參|名著 名著|向風針 向風針|命世之才 命世之才|命世才 命世才|和核 和核|唐才常 唐才常|唱針 唱針|啄針兒 啄針兒|善才 善才|善才童子 善才童子|喜憂參半 喜憂參半|喝參 喝參|喫敲才 喫敲才|喬才 喬才|單核 單核|單核細胞增多症 單核細胞增多症|嗎啡針 嗎啡針|四才子 四才子|四核 四核|圈梁 圈樑|國家棟梁 國家棟樑|土參 土參|在橋梁工地上 在橋樑工地上|地核 地核|地面核爆炸 地面核爆炸|埋沒人才 埋沒人才|增量參數 增量參數|外才 外才|外核 外核|多么 多麼|多事逞才 多事逞才|多才 多才|多才多藝 多才多藝|多核 多核|大廈棟梁 大廈棟樑|大才 大才|大才小用 大才小用|大才槃槃 大才槃槃|大政方針 大政方針|大曆十才子 大曆十才子|大核 大核|大梁 大梁|大海撈針 大海撈針|大頭針 大頭針|天妒英才 天妒英才|天才 天才|天才兒童 天才兒童|天才出自勤奮 天才出自勤奮|天才型 天才型|天才教育 天才教育|天才橫溢 天才橫溢|天才論 天才論|天縱之才 天縱之才|太乙神針 太乙神針|奇才 奇才|奇才異能 奇才異能|女人心海底針 女人心海底針|女子參政主義 女子參政主義|女子參政權 女子參政權|女秀才 女秀才|女貌郎才 女貌郎才|奴才 奴才|好么 好麼|妙才 妙才|學優才贍 學優才贍|學淺才疏 學淺才疏|學疏才淺 學疏才淺|宏內核 宏內核|定南針 定南針|定風針 定風針|實才 實才|將才 將才|將遇良才 將遇良才|專才 專才|專業人才 專業人才|專門人才 專門人才|對針 對針|小丑跳梁 小丑跳樑|小才大用 小才大用|小才子 小才子|小秀才 小秀才|小秀才學堂 小秀才學堂|小醜跳梁 小醜跳樑|小針 小針|小針美容 小針美容|少年才俊 少年才俊|尺二秀才 尺二秀才|屈才 屈才|屋梁 屋樑|展才 展才|山梁 山樑|岑參 岑參|巨著 巨著|帶團參加 帶團參加|常用參考書 常用參考書|平梁 平樑|平針縫 平針縫|幹才 幹才|幾針 幾針|庸才 庸才|廩膳秀才 廩膳秀才|引線穿針 引線穿針|張口 張口|張飛穿針 張飛穿針|強心針 強心針|弼針 弼針|彈針 彈針|彗核 彗核|形名參同 形名參同|待著 待着|得失參半 得失參半|微核 微核|徵才 徵才|德才 德才|德才兼備 德才兼備|德薄才疏 德薄才疏|志大才疏 志大才疏|志大才短 志大才短|志廣才疏 志廣才疏|怎么 怎麼|恃才傲物 恃才傲物|恃才矜己 恃才矜己|恃才自專 恃才自專|惡名昭著 惡名昭著|意廣才疏 意廣才疏|愛才 愛才|愛才好士 愛才好士|愛才如命 愛才如命|愛才若渴 愛才若渴|憂喜參半 憂喜參半|憐才 憐才|懷才不遇 懷才不遇|懷才抱德 懷才抱德|懸梁 懸樑|懸梁刺股 懸樑刺股|懸梁自盡 懸樑自盡|懸臂梁 懸臂樑|懸針 懸針|懸針垂露 懸針垂露|成兆才 成兆才|成核 成核|戰術核武器 戰術核武器|戳脊梁 戳脊樑|戳脊梁骨 戳脊樑骨|手腕式指北針 手腕式指北針|才人 才人|才俊 才俊|才儲八斗 才儲八斗|才具 才具|才兼文武 才兼文武|才分 才分|才力 才力|才勇兼優 才勇兼優|才名 才名|才器 才器|才士 才士|才大難用 才大難用|才女 才女|才如史遷 才如史遷|才媛 才媛|才子 才子|才子佳人 才子佳人|才子書 才子書|才學 才學|才學兼優 才學兼優|才守 才守|才定 才定|才幹 才幹|才廣妨身 才廣妨身|才微智淺 才微智淺|才德 才德|才德兼備 才德兼備|才思 才思|才思敏捷 才思敏捷|才悟 才悟|才情 才情|才智 才智|才望 才望|才氣 才氣|才氣無雙 才氣無雙|才氣縱橫 才氣縱橫|才氣過人 才氣過人|才爲世出 才爲世出|才用 才用|才略 才略|才略過人 才略過人|才當曹斗 才當曹斗|才疏學淺 才疏學淺|才疏德薄 才疏德薄|才疏志大 才疏志大|才疏意廣 才疏意廣|才疏計拙 才疏計拙|才短氣粗 才短氣粗|才秀人微 才秀人微|才能 才能|才能幹濟 才能幹濟|才色 才色|才華 才華|才華出衆 才華出衆|才華橫溢 才華橫溢|才華洋溢 才華洋溢|才華蓋世 才華蓋世|才蔽識淺 才蔽識淺|才藝 才藝|才藝卓絕 才藝卓絕|才藝技能 才藝技能|才藝班 才藝班|才藝秀 才藝秀|才藻 才藻|才語 才語|才識 才識|才識過人 才識過人|才貌 才貌|才貌出衆 才貌出衆|才貌雙全 才貌雙全|才貫二酉 才貫二酉|才資 才資|才輕德薄 才輕德薄|才過子建 才過子建|才過屈宋 才過屈宋|才非玉潤 才非玉潤|才高八斗 才高八斗|才高意廣 才高意廣|才高氣傲 才高氣傲|才高行厚 才高行厚|才高行潔 才高行潔|扎針 扎針|打參 打參|打完針 打完針|打針 打針|扛大梁 扛大樑|披針形葉 披針形葉|抵針 抵針|拈針指 拈針指|拔地參天 拔地參天|指北針 指北針|指南針 指南針|指針 指針|指針式 指針式|挑大梁 挑大樑|挑正梁 挑正樑|捫參歷井 捫參歷井|捷才 捷才|掃眉才子 掃眉才子|探針 探針|提梁 提樑|插針 插針|揚己露才 揚己露才|搖針 搖針|搗針 搗針|撞針 撞針|撥亂之才 撥亂之才|撫梁易柱 撫樑易柱|擬核 擬核|擺針 擺針|收針 收針|放參 放參|教育方針 教育方針|敹一針 敹一針|文才 文才|文武全才 文武全才|文選爛秀才半 文選爛秀才半|斗筲之才 斗筲之才|斗轉參橫 斗轉參橫|方針 方針|日月參辰 日月參辰|早參 早參|昭著 昭著|時針 時針|晚參 晚參|晨參暮省 晨參暮省|晨參暮禮 晨參暮禮|晶核 晶核|暈針 暈針|暮禮晨參 暮禮晨參|曠世之才 曠世之才|曠世奇才 曠世奇才|曠世逸才 曠世逸才|曲別針 曲別針|曹參 曹參|曾參 曾參|曾參殺人 曾參殺人|月核 月核|月落參橫 月落參橫|有才 有才|有才幹 有才幹|有才無命 有才無命|有核 有核|朝參暮禮 朝參暮禮|朝核 朝核|木梁 木樑|未易才 未易才|朽木之才 朽木之才|杏核 杏核|東海撈針 東海撈針|松針 松針|板梁橋 板樑橋|林木參天 林木參天|果核 果核|枝針 枝針|架梁 架樑|架海金梁 架海金樑|柱梁 柱樑|核下 核下|核二廠 核二廠|核人 核人|核仁 核仁|核以 核以|核僵持 核僵持|核兒 核兒|核冬天 核冬天|核出口控制 核出口控制|核力 核力|核化 核化|核區 核區|核可 核可|核合成 核合成|核和 核和|核四 核四|核型 核型|核子 核子|核子廠 核子廠|核孔 核孔|核島 核島|核工 核工|核彈 核彈|核心 核心|核戰 核戰|核戰鬥部 核戰鬥部|核技術 核技術|核數 核數|核是 核是|核有 核有|核果 核果|核桃 核桃|核武 核武|核火箭發動機 核火箭發動機|核炫 核炫|核燃料後處理 核燃料後處理|核爆 核爆|核爆炸煙雲 核爆炸煙雲|核狀 核狀|核球 核球|核甘 核甘|核當量 核當量|核發 核發|核發電 核發電|核發電廠 核發電廠|核的 核的|核磁 核磁|核種 核種|核突 核突|核粒 核粒|核糖 核糖|核糖核酸 核糖核酸|核素 核素|核線 核線|核能 核能|核能技術 核能技術|核能發電 核能發電|核能發電廠 核能發電廠|核能電廠 核能電廠|核膜 核膜|核苷 核苷|核菌 核菌|核融合 核融合|核融合發電 核融合發電|核解 核解|核計劃 核計劃|核試 核試|核談 核談|核質 核質|核載 核載|核辦 核辦|核配 核配|核酪 核酪|核酶 核酶|核酸 核酸|核防禦 核防禦|核電 核電|核電廠 核電廠|核電磁脈衝 核電磁脈衝|核體 核體|核點 核點|桃核 桃核|桃核雕 桃核雕|桑針 桑針|梁上 樑上|梁上君子 樑上君子|梁子 樑子|梁木 梁木|梁木其壞 樑木其壞|梁架 樑架|梁柱 樑柱|梁棟 樑棟|梁龍 梁龍|梅核 梅核|棄核 棄核|棋逢對手將遇良才 棋逢對手將遇良才|棒針 棒針|棒針衫 棒針衫|棗核 棗核|棘針 棘針|棘針科 棘針科|棘針門 棘針門|棟梁 棟樑|棟梁之任 棟樑之任|棟梁之材 棟樑之材|棟梁之臣 棟樑之臣|椽梁 椽樑|極核 極核|槃才 槃才|槃槃大才 槃槃大才|樹梁 樹樑|橋梁 橋樑|橋梁工事 橋樑工事|橋梁工程 橋樑工程|橘核 橘核|橫打鼻梁兒 橫打鼻樑兒|橫梁 橫樑|檢核 檢核|檢核表 檢核表|歌聲繞梁 歌聲繞樑|正則參數 正則參數|正梁 正樑|步線行針 步線行針|歪才 歪才|歷練之才 歷練之才|殺才 殺才|毒針 毒針|比才 比才|毛線針 毛線針|毫針 毫針|氘核 氘核|水底撈針 水底撈針|求才 求才|求才若渴 求才若渴|江南四大才子 江南四大才子|江參 江參|江淹才盡 江淹才盡|江郎才盡 江郎才盡|沒梁桶 沒樑桶|沒脊梁 沒脊樑|河梁 河樑|沿才授職 沿才授職|注射針 注射針|注射針頭 注射針頭|泰山梁木 泰山樑木|洗面皂 洗面皂|洗髮皂 洗髮皂|洛陽才子 洛陽才子|津梁 津樑|派團參加 派團參加|海參威 海參威|海參崴 海參崴|海底撈針 海底撈針|滿腹才學 滿腹才學|漁梁 漁樑|漏針 漏針|潑才 潑才|澤梁 澤樑|濟世之才 濟世之才|濠梁 濠樑|無核 無核|無梁 無樑|無梁斗 無樑斗|無梁樓蓋 無樑樓蓋|無針不引線 無針不引線|無針注射器 無針注射器|煤核 煤核|熔核 熔核|熱核 熱核|燔針 燔針|片善小才 片善小才|物色人才 物色人才|特殊才能 特殊才能|狀態參數 狀態參數|狗才 狗才|獨挑大梁 獨挑大樑|率團參加 率團參加|玉參差 玉參差|玉尺量才 玉尺量才|王佐之才 王佐之才|玳梁 玳樑|玳瑁梁 玳瑁樑|瑣才 瑣才|甄才品能 甄才品能|甄選人才 甄選人才|甚么 甚麼|男才女貌 男才女貌|畎畝下才 畎畝下才|留針 留針|略無參商 略無參商|畫梁雕棟 畫樑雕棟|畫棟雕梁 畫棟雕樑|異才 異才|當世才度 當世才度|疑信參半 疑信參半|疑核 疑核|痔核 痔核|痛失英才 痛失英才|登庸人才 登庸人才|發展核武器 發展核武器|白鶴梁 白鶴梁|白鶴秀才 白鶴秀才|百萬噸級核武器 百萬噸級核武器|百里之才 百里之才|皂化 皂化|皂莢 皂莢|皂莢樹 皂莢樹|皂角 皂角|的核 的核|直接參與 直接參與|真才實學 真才實學|真核 真核|矜才使氣 矜才使氣|矜能負才 矜能負才|短針 短針|石梁 石樑|石針 石針|硬核 硬核|硬肥皂 硬肥皂|碌碌庸才 碌碌庸才|磁核 磁核|磁針 磁針|磨杵成針 磨杵成針|磨脊梁 磨脊樑|磨針溪 磨針溪|磨鐵成針 磨鐵成針|社交才能 社交才能|禁核 禁核|秀才 秀才|秀才不出門能知天下事 秀才不出門能知天下事|秀才人情 秀才人情|秀才作醫如菜作虀 秀才作醫如菜作虀|秀才造反 秀才造反|秒針 秒針|秧針 秧針|穆稜 穆稜|積極參加 積極參加|積極參與 積極參與|空梁落燕泥 空樑落燕泥|穿針 穿針|穿針引線 穿針引線|穿針走線 穿針走線|筆參造化 筆參造化|管理人才 管理人才|箱梁 箱樑|精核 精核|約核 約核|約翰參書 約翰參書|紋光針 紋光針|細針密縷 細針密縷|結核 結核|結核桿菌 結核桿菌|結梁子 結樑子|絕對參照 絕對參照|絕才 絕才|絞包針 絞包針|給個棒錘當針認 給個棒錘當針認|綏稜 綏稜|經世之才 經世之才|經國之才 經國之才|經濟之才 經濟之才|網羅人才 網羅人才|綿裏藏針 綿裏藏針|綿裏針 綿裏針|縫衣針 縫衣針|縫針 縫針|縫針補線 縫針補線|縫針跡 縫針跡|縱梁 縱樑|總參謀部 總參謀部|總參謀長 總參謀長|總方針 總方針|繃針 繃針|繞梁 繞樑|繞梁三日 繞樑三日|繞梁之音 繞樑之音|繞梁韻永 繞樑韻永|繡花針 繡花針|繡花針兒 繡花針兒|繡針 繡針|羅盤針 羅盤針|美國參議院 美國參議院|美才 美才|美白針 美白針|老奴才 老奴才|耐多藥結核病 耐多藥結核病|耳針 耳針|聯合參謀 聯合參謀|聰明才智 聰明才智|肥皂 肥皂|肥皂劇 肥皂劇|肥皂泡 肥皂泡|肥皂粉 肥皂粉|肥皂絲 肥皂絲|肥皂莢 肥皂莢|育才 育才|胃口 胃口|背梁骨 背樑骨|胡才勇 胡才勇|胸針 胸針|脊梁 脊樑|脊梁背 脊樑背|脊梁骨 脊樑骨|自學成才 自學成才|自核 自核|船不漏針漏針沒外人 船不漏針漏針沒外人|花兒針 花兒針|花旗參 花旗參|英才 英才|英才俊偉 英才俊偉|茂才 茂才|茂才異等 茂才異等|茅針 茅針|茲核 茲核|菌核 菌核|菲才寡學 菲才寡學|落月屋梁 落月屋樑|葉針 葉針|著作 著作|著名 著名|著式 著式|著志 著志|著於 著於|著書 著書|著白 著白|著稱 著稱|著稱於世 著稱於世|著者 著者|著述 著述|著錄 著錄|蓋世之才 蓋世之才|藏針縫 藏針縫|藥皂 藥皂|藥針 藥針|蘋果核 蘋果核|蛇口蜂針 蛇口蜂針|螫針 螫針|蠹啄剖梁柱 蠹啄剖樑柱|蠻針瞎灸 蠻針瞎灸|行短才喬 行短才喬|行短才高 行短才高|補血針 補血針|補針 補針|製麵 製麪|西洋參 西洋參|要么 要麼|見縫插針 見縫插針|討針線 討針線|詠雪之才 詠雪之才|詩才 詩才|誇才賣智 誇才賣智|說參請 說參請|請參閱 請參閱|謊敲才 謊敲才|謝絕參觀 謝絕參觀|識多才廣 識多才廣|識才 識才|識才尊賢 識才尊賢|譭譽參半 譭譽參半|豎柱上梁 豎柱上樑|豎起脊梁 豎起脊樑|象牙針尖 象牙針尖|豬八戒喫人參果 豬八戒喫人參果|負才 負才|負才任氣 負才任氣|負才使氣 負才使氣|賀爾蒙針 賀爾蒙針|賢才 賢才|賤才 賤才|超世之才 超世之才|趫才 趫才|跳梁 跳樑|跳梁小丑 跳樑小丑|跳梁小醜 跳樑小醜|跳梁猖獗之小丑 跳樑猖獗之小丑|跳梁猖獗之小醜 跳樑猖獗之小醜|跳針 跳針|蹇吃 蹇吃|身才 身才|軟肥皂 軟肥皂|輇才 輇才|輕核 輕核|辯才 辯才|辯才天 辯才天|辯才無礙 辯才無礙|这么 这麼|迴紋針 迴紋針|退針 退針|逆時針 逆時針|這么 這麼|通人達才 通人達才|通才 通才|通才教育 通才教育|通才練識 通才練識|造就人才 造就人才|逸才 逸才|逸羣之才 逸羣之才|過人才略 過人才略|過梁 過樑|違紀參選 違紀參選|適才 適才|選才 選才|選民參加率 選民參加率|遺才 遺才|避雷針 避雷針|邊核 邊核|那么 那麼|郎才女姿 郎才女姿|郎才女貌 郎才女貌|鄧艾吃 鄧艾吃|野無遺才 野無遺才|量才錄用 量才錄用|金針 金針|金針山 金針山|金針度人 金針度人|金針花 金針花|金針菇 金針菇|金針菜 金針菜|釘書針 釘書針|針具 針具|針刺 針刺|針刺麻醉 針刺麻醉|針劑 針劑|針孔 針孔|針孔攝影機 針孔攝影機|針孔照像 針孔照像|針孔照像機 針孔照像機|針孔現象 針孔現象|針對 針對|針對性 針對性|針對於 針對於|針尖 針尖|針尖兒 針尖兒|針工 針工|針布 針布|針形葉 針形葉|針指 針指|針挑刀挖 針挑刀挖|針梳機 針梳機|針氈 針氈|針法 針法|針炙 針炙|針狀 針狀|針狀物 針狀物|針盤 針盤|針眼 針眼|針眼子 針眼子|針神 針神|針筆 針筆|針筆匠 針筆匠|針筒 針筒|針箍 針箍|針箍兒 針箍兒|針線 針線|針線包 針線包|針線娘 針線娘|針線活 針線活|針線活計 針線活計|針線盒 針線盒|針線箔籬 針線箔籬|針織 針織|針織品 針織品|針織廠 針織廠|針織料 針織料|針腳 針腳|針葉 針葉|針葉林 針葉林|針葉植物 針葉植物|針葉樹 針葉樹|針針見血 針針見血|針釦 針釦|針鋒 針鋒|針鋒相對 針鋒相對|針鋒相投 針鋒相投|針鋩 針鋩|針頭 針頭|針餌莫減 針餌莫減|針骨 針骨|針魚 針魚|針黹 針黹|針黹紡績 針黹紡績|針鼴 針鼴|針鼻 針鼻|針鼻兒 針鼻兒|釦針 釦針|鉅著 鉅著|鉤針 鉤針|銀核 銀核|銀針 銀針|鋼梁 鋼樑|鋼針 鋼針|錶針 錶針|鐵針 鐵針|鑑核備查 鑑核備查|鑿壁懸梁 鑿壁懸樑|長才 長才|長針 長針|開口 開口|防疫針 防疫針|陰核 陰核|隨才器使 隨才器使|雄才 雄才|雄才大略 雄才大略|雌核 雌核|雕梁 雕樑|雕梁畫柱 雕樑畫柱|雕梁畫棟 雕樑畫棟|雙核 雙核|雙鏈核酸 雙鏈核酸|電唱針 電唱針|電針 電針|電針麻醉 電針麻醉|需才孔亟 需才孔亟|露才 露才|露才揚己 露才揚己|霸才 霸才|非才 非才|非核 非核|面皂 面皂|頂核 頂核|頂梁柱 頂樑柱|頂梁骨走了真魂 頂樑骨走了真魂|頂針 頂針|頂針兒 頂針兒|頂針捱住 頂針捱住|頂門針 頂門針|順時針 順時針|預防針 預防針|領帶針 領帶針|頭懸梁錐刺股 頭懸樑錐刺股|顯著 顯著|顯著標志 顯著標志|風向針 風向針|風流才子 風流才子|飛梁 飛樑|飛針走線 飛針走線|飽學秀才 飽學秀才|餘音繞梁 餘音繞樑|餘響繞梁 餘響繞樑|香皂 香皂|馮驥才 馮驥才|驚才絕豔 驚才絕豔|骨針 骨針|高參 高參|高才 高才|高才生 高才生|高級管理人才 高級管理人才|髮針 髮針|鬼才 鬼才|鬼針草 鬼針草|魚梁 魚樑|魚頭參政 魚頭參政|鴻篇鉅著 鴻篇鉅著|鹽水針 鹽水針|麴秀才 麴秀才|麻醉針 麻醉針|黃有才 黃有才|點核 點核|鼻梁 鼻樑|鼻梁兒 鼻樑兒|鼻梁骨 鼻樑骨|鼻無梁柱 鼻無樑柱|鼻針療法 鼻針療法|齧蘗吞針 齧蘗吞針",h="么 幺|偽 僞|參 蔘|吃 喫|唇 脣|啟 啓|媯 嬀|嫻 嫺|峰 峯|床 牀|才 纔|核 覈|汙 污|洩 泄|溈 潙|潀 潨|灶 竈|為 爲|痴 癡|痺 痹|皂 皁|眾 衆|睪 睾|秘 祕|稜 棱|簷 檐|粽 糉|缽 鉢|群 羣|著 着|蒍 蔿|裡 裏|踴 踊|針 鍼|韁 繮|顎 齶|鯰 鮎|麵 麪",y="A型肝炎 甲型肝炎|A肝 甲肝|BMW集團 寶馬集團|B型肝炎 乙型肝炎|B肝 乙肝|C型肝炎 丙型肝炎|C肝 丙肝|D型肝炎 丁型肝炎|D肝 丁肝|E型肝炎 戊型肝炎|E肝 戊肝|PN接面 PN結|SQL隱碼攻擊 SQL注入|三極體 三極管|下拉式清單 下拉列表|丙胺酸 丙氨酸|丟擲 拋出|中介軟體 中間件|丹尼·鮑伊 丹尼·博伊爾|主機板 主板|主開機記錄 主引導記錄|乙太網 以太網|乙太網路 以太網|乙太網路由器 以太網路由器|乙太網路路由器 以太網路由器|乙醯胺酚 對乙酰氨基酚|乳酪 奶酪|二極體 二極管|互動 交互|互動式 交互式|亞塞拜然 阿塞拜疆|亮胺酸 亮氨酸|人工智慧 人工智能|介面 界面|介面卡 適配器|代碼 代碼|代謝症候群 代謝綜合徵|伊利諾 伊利諾伊|伊利諾州 伊利諾伊州|伊力·卡山 伊利亞·卡贊|伺服器 服務器|佇列 隊列|位元 比特|位元率 比特率|位元組 字節|位元速率 碼率|位址 地址|位址列 地址欄|低級 低級|低階 低級|佛漢·威廉斯 沃恩·威廉斯|佛瑞 福雷|作業系統 操作系統|使用者 用戶|使用者名稱 用戶名|來電轉接 呼叫轉移|例項 實例|保羅·海吉斯 保羅·哈吉斯|信號 信號|停用 禁用|偵錯 調試|偵錯程式 調試器|傅立葉 傅里葉|傳送 發送|傷心小棧 紅心大戰|價效比 性價比|優先順序 優先級|儲存 保存|元件 組件|光碟 光盤|光碟機 光驅|克林·伊斯威特 克林特·伊斯特伍德|克羅埃西亞 克羅地亞|克萊門第 克萊門蒂|克里斯多福·諾蘭 克里斯托弗·諾蘭|入口網站 門戶網站|內建 內置|內碼表 代碼頁|全域性 全局|全形 全角|全球資訊網 萬維網|公元紀年 公元紀年|冰棒 冰棍|冷盤 涼菜|凱吉 凱奇|凱文·科斯納 凱文·科斯特納|凱薩琳·畢格羅 凱瑟琳·畢格羅|函式 函數|函數語言程式設計 函數式編程|刀鋒伺服器 刀片服務器|分割槽 分區|分散式 分佈式|分時多工 時分複用|分時多重進接 時分多址|分碼多重進接 碼分多址|分空間多重進接 空分多址|分頻多工 頻分複用|分頻多重進接 頻分多址|列印 打印|列支敦斯登 列支敦士登|列舉 枚舉|利蓋悌 利蓋蒂|前處理器 預處理器|剪下 剪切|剪貼簿 剪貼板|副檔名 擴展名|加彭 加蓬|勞勃·懷斯 羅伯特·懷斯|勞勃·班頓 羅伯特·本頓|勞勃·瑞福 羅伯特·雷德福|包羅定 鮑羅丁|北卡羅萊納 北卡羅來納|北卡羅萊納州 北卡羅來納州|北馬利安納 北馬里亞納|北馬利安納群島 北馬里亞納羣島|匯入 導入|匯出 導出|匯流排 總線|區域性 局部|區域網 局域網|千里達及托巴哥 特立尼達和多巴哥|半形 半角|南卡羅萊納 南卡羅來納|南卡羅萊納州 南卡羅來納州|卡達 卡塔爾|印表機 打印機|即時 實時|厄利垂亞 厄立特里亞|厄瓜多 厄瓜多爾|原始檔 源文件|原始碼 源代碼|原生代碼 本地代碼|參數列 參數表|取樣 採樣|取樣率 採樣率|叢集 集羣|叮叮噹 丁丁當|叮叮噹噹 丁丁當當|叮噹 丁當|台積公司 臺積公司|台積電 臺積電|史他汀類 他汀類|史克里亞賓 斯克里亞賓|史卡拉第 斯卡拉蒂|史托克豪森 施托克豪森|史提夫·麥昆 史蒂夫·麥奎因|史特勞斯 施特勞斯|史特拉汶斯基 斯特拉文斯基|史瓦濟蘭 斯威士蘭|史蒂芬·史匹柏 斯蒂芬·斯皮爾伯格|史麥塔納 斯美塔那|司法程序 司法程序|吉勒摩·戴托羅 吉列爾莫·德爾托羅|吉布地 吉布堤|吉里巴斯 基里巴斯|名字空間 命名空間|名稱空間 命名空間|吐瓦魯 圖瓦盧|向量 矢量|呼叫 調用|命令列 命令行|咖哩 咖喱|哈薩克 哈薩克斯坦|哥斯大黎加 哥斯達黎加|唐氏症 唐氏綜合徵|啟用 激活|喬治·克隆尼 喬治·克魯尼|喬治亞 喬治亞|喬治亞共和國 格魯吉亞共和國|喬治亞州 佐治亞州|單核心 宏內核|回撥 回調|圖示 圖標|土庫曼 土庫曼斯坦|地址 地址|坦尚尼亞 坦桑尼亞|型別 類型|埠 端口|執行 運行|執行檔 可執行文件|執行緒 線程|執行長 首席執行官|堆疊 堆棧|場效電晶體 場效應管|塑膠 塑料|塔吉克 塔吉克斯坦|塞席爾 塞舌爾|塞普勒斯 塞浦路斯|壁紙 壁紙|夏農 香農|外掛 插件|外接 外置|外部索引鍵 外鍵|多囊性卵巢症候群 多囊卵巢綜合徵|多型 多態|多執行緒 多線程|多尼采第 多尼采蒂|多工 多任務|多明尼加 多米尼加|大數據 大數據|大腸激躁症 腸易激綜合徵|天冬胺酸 天冬氨酸|天冬醯胺 天冬酰胺|天門冬胺酸 天門冬氨酸|天門冬醯胺 天門冬酰胺|太空梭 航天飛機|失智症 癡呆症|奈及利亞 尼日利亞|奈米 納米|奧克拉荷馬 俄克拉何馬|奧克拉荷馬城 俄克拉何馬城|奧克拉荷馬州 俄克拉何馬州|奧克拉荷馬市 俄克拉何馬市|奧利佛·史東 奧利弗·斯通|奧勒岡 俄勒岡|奧勒岡州 俄勒岡州|奧福 奧爾夫|好市多 開市客|好市多公司 開市客公司|妥瑞氏症 抽動穢語綜合徵|妥瑞症 抽動穢語綜合徵|威廉·佛雷金 威廉·弗萊德金|威斯康辛 威斯康星|威斯康辛州 威斯康星州|嬌生公司 強生公司|子音 輔音|字串 字符串|字元 字符|字元集 字符集|字型 字體|字型檔 字庫|字尾 後綴|字節跳動 字節跳動|字首 前綴|存取 訪問|存檔 存盤|孟德爾頌 門德爾松|安地卡及巴布達 安提瓜和巴布達|安比西林 氨苄西林|安莫西林 阿莫西林|宏都拉斯 洪都拉斯|宕機 死機|定址 尋址|宣告 聲明|密西根 密歇根|密西根州 密歇根州|實例 實例|實體地址 物理地址|實體記憶體 物理內存|寬頻 寬帶|寮人民民主共和國 老撾人民民主共和國|寮國 老撾|寶僑 寶潔|寶僑公司 寶潔公司|專案 項目|對乙醯胺基酚 對乙酰氨基酚|對映 映射|對話方塊 對話框|對象 對象|尚比亞 贊比亞|尤拉 歐拉|尼日 尼日爾|巢狀 嵌套|工作列 任務欄|工作管理員 任務管理器|巨集 宏|巨集函式 宏函數|巨集呼叫 宏調用|巨集命令 宏命令|巨集定義 宏定義|巨集展開 宏展開|巨集指令 宏指令|巨集替換 宏替換|巨集程式設計 宏編程|巨集處理 宏處理|巨集語言 宏語言|巴布亞紐幾內亞 巴布亞新幾內亞|巴貝多 巴巴多斯|巴金森氏症 帕金森病|市場行銷 市場營銷|布列敦 布雷頓|布列敦森林 布雷頓森林|布列敦森林制度 布雷頓森林體系|布吉納法索 布基納法索|布拉姆斯 勃拉姆斯|布林 布爾|布瑞頓 布里頓|布萊德·彼特 布拉德·皮特|布萊茲 布列茲|帕金森氏症 帕金森病|帛琉 帕勞|平行計算 並行計算|幾內亞比索 幾內亞比紹|序列 串行|序列埠 串口|序號產生器 註冊機|庫欣氏症候群 庫欣綜合徵|康乃狄克 康涅狄格|康乃狄克州 康涅狄格州|建構函式 構造函數|建構子 構造器|建立 創建|引數 參數|彙編 彙編|彩色超音波 彩超|影像 圖像|影印 複印|影片 視頻|彼得·傑克森 彼得·傑克遜|後天免疫缺乏症候群 獲得性免疫缺陷綜合徵|後設資料 元數據|循環 循環|微控制器 單片機|德布西 德彪西|德弗札克 德沃夏克|德拉瓦 特拉華|德拉瓦州 特拉華州|心室顫動 心室顫動|心房撲動 心房撲動|心房顫動 心房顫動|心肌梗塞 心肌梗死|快取 緩存|快取記憶體 高速緩存|快捷半導體 仙童半導體|快閃記憶體 閃存|急性呼吸窘迫症候群 急性呼吸窘迫綜合徵|愛滋病 艾滋病|愛滋病患 艾滋病人|愛滋病毒 艾滋病毒|愛荷華 艾奧瓦|愛荷華州 艾奧瓦州|愛黛兒·羅曼斯基 阿黛爾·羅曼斯基|感測 傳感|慢性疲勞症候群 慢性疲勞綜合徵|憂鬱症 抑鬱症|戒斷症候群 戒斷綜合徵|截圖 截屏|戴奧辛 二噁英|戴流士 戴留斯|打開 打開|批次 批量|技術長 首席技術官|拉摩 拉莫|拉羅 拉洛|拉赫曼尼諾夫 拉赫瑪尼諾夫|指令式程式設計 命令式編程|指令碼 腳本|指標 指針|捲軸 滾動條|掃描器 掃描儀|排程 調度|控制代碼 句柄|控制元件 控件|提佩特 蒂佩特|搜尋 搜索|摩爾線程 摩爾線程|摺積 捲積|撥出 呼出|擴充套件 擴展|擴音 免提|擷取 截取|攜帶型 便攜式|攝護腺 前列腺|支持者 支持者|支援 支持|效能 性能|整合 集成|數位 數字|數位人文 數字人文|數位印刷 數字印刷|數位電子 數字電子|數位電路 數字電路|數字 數字|數據 數據|數據機 調製解調器|文件 文檔|文書處理 文字處理|斯洛維尼亞 斯洛文尼亞|新增 添加|新罕布夏 新罕布什爾|新罕布夏州 新罕布什爾州|方程式 方程式|映象 鏡像|映象管 顯像管|時脈頻率 時鐘頻率|普羅高菲夫 普羅科菲耶夫|普賽爾 珀塞爾|晶片 芯片|智慧 智能|智慧財產權 知識產權|暫存器 寄存器|最佳化 優化|有失真壓縮 有損壓縮|朗·霍華 朗·霍華德|林姆斯基-高沙可夫 里姆斯基-科薩科夫|查德 乍得|查詢 查找|柯恩兄弟 科恩兄弟|柯普蘭 科普蘭|柯雷利 科雷利|核取按鈕 複選按鈕|核取方塊 複選框|核心 內核|格瑞那達 格林納達|桌上型 桌面型|桌上型電腦 臺式機|桌布 壁紙|梅湘 梅西安|梅爾·吉勃遜 梅爾·吉布森|楊納傑克 雅納切克|榴槤 榴蓮|標頭檔案 頭文件|模擬 模擬|模組 模塊|模里西斯 毛里求斯|機率 概率|檔名 文件名|檔案 文件|檢視 查看|欄位 字段|歐巴馬 奧巴馬|正子 正電子|正子斷層造影 正電子發射計算機斷層|正當程序 正當程序|正規化 範式|正規表示式 正則表達式|母音 元音|比特幣 比特幣|氣泡排序 冒泡排序|永珍 萬象|永續性 持久性|汶萊 文萊|沙烏地阿拉伯 沙特阿拉伯|沙烏地阿美 沙特阿美|沙烏地阿美公司 沙特阿美公司|法蘭西絲·麥朵曼 弗朗西絲·麥克多曼德|泡麵 方便麪|波克夏海瑟威 伯克希爾哈撒韋|波克夏海瑟威公司 伯克希爾哈撒韋公司|波凱里尼 博凱里尼|波士尼亞赫塞哥維納 波斯尼亞黑塞哥維那|波札那 博茨瓦納|波長分波多工 波分複用|海內存知己 海內存知己|海飛茲 海菲茨|消息 消息|游標 光標|溢位 溢出|滑鼠 鼠標|演算法 算法|漢他病毒 漢坦病毒|潘德列茲基 潘德列茨基|烏茲別克 烏茲別克斯坦|無失真壓縮 無損壓縮|燒錄 刻錄|營運長 首席運營官|片語 詞組|物件 對象|物件導向 面向對象|狀態列 狀態欄|獅子山 塞拉利昂|珍·康萍 簡·坎皮恩|班·艾佛列克 本·阿弗萊克|瓜地馬拉 危地馬拉|甘比亞 岡比亞|甘胺酸 甘氨酸|甲硫胺酸 甲硫氨酸|畫素 像素|異亮胺酸 異亮氨酸|異白胺酸 異亮氨酸|登入 登錄|登出 註銷|登錄檔 註冊表|白胺酸 亮氨酸|白血球 白細胞|白遼士 柏遼茲|盧安達 盧旺達|目的碼 目標代碼|直譯器 解釋器|相容 兼容|相簿 相冊|真實模式 實模式|睡眠呼吸中止症 睡眠呼吸暫停綜合徵|矽 硅|砈 砹|破圖 花屏|硬碟 硬盤|硬體 硬件|碟片 盤片|磁碟 磁盤|磁碟機代號 盤符|磁軌 磁道|社區 社區|社群 社區|福斯汽車 大衆汽車|福斯汽車集團 大衆汽車集團|福斯集團 大衆集團|程序 進程|程序不正義 程序不正義|程序導向 面向過程|程序式程式設計 過程式編程|程序正義 程序正義|程式 程序|程式碼 代碼|程式設計 編程|程式設計師 程序員|程式語言 編程語言|稽核 審覈|穀氨醯胺 穀氨酰胺|穀胺酸 穀氨酸|穆索斯基 穆索爾斯基|積體電路 集成電路|空氣清淨機 空氣淨化器|空間多工 空分複用|突尼西亞 突尼斯|筆記型電腦 筆記本電腦|範式 範式|簡報 演示文稿|簡訊 短信|簽帳金融卡 借記卡|米歇爾·哈札納維西斯 米歇爾·阿扎納維西於斯|粘貼 粘貼|精胺酸 精氨酸|約瑟夫·孟威茲 約瑟夫·曼凱維奇|紅血球 紅細胞|納米比亞 納米比亞|紐澤西 新澤西|紐澤西州 新澤西州|紐西蘭 新西蘭|索羅門群島 所羅門羣島|索馬利亞 索馬里|終端使用者 最終用戶|組合語言 彙編語言|組胺酸 組氨酸|組譯 彙編|組譯器 彙編器|結束通話 掛斷|絲胺酸 絲氨酸|綁架丁丁當 綁架丁丁當|經前症候群 經前期綜合徵|維吉尼亞 弗吉尼亞|維吉尼亞州 弗吉尼亞州|維德角 佛得角|網咖 網吧|網絡卡 網卡|網路 網絡|網路上的芳鄰 網上鄰居|網際網路 互聯網|線上 在線|縮圖 縮略圖|縮排 縮進|繫結 綁定|纈胺酸 纈氨酸|羅勃·辛密克斯 羅伯特·澤米吉斯|羅德島 羅得島|羅德島州 羅得島州|美屬維京群島 美屬維爾京羣島|義大利 意大利|老年失智症 老年癡呆症|聖克里斯多福及尼維斯 聖基茨和尼維斯|聖文森及格瑞那丁 聖文森特和格林納丁斯|聖露西亞 聖盧西亞|聖馬利諾 聖馬力諾|聯結器 連接器|聯絡 聯繫|肯亞 肯尼亞|胰臟 胰腺|胱胺酸 胱氨酸|胺基酸 氨基酸|脯胺酸 脯氨酸|腎病症候群 腎病綜合徵|腕隧道症候群 腕管綜合徵|腦梗塞 腦梗死|腳踏車 自行車|自動旋轉螢幕 自動轉屏|自閉症 孤獨症|興德密特 欣德米特|色胺酸 色氨酸|艾克森美孚 埃克森美孚|艾爾加 埃爾加|艾瑪·湯瑪斯 艾瑪·托馬斯|苯丙胺酸 苯丙氨酸|茅利塔尼亞 毛里塔尼亞|荀白克 勳伯格|莫三比克 莫桑比克|莫札特 莫扎特|菜單 菜單|華倫·比提 沃倫·比蒂|華格納 瓦格納|華爾頓 沃爾頓|萊許 賴希|萊雅 歐萊雅|萊雅集團 歐萊雅集團|萬用字元 通配符|萬那杜 瓦努阿圖|葉門 也門|葛令卡 格林卡|葛利格 格里格|葛拉斯 格拉斯|葛摩 科摩羅|蒲隆地 布隆迪|蓋亞那 圭亞那|蓋希文 格什溫|蕭士塔高維契 肖斯塔科維奇|蕭邦 肖邦|薛尼·波拉克 西德尼·波拉克|薩拉沙泰 薩拉薩蒂|薩提 薩蒂|藍色畫面 藍屏|蘇利南 蘇里南|蘇胺酸 蘇氨酸|處理程序 處理程序|虛擬函式 虛函數|虛擬機器 虛擬機|虛擬碼 僞代碼|螢幕 屏幕|血紅素 血紅蛋白|行內函數 內聯函數|行動式 便攜式|行動數據 移動數據|行動硬碟 移動硬盤|行動網路 移動網絡|行動通訊 移動通信|行動電話 移動電話|行程 進程|衣索比亞 埃塞俄比亞|表示式 表達式|裝置 設備|複製 拷貝|西元 公元|西恩·貝克 肖恩·貝克|西維吉尼亞 西弗吉尼亞|西維吉尼亞州 西弗吉尼亞州|西貝流士 西貝柳斯|視窗 窗口|視覺化 可視化|視訊 視頻|視訊會議 視頻會議|視訊記憶體 顯存|視訊通話 視頻通話|解析度 分辨率|解構函式 析構函數|解構子 析構函數|解除安裝 卸載|觸控 觸摸|觸控式螢幕 觸摸屏|計程車 出租車|訊息 消息|訊號 信號|訊雜比 信噪比|記憶體 內存|記憶體模組 內存條|訪問 訪問|設定 設置|許可權 權限|訴訟程序 訴訟程序|詹姆斯·卡麥隆 詹姆斯·卡梅隆|調色盤 調色盤|調變 調製|諾蘭 諾蘭|諾魯 瑙魯|識別符號 標識符|變數 變量|象牙海岸 科特迪瓦|貝南 貝寧|貝里尼 貝利尼|貝里斯 伯利茲|貼上 粘貼|資料 數據|資料來源 數據源|資料倉儲 數據倉庫|資料包 數據報|資料夾 文件夾|資料庫 數據庫|資料探勘 數據挖掘|資訊 信息|資訊安全 信息安全|資訊理論 信息論|資訊科技 信息技術|資訊長 首席信息官|賓士 奔馳|賴比瑞亞 利比里亞|賴索托 萊索托|超程式設計 元編程|超音波 超聲波|跳脫字元 轉義字符|軟碟機 軟驅|軟體 軟件|軟體動物 軟體動物|載入 加載|載入程式 引導程序|輝達 英偉達|辛巴威 津巴布韋|迦納 加納|迴圈 循環|通訊 通信|通話卡 通訊卡|通話記錄 聯繫歷史|通道 通道|速食麵 方便麪|連結 鏈接|連結串列 鏈表|連線 連接|進位制 進制|進程 進程|進階 高級|進階設定 高級設置|進階選項 高級選項|運算元 操作數|運算子 操作符|運算式 表達式|過動症 多動症|過載 重載|遞迴 遞歸|遠端 遠程|遮蔽 屏蔽|選單 菜單|邏輯閘 邏輯門|那杜 溫納圖萬|部落格 博客|都會網路 城域網|酪胺酸 酪氨酸|醯 酰|釋出 發佈|重新命名 重命名|重新整理 刷新|重灌 重裝|金氧半導體 金屬氧化物半導體|金鑰 密鑰|鈽 鈈|鉲 鐦|鉳 錇|鋂 鎇|錄影 錄像|錼 鎿|鍅 鈁|鎝 鍀|鎦 鑥|鑀 鎄|開啟 打開|閘流體 晶閘管|閘道器 網關|閘電路 門電路|關聯式資料庫 關係數據庫|防寫 寫保護|防毒 殺毒|阻斷劑 阻滯劑|阿利安卓·崗札雷·伊納利圖 亞歷杭德羅·岡薩雷斯·伊納裏圖|阿拉伯聯合大公國 阿拉伯聯合酋長國|阿斯匹靈 阿司匹林|阿斯特捷利康 阿斯利康|阿斯特捷利康公司 阿斯利康公司|阿茲海默氏症 阿爾茨海默氏症|阿茲海默症 阿爾茨海默症|阿莫西林 阿莫西林|陣列 數組|除錯 調試|隨身碟 U盤|雜湊 哈希|離線 脫機|離胺酸 賴氨酸|雲端儲存 雲存儲|雲端計算 雲計算|雷射 激光|雷諾氏症候群 雷諾綜合徵|電晶體 晶體管|電腦保安 計算機安全|電腦斷層 計算機斷層|電腦科學 計算機科學|霍洛維茲 霍洛維茨|非同步 異步|韋本 韋伯恩|韋瓦第 維瓦爾第|韌體 固件|韓德爾 亨德爾|音效卡 聲卡|音訊 音頻|頁尾 頁腳|頁首 頁眉|預設 預設|預設值 默認值|頻寬 帶寬|類别範本 類模板|類比 模擬|類比電子 模擬電子|類比電路 模擬電路|顧爾德 古爾德|顯示卡 顯卡|飛航模式 飛行模式|馬丁·史柯西斯 馬丁·斯科塞斯|馬凡氏症 馬方綜合徵|馬凡氏症候群 馬方綜合徵|馬利共和國 馬里共和國|馬爾地夫 馬爾代夫|駭客 黑客|高效能運算 高性能計算|高畫質 高清|高空彈跳 蹦極|高級 高級|高階 高級|麥克·尼可斯 邁克·尼科爾斯|麥克·道格拉斯 邁克爾·道格拉斯|麩胺酸 穀氨酸|麩醯胺酸 穀氨酰胺|麻薩諸塞 馬薩諸塞|麻薩諸塞州 馬薩諸塞州|黃體素 孕酮|點選 點擊|點陣圖 位圖",v="一坏 一坯|一目瞭然 一目了然|七逕 七迳|上逕 上迳|上鍊 上链|不可貲計 不可赀計|不瞭解 不了解|么麼 幺麽|么麽 幺麽|九逕山 九迳山|乾乾淨淨 干干净净|乾乾脆脆 干干脆脆|乾佑縣 乾佑县|乾元 乾元|乾卦 乾卦|乾嘉 乾嘉|乾圖 乾图|乾坤 乾坤|乾坤一擲 乾坤一掷|乾坤再造 乾坤再造|乾坤大挪移 乾坤大挪移|乾宅 乾宅|乾安縣 乾安县|乾安鎮 乾安镇|乾州 乾州|乾斷 乾断|乾斷食 干断食|乾旦 乾旦|乾曜 乾曜|乾清宮 乾清宫|乾盛世 乾盛世|乾紅 干红|乾綱 乾纲|乾縣 乾县|乾象 乾象|乾造 乾造|乾道 乾道|乾闥婆 乾闼婆|乾陵 乾陵|乾隆 乾隆|乾隆年間 乾隆年间|乾隆皇帝 乾隆皇帝|二噁英 二𫫇英|仇讎 仇雠|以免藉口 以免借口|以功覆過 以功覆过|任筆沈詩 任笔沈诗|侔德覆載 侔德覆载|傢俱 家具|傷亡枕藉 伤亡枕藉|允祕 允祕|八濛山 八濛山|其陰多蒐 其阴多蒐|凌藉 凌借|出醜狼藉 出丑狼藉|函覆 函复|剋架 剋架|剋毒 剋毒|千鍾粟 千锺粟|南氾 南氾|南逕 南迳|反反覆覆 反反复复|反覆 反复|反覆思維 反复思维|反覆思量 反复思量|反覆性 反复性|名覆金甌 名复金瓯|吳祕 吴祕|吳育昇 吴育昇|哪吒 哪吒|回覆 回复|土坏 土坯|坏土 坯土|坏子 坯子|坏布 坯布|坏戶 坯户|墨沈沈 墨沉沉|壺裏乾坤 壶里乾坤|大目乾連冥間救母變文 大目乾连冥间救母变文|宫商角徵羽 宫商角徵羽|射覆 射覆|尼乾子 尼乾子|尼乾陀 尼乾陀|年釐 年釐|幺麼 幺麽|幺麼小丑 幺麽小丑|幺麼小醜 幺麽小丑|康乾 康乾|張昇 张昇|張法乾 张法乾|彷彿 仿佛|彷徨 彷徨|徐胤昇 徐胤昇|復甦 复苏|徵弦 徵弦|徵絃 徵弦|徵羽摩柯 徵羽摩柯|徵聲 徵声|徵調 徵调|徵音 徵音|情有獨鍾 情有独钟|想像 想像|意志消沈 意志消沉|慰藉 慰藉|慰藉着 慰藉着|憑藉 凭借|憑藉着 凭借着|懷釐 怀釐|成甦 成甦|所費不貲 所费不赀|手鍊 手链|打坏 打坯|扞格 扞格|扭轉乾坤 扭转乾坤|批覆 批复|找藉口 找借口|折戟沈沙 折戟沉沙|折戟沈河 折戟沉河|拉坏 拉坯|拉鍊 拉链|拉鍊工程 拉链工程|拜覆 拜复|挨剋 挨剋|捏坏 捏坯|擊沈 击沉|據瞭解 据了解|文錦覆阱 文锦覆阱|於世成 於世成|於乎 於乎|於仲完 於仲完|於倫 於伦|於其一 於其一|於則 於则|於勇明 於勇明|於呼哀哉 於呼哀哉|於單 於单|於坦 於坦|於崇文 於崇文|於忠祥 於忠祥|於惟一 於惟一|於戲 於戏|於敖 於敖|於梨華 於梨华|於清言 於清言|於潛 於潜|於琳 於琳|於穆 於穆|於竹屋 於竹屋|於菟 於菟|於邑 於邑|於陵子 於陵子|旋乾轉坤 旋乾转坤|旋轉乾坤 旋转乾坤|旋轉乾坤之力 旋转乾坤之力|明瞭 明了|明覆 明复|昏沈 昏沉|春蒐 春蒐|春釐 春釐|暗沈沈 暗沉沉|書中自有千鍾粟 书中自有千锺粟|有序 有序|朝乾夕惕 朝乾夕惕|木吒 木吒|李乾德 李乾德|李昇 李昇|李昇勳 李昇勋|李澤鉅 李泽钜|李祕 李祕|李鍊福 李链福|李鍾郁 李锺郁|束脩 束脩|東氾 东氾|林甦 林甦|校讎 校雠|梁昇卿 梁昇卿|梁章鉅 梁章钜|楊甦棣 杨甦棣|楊聯陞 杨联陞|樊於期 樊於期|橡椀 橡椀|死氣沈沈 死气沉沉|段脩 段脩|毛坏 毛坯|水逕 水迳|氾勝之 氾胜之|氾南 氾南|氾國 氾国|氾水 氾水|沈下 沉下|沈不住氣 沉不住气|沈住氣 沉住气|沈冤 沉冤|沈厚 沉厚|沈吟 沉吟|沈寂 沉寂|沈得住氣 沉得住气|沈思 沉思|沈思往事 沉思往事|沈悶 沉闷|沈沒 沉没|沈沒成本 沉没成本|沈浮 沉浮|沈浸 沉浸|沈浸於 沉浸于|沈淪 沉沦|沈湎 沉湎|沈湎酒色 沉湎酒色|沈溺 沉溺|沈滯 沉滞|沈滯性 沉滞性|沈澱 沉淀|沈澱出來 沉淀出来|沈澱劑 沉淀剂|沈澱法 沉淀法|沈澱物 沉淀物|沈濁 沉浊|沈甸甸 沉甸甸|沈痛 沉痛|沈痼 沉痼|沈痾 沉疴|沈睡 沉睡|沈睡不醒 沉睡不醒|沈砂池 沉砂池|沈積 沉积|沈積岩 沉积岩|沈積石 沉积石|沈筒 沉筒|沈船 沉船|沈落 沉落|沈詩任筆 沈诗任笔|沈迷 沉迷|沈迷不醒 沉迷不醒|沈醉 沉醉|沈重 沉重|沈降 沉降|沈陷 沉陷|沈靜 沉静|沈靜下來 沉静下来|沈香 沉香|沈鬱 沉郁|沈魚落雁 沉鱼落雁|沈默 沉默|沈默不語 沉默不语|沈默寡言 沉默寡言|沙逕 沙迳|河逕 河迳|流徵 流徵|浪蕩乾坤 浪荡乾坤|浮沈 浮沉|海哩 海里|深沈 深沉|深沈不露 深沉不露|溫昇豪 温昇豪|滑藉 滑借|烏昇 乌昇|烏沈沈 乌沉沉|烏逕 乌迳|無序 无序|狐藉虎威 狐借虎威|王彥昇 王彦昇|珍珠項鍊 珍珠项链|甚鉅 甚钜|甦生 苏生|甦醒 苏醒|申昇勳 申昇勋|申覆 申复|畢昇 毕昇|發覆 发覆|盧象昇 卢象昇|目劄 目劄|瞭哨 瞭哨|瞭如 了如|瞭如指掌 了如指掌|瞭望 瞭望|瞭然 了然|瞭然於心 了然于心|瞭若指掌 了若指掌|瞭解 了解|瞭解到 了解到|破釜沈舟 破釜沉舟|磚坏 砖坯|示覆 示复|社逕 社迳|祕丕笈 祕丕笈|祕彭祖 祕彭祖|祕瓊 祕琼|祝釐 祝釐|神祇 神祇|稟覆 禀复|竺乾 竺乾|答覆 答复|篤麼 笃麽|簡單明瞭 简单明了|籌畫 筹划|素藉 素借|老態龍鍾 老态龙钟|耳沈 耳沉|肉脩 肉脩|肘手鍊足 肘手链足|胤祕 胤祕|脩敬 脩敬|脩炳 脩炳|脩脡 脩脡|脩脯 脩脯|脩金 脩金|脫坏 脱坯|腶脩 腶脩|英哩 英里|茅蒐 茅蒐|茵藉 茵借|萬鍾 万锺|落雁沈魚 落雁沉鱼|蒐于紅 蒐于红|蒐於紅 蒐于红|蒐狩 蒐狩|蒐獮 蒐狝|蒐獵 蒐猎|蒐田 蒐田|蒐畋 蒐畋|蒐苗 蒐苗|蒜薹 蒜薹|蔣昇 蒋昇|蕓薹 芸薹|蕩覆 荡覆|蕭乾 萧乾|藉代 借代|藉以 借以|藉助 借助|藉助於 借助于|藉卉 借卉|藉口 借口|藉喻 借喻|藉寇兵 借寇兵|藉寇兵齎盜糧 借寇兵赍盗粮|藉手 借手|藉據 借据|藉故 借故|藉故推辭 借故推辞|藉方 借方|藉條 借条|藉槁 借槁|藉機 借机|藉此 借此|藉此機會 借此机会|藉甚 借甚|藉由 借由|藉着 借着|藉端 借端|藉端生事 借端生事|藉箸代籌 借箸代筹|藉草枕塊 借草枕块|藉藉 藉藉|藉藉无名 藉藉无名|藉詞 借词|藉讀 借读|藉資 借资|衹得 只得|衹見樹木 只见树木|衹見樹木不見森林 只见树木不见森林|袁祕 袁祕|袖裏乾坤 袖里乾坤|袷袢 袷袢|製坏 制坯|覆上 覆上|覆住 覆住|覆信 复信|覆冒 覆冒|覆呈 复呈|覆命 复命|覆墓 复墓|覆宗 覆宗|覆帳 复帐|覆幬 覆帱|覆成 覆成|覆按 复按|覆文 复文|覆杯 覆杯|覆校 复校|覆瓿 覆瓿|覆盂 覆盂|覆盆 覆盆|覆盆子 覆盆子|覆盤 覆盘|覆育 覆育|覆蕉尋鹿 覆蕉寻鹿|覆逆 覆逆|覆醢 覆醢|覆醬瓿 覆酱瓿|覆電 复电|覆露 覆露|覆鹿尋蕉 覆鹿寻蕉|覆鹿遺蕉 覆鹿遗蕉|覆鼎 覆鼎|見覆 见复|角徵 角徵|角徵羽 角徵羽|計畫 计划|許甦魂 许甦魂|變徵 变徵|變徵之聲 变徵之声|變徵之音 变徵之音|讎定 雠定|谿工 谿工|貂覆額 貂覆额|買臣覆水 买臣覆水|赤石逕 赤石迳|踅門瞭戶 踅门了户|躪藉 躏借|載沈載浮 载沉载浮|載浮載沈 载浮载沉|辛祕 辛祕|逆釐 逆釐|逕口 迳口|逕聯 迳联|逕頭 迳头|郭子乾 郭子乾|酒逢知己千鍾少 酒逢知己千锺少|醞藉 酝借|重覆 重复|金吒 金吒|金昇玟 金昇玟|金鍊 金链|鈞覆 钧复|鉅子 钜子|鉅萬 钜万|鉅防 钜防|鉸鍊 铰链|銀鍊 银链|鋼坏 钢坯|錢鍾書 钱锺书|鍊墜 链坠|鍊子 链子|鍊形 链形|鍊條 链条|鍊錘 链锤|鍊鎖 链锁|鍛鍾 锻锺|鍾繇 锺繇|鍾萬梅 锺万梅|鍾重發 锺重发|鍾鍛 锺锻|鍾馗 锺馗|鎖鍊 锁链|鐵鍊 铁链|鑽石項鍊 钻石项链|鑿坏 凿坯|閻鶴昇 阎鹤昇|陰沈 阴沉|陰沈沈 阴沉沉|陰陰沈沈 阴阴沉沉|陳志昇 陈志昇|陳昇 陈昇|陳甦 陈甦|陶坏 陶坯|雁杳魚沈 雁杳鱼沉|雖覆能復 虽覆能复|電覆 电复|露覆 露覆|韓昇延 韩昇延|韓甦 韩甦|項鍊 项链|頗覆 颇覆|頸鍊 颈链|顛乾倒坤 颠乾倒坤|顛倒乾坤 颠倒乾坤|顧藉 顾借|馮甦 冯甦|魏徵 魏徵|魚沈雁杳 鱼沉雁杳|麪坏兒 面坯儿|麼些族 麽些族|黃甦 黄甦|黃鍾公 黄锺公|黑沈沈 黑沉沉|龍鍾 龙钟|龔昇 龚昇",m="㑯 㑔|㑳 㑇|㑶 㐹|㓨 刾|㗲 𠵾|㘚 㘎|㜄 㚯|㜏 㛣|㜢 𡞱|㠏 㟆|㠣 𫵷|㥮 㤘|㩜 㨫|㩳 㧐|㩵 擜|㺏 𤠋|䁪 𥇢|䁻 䀥|䃮 鿎|䊷 䌶|䋙 䌺|䋚 䌻|䋹 䌿|䋻 䌾|䍦 䍠|䎱 䎬|䓣 𬜯|䙡 䙌|䜀 䜧|䝼 䞍|䡵 𫟦|䥇 䦂|䥑 鿏|䥕 𬭯|䥱 䥾|䦛 䦶|䦟 䦷|䧢 𨸟|䮄 𫠊|䯀 䯅|䰾 鲃|䱷 䲣|䱽 䲝|䲁 鳚|䲘 鳤|䴉 鹮|丟 丢|並 并|乾 干|亂 乱|亙 亘|亞 亚|佇 伫|佈 布|佔 占|併 并|來 来|侖 仑|侶 侣|侷 局|俁 俣|係 系|俔 伣|俠 侠|俥 伡|俬 私|倀 伥|倆 俩|倈 俫|倉 仓|個 个|們 们|倖 幸|倫 伦|倲 㑈|偉 伟|偑 㐽|側 侧|偵 侦|偽 伪|傌 㐷|傑 杰|傖 伧|傘 伞|備 备|傢 家|傭 佣|傯 偬|傳 传|傴 伛|債 债|傷 伤|傾 倾|僂 偻|僅 仅|僉 佥|僑 侨|僕 仆|僞 伪|僤 𫢸|僥 侥|僨 偾|僱 雇|價 价|儀 仪|儁 俊|儂 侬|億 亿|儈 侩|儉 俭|儎 傤|儐 傧|儔 俦|儕 侪|儘 尽|償 偿|優 优|儲 储|儷 俪|儸 㑩|儺 傩|儻 傥|儼 俨|兇 凶|兌 兑|兒 儿|兗 兖|內 内|兩 两|冊 册|冑 胄|冪 幂|凈 净|凍 冻|凜 凛|凱 凯|別 别|刪 删|剄 刭|則 则|剋 克|剎 刹|剗 刬|剛 刚|剝 剥|剮 剐|剴 剀|創 创|剷 铲|劃 划|劄 札|劇 剧|劉 刘|劊 刽|劌 刿|劍 剑|劏 㓥|劑 剂|劚 㔉|勁 劲|動 动|務 务|勛 勋|勝 胜|勞 劳|勢 势|勣 𪟝|勩 勚|勱 劢|勳 勋|勵 励|勸 劝|勻 匀|匭 匦|匯 汇|匱 匮|區 区|協 协|卹 恤|卻 却|卽 即|厙 厍|厠 厕|厤 历|厭 厌|厲 厉|厴 厣|參 参|叄 叁|叢 丛|吒 咤|吳 吴|吶 呐|呂 吕|咼 呙|員 员|唄 呗|唸 念|問 问|啓 启|啞 哑|啟 启|啢 唡|喎 㖞|喚 唤|喪 丧|喫 吃|喬 乔|單 单|喲 哟|嗆 呛|嗇 啬|嗊 唝|嗎 吗|嗚 呜|嗩 唢|嗰 𠮶|嗶 哔|嘆 叹|嘍 喽|嘓 啯|嘔 呕|嘖 啧|嘗 尝|嘜 唛|嘩 哗|嘮 唠|嘯 啸|嘰 叽|嘵 哓|嘸 呒|嘽 啴|噁 恶|噓 嘘|噚 㖊|噝 咝|噠 哒|噥 哝|噦 哕|噯 嗳|噲 哙|噴 喷|噸 吨|噹 当|嚀 咛|嚇 吓|嚌 哜|嚐 尝|嚕 噜|嚙 啮|嚥 咽|嚦 呖|嚧 𠰷|嚨 咙|嚮 向|嚲 亸|嚳 喾|嚴 严|嚶 嘤|囀 啭|囁 嗫|囂 嚣|囅 冁|囈 呓|囉 啰|囌 苏|囑 嘱|囪 囱|圇 囵|國 国|圍 围|園 园|圓 圆|圖 图|團 团|垻 坝|埡 垭|埨 𫭢|埰 采|執 执|堅 坚|堊 垩|堖 垴|堝 埚|堯 尧|報 报|場 场|塊 块|塋 茔|塏 垲|塒 埘|塗 涂|塚 冢|塢 坞|塤 埙|塵 尘|塸 𫭟|塹 堑|塿 𪣻|墊 垫|墜 坠|墠 𫮃|墮 堕|墰 坛|墳 坟|墶 垯|墻 墙|墾 垦|壇 坛|壋 垱|壎 埙|壓 压|壗 𡋤|壘 垒|壙 圹|壚 垆|壜 坛|壞 坏|壟 垄|壠 垅|壢 坜|壩 坝|壪 塆|壯 壮|壺 壶|壼 壸|壽 寿|夠 够|夢 梦|夥 伙|夾 夹|奐 奂|奧 奥|奩 奁|奪 夺|奬 奖|奮 奋|奼 姹|妝 妆|姍 姗|姦 奸|娙 𫰛|娛 娱|婁 娄|婦 妇|婭 娅|媧 娲|媯 妫|媰 㛀|媼 媪|媽 妈|嫋 袅|嫗 妪|嫵 妩|嫺 娴|嫻 娴|嫿 婳|嬀 妫|嬃 媭|嬈 娆|嬋 婵|嬌 娇|嬙 嫱|嬡 嫒|嬤 嬷|嬪 嫔|嬰 婴|嬸 婶|孃 娘|孋 㛤|孌 娈|孫 孙|學 学|孻 𡥧|孿 孪|宮 宫|寀 采|寢 寝|實 实|寧 宁|審 审|寫 写|寬 宽|寵 宠|寶 宝|將 将|專 专|尋 寻|對 对|導 导|尷 尴|屆 届|屍 尸|屓 屃|屜 屉|屢 屡|層 层|屨 屦|屬 属|岡 冈|峯 峰|峴 岘|島 岛|峽 峡|崍 崃|崑 昆|崗 岗|崙 仑|崢 峥|崬 岽|嵐 岚|嵗 岁|嵽 𫶇|嵾 㟥|嶁 嵝|嶄 崭|嶇 岖|嶔 嵚|嶗 崂|嶠 峤|嶢 峣|嶧 峄|嶨 峃|嶮 崄|嶸 嵘|嶺 岭|嶼 屿|嶽 岳|巋 岿|巒 峦|巔 巅|巖 岩|巘 𪩘|巰 巯|巹 卺|帥 帅|師 师|帳 帐|帶 带|幀 帧|幃 帏|幓 㡎|幗 帼|幘 帻|幟 帜|幣 币|幫 帮|幬 帱|幷 并|幹 干|幾 几|庫 库|廁 厕|廂 厢|廄 厩|廈 厦|廎 庼|廕 荫|廚 厨|廝 厮|廞 𫷷|廟 庙|廠 厂|廡 庑|廢 废|廣 广|廩 廪|廬 庐|廳 厅|弒 弑|弔 吊|弳 弪|張 张|強 强|彄 𫸩|彆 别|彈 弹|彌 弥|彎 弯|彔 录|彙 汇|彠 彟|彥 彦|彫 雕|彲 彨|彿 佛|後 后|徑 径|從 从|徠 徕|復 复|徵 征|徹 彻|恆 恒|恥 耻|悅 悦|悞 悮|悵 怅|悶 闷|悽 凄|惡 恶|惱 恼|惲 恽|惻 恻|愛 爱|愜 惬|愨 悫|愴 怆|愷 恺|愾 忾|慄 栗|態 态|慍 愠|慘 惨|慚 惭|慟 恸|慣 惯|慤 悫|慪 怄|慫 怂|慮 虑|慳 悭|慶 庆|慺 㥪|慼 戚|慾 欲|憂 忧|憊 惫|憐 怜|憑 凭|憒 愦|憖 慭|憚 惮|憤 愤|憫 悯|憮 怃|憲 宪|憶 忆|懇 恳|應 应|懌 怿|懍 懔|懞 蒙|懟 怼|懣 懑|懤 㤽|懨 恹|懲 惩|懶 懒|懷 怀|懸 悬|懺 忏|懼 惧|懾 慑|戀 恋|戇 戆|戔 戋|戧 戗|戩 戬|戰 战|戱 戯|戲 戏|戶 户|扞 捍|拋 抛|拚 拼|挩 捝|挱 挲|挾 挟|捨 舍|捫 扪|捱 挨|捲 卷|掃 扫|掄 抡|掆 㧏|掗 挜|掙 挣|掛 挂|採 采|揀 拣|揚 扬|換 换|揮 挥|揯 搄|損 损|搖 摇|搗 捣|搧 扇|搵 揾|搶 抢|摑 掴|摜 掼|摟 搂|摯 挚|摳 抠|摶 抟|摺 折|摻 掺|撈 捞|撏 挦|撐 撑|撓 挠|撝 㧑|撟 挢|撣 掸|撥 拨|撫 抚|撲 扑|撳 揿|撻 挞|撾 挝|撿 捡|擁 拥|擄 掳|擇 择|擊 击|擋 挡|擓 㧟|擔 担|據 据|擠 挤|擡 抬|擣 捣|擬 拟|擯 摈|擰 拧|擱 搁|擲 掷|擴 扩|擷 撷|擺 摆|擻 擞|擼 撸|擽 㧰|擾 扰|攄 摅|攆 撵|攏 拢|攔 拦|攖 撄|攙 搀|攛 撺|攜 携|攝 摄|攢 攒|攣 挛|攤 摊|攪 搅|攬 揽|敎 教|敓 敚|敗 败|敘 叙|敵 敌|數 数|斂 敛|斃 毙|斆 敩|斕 斓|斬 斩|斷 断|於 于|旂 旗|旣 既|昇 升|時 时|晉 晋|晛 𬀪|晝 昼|暈 晕|暉 晖|暐 𬀩|暘 旸|暢 畅|暫 暂|曄 晔|曆 历|曇 昙|曉 晓|曏 向|曖 暧|曠 旷|曥 𣆐|曨 昽|曬 晒|書 书|會 会|朥 𦛨|朧 胧|朮 术|東 东|枴 拐|柵 栅|柺 拐|査 查|桱 𣐕|桿 杆|梔 栀|梘 枧|梜 𬂩|條 条|梟 枭|梲 棁|棄 弃|棊 棋|棖 枨|棗 枣|棟 栋|棡 㭎|棧 栈|棲 栖|棶 梾|椏 桠|椲 㭏|楊 杨|楓 枫|楨 桢|業 业|極 极|榘 矩|榦 干|榪 杩|榮 荣|榲 榅|榿 桤|構 构|槍 枪|槓 杠|槤 梿|槧 椠|槨 椁|槮 椮|槳 桨|槶 椢|槼 椝|樁 桩|樂 乐|樅 枞|樑 梁|樓 楼|標 标|樞 枢|樢 㭤|樣 样|樧 榝|樫 㭴|樳 桪|樸 朴|樹 树|樺 桦|樿 椫|橈 桡|橋 桥|機 机|橢 椭|橫 横|橯 𣓿|檁 檩|檉 柽|檔 档|檜 桧|檟 槚|檢 检|檣 樯|檮 梼|檯 台|檳 槟|檸 柠|檻 槛|櫃 柜|櫍 𬃊|櫓 橹|櫚 榈|櫛 栉|櫝 椟|櫞 橼|櫟 栎|櫥 橱|櫧 槠|櫨 栌|櫪 枥|櫫 橥|櫬 榇|櫱 蘖|櫳 栊|櫸 榉|櫻 樱|欄 栏|欅 榉|權 权|欏 椤|欒 栾|欓 𣗋|欖 榄|欞 棂|欽 钦|歎 叹|歐 欧|歟 欤|歡 欢|歲 岁|歷 历|歸 归|歿 殁|殘 残|殞 殒|殤 殇|殨 㱮|殫 殚|殭 僵|殮 殓|殯 殡|殰 㱩|殲 歼|殺 杀|殻 壳|殼 壳|毀 毁|毆 殴|毿 毵|氂 牦|氈 毡|氌 氇|氣 气|氫 氢|氬 氩|氳 氲|氾 泛|汎 泛|汙 污|決 决|沒 没|沖 冲|況 况|泝 溯|洩 泄|洶 汹|浹 浃|浿 𬇙|涇 泾|涗 涚|涼 凉|淒 凄|淚 泪|淥 渌|淨 净|淩 凌|淪 沦|淵 渊|淶 涞|淺 浅|渙 涣|減 减|渢 沨|渦 涡|測 测|渾 浑|湊 凑|湋 𣲗|湞 浈|湧 涌|湯 汤|溈 沩|準 准|溝 沟|溫 温|溮 浉|溳 涢|溼 湿|滄 沧|滅 灭|滌 涤|滎 荥|滙 汇|滬 沪|滯 滞|滲 渗|滷 卤|滸 浒|滻 浐|滾 滚|滿 满|漁 渔|漊 溇|漍 𬇹|漚 沤|漢 汉|漣 涟|漬 渍|漲 涨|漵 溆|漸 渐|漿 浆|潁 颍|潑 泼|潔 洁|潕 𣲘|潙 沩|潚 㴋|潛 潜|潤 润|潯 浔|潰 溃|潷 滗|潿 涠|澀 涩|澆 浇|澇 涝|澐 沄|澗 涧|澠 渑|澤 泽|澦 滪|澩 泶|澫 𬇕|澮 浍|澱 淀|澾 㳠|濁 浊|濃 浓|濄 㳡|濆 𣸣|濕 湿|濘 泞|濚 溁|濛 蒙|濜 浕|濟 济|濤 涛|濧 㳔|濫 滥|濰 潍|濱 滨|濺 溅|濼 泺|濾 滤|瀂 澛|瀅 滢|瀆 渎|瀇 㲿|瀉 泻|瀋 沈|瀏 浏|瀕 濒|瀘 泸|瀝 沥|瀟 潇|瀠 潆|瀦 潴|瀧 泷|瀨 濑|瀰 弥|瀲 潋|瀾 澜|灃 沣|灄 滠|灑 洒|灒 𪷽|灕 漓|灘 滩|灙 𣺼|灝 灏|灡 㳕|灣 湾|灤 滦|灧 滟|灩 滟|災 灾|為 为|烏 乌|烴 烃|無 无|煉 炼|煒 炜|煙 烟|煢 茕|煥 焕|煩 烦|煬 炀|煱 㶽|熅 煴|熒 荧|熗 炝|熰 𬉼|熱 热|熲 颎|熾 炽|燀 𬊤|燁 烨|燈 灯|燉 炖|燒 烧|燖 𬊈|燙 烫|燜 焖|營 营|燦 灿|燬 毁|燭 烛|燴 烩|燶 㶶|燻 熏|燼 烬|燾 焘|爍 烁|爐 炉|爛 烂|爭 争|爲 为|爺 爷|爾 尔|牀 床|牆 墙|牘 牍|牴 抵|牽 牵|犖 荦|犛 牦|犢 犊|犧 牺|狀 状|狹 狭|狽 狈|猙 狰|猶 犹|猻 狲|獁 犸|獃 呆|獄 狱|獅 狮|獎 奖|獨 独|獪 狯|獫 猃|獮 狝|獰 狞|獱 㺍|獲 获|獵 猎|獷 犷|獸 兽|獺 獭|獻 献|獼 猕|玀 猡|現 现|琱 雕|琺 珐|琿 珲|瑋 玮|瑒 玚|瑣 琐|瑤 瑶|瑩 莹|瑪 玛|瑲 玱|璉 琏|璊 𫞩|璕 𬍤|璗 𬍡|璡 琎|璣 玑|璦 瑷|璫 珰|璯 㻅|環 环|璵 玙|璸 瑸|璽 玺|璿 璇|瓅 𬍛|瓊 琼|瓏 珑|瓔 璎|瓚 瓒|瓛 𤩽|甌 瓯|甕 瓮|產 产|産 产|畝 亩|畢 毕|畫 画|異 异|畵 画|當 当|疇 畴|疊 叠|痙 痉|痠 酸|痾 疴|瘂 痖|瘋 疯|瘍 疡|瘓 痪|瘞 瘗|瘡 疮|瘧 疟|瘮 瘆|瘲 疭|瘺 瘘|瘻 瘘|療 疗|癆 痨|癇 痫|癉 瘅|癒 愈|癘 疠|癟 瘪|癡 痴|癢 痒|癤 疖|癥 症|癧 疬|癩 癞|癬 癣|癭 瘿|癮 瘾|癰 痈|癱 瘫|癲 癫|發 发|皁 皂|皚 皑|皰 疱|皸 皲|皺 皱|盃 杯|盜 盗|盞 盏|盡 尽|監 监|盤 盘|盧 卢|盪 荡|眞 真|眥 眦|眾 众|睍 𪾢|睏 困|睜 睁|睞 睐|瞘 眍|瞜 䁖|瞞 瞒|瞶 瞆|瞼 睑|矇 蒙|矓 眬|矚 瞩|矯 矫|硃 朱|硜 硁|硤 硖|硨 砗|硯 砚|碕 埼|碩 硕|碭 砀|碸 砜|確 确|碼 码|碽 䂵|磑 硙|磚 砖|磠 硵|磣 碜|磧 碛|磯 矶|磽 硗|磾 䃅|礄 硚|礎 础|礐 𬒈|礙 碍|礦 矿|礪 砺|礫 砾|礬 矾|礱 砻|祕 秘|祿 禄|禍 祸|禎 祯|禕 祎|禡 祃|禦 御|禪 禅|禮 礼|禰 祢|禱 祷|禿 秃|秈 籼|稅 税|稈 秆|稏 䅉|稜 棱|稟 禀|種 种|稱 称|穀 谷|穇 䅟|穌 稣|積 积|穎 颖|穠 秾|穡 穑|穢 秽|穩 稳|穫 获|穭 穞|窩 窝|窪 洼|窮 穷|窯 窑|窵 窎|窶 窭|窺 窥|竄 窜|竅 窍|竇 窦|竈 灶|竊 窃|竪 竖|競 竞|筆 笔|筍 笋|筧 笕|筴 䇲|箇 个|箋 笺|箏 筝|箚 札|節 节|範 范|築 筑|篋 箧|篔 筼|篠 筿|篢 𬕂|篤 笃|篩 筛|篳 筚|篸 𥮾|簀 箦|簍 篓|簑 蓑|簞 箪|簡 简|簣 篑|簫 箫|簹 筜|簽 签|簾 帘|籃 篮|籅 𥫣|籌 筹|籔 䉤|籙 箓|籛 篯|籜 箨|籟 籁|籠 笼|籤 签|籩 笾|籪 簖|籬 篱|籮 箩|籲 吁|粵 粤|糉 粽|糝 糁|糞 粪|糧 粮|糰 团|糲 粝|糴 籴|糶 粜|糹 纟|糾 纠|紀 纪|紂 纣|紃 𬘓|約 约|紅 红|紆 纡|紇 纥|紈 纨|紉 纫|紋 纹|納 纳|紐 纽|紓 纾|純 纯|紕 纰|紖 纼|紗 纱|紘 纮|紙 纸|級 级|紛 纷|紜 纭|紝 纴|紞 𬘘|紡 纺|紬 䌷|紮 扎|細 细|紱 绂|紲 绁|紳 绅|紵 纻|紹 绍|紺 绀|紼 绋|紿 绐|絀 绌|終 终|絃 弦|組 组|絅 䌹|絆 绊|絎 绗|結 结|絕 绝|絛 绦|絝 绔|絞 绞|絡 络|絢 绚|給 给|絨 绒|絪 𬘡|絰 绖|統 统|絲 丝|絳 绛|絶 绝|絹 绢|絺 𫄨|綁 绑|綃 绡|綄 𬘫|綆 绠|綈 绨|綉 绣|綌 绤|綎 𬘩|綏 绥|綐 䌼|綑 捆|經 经|綖 𫄧|綜 综|綝 𬘭|綞 缍|綠 绿|綡 𫟅|綢 绸|綣 绻|綧 𬘯|綪 𬘬|綫 线|綬 绶|維 维|綯 绹|綰 绾|綱 纲|網 网|綳 绷|綴 缀|綵 彩|綸 纶|綹 绺|綺 绮|綻 绽|綽 绰|綾 绫|綿 绵|緄 绲|緇 缁|緊 紧|緋 绯|緑 绿|緒 绪|緓 绬|緔 绱|緗 缃|緘 缄|緙 缂|線 线|緝 缉|緞 缎|締 缔|緡 缗|緣 缘|緦 缌|編 编|緩 缓|緬 缅|緯 纬|緱 缑|緲 缈|練 练|緶 缏|緹 缇|緻 致|緼 缊|縈 萦|縉 缙|縊 缢|縋 缒|縐 绉|縑 缣|縕 缊|縗 缞|縛 缚|縝 缜|縞 缟|縟 缛|縣 县|縧 绦|縫 缝|縭 缡|縮 缩|縯 𬙂|縱 纵|縲 缧|縳 䌸|縴 纤|縵 缦|縶 絷|縷 缕|縹 缥|總 总|績 绩|繃 绷|繅 缫|繆 缪|繒 缯|織 织|繕 缮|繚 缭|繞 绕|繡 绣|繢 缋|繩 绳|繪 绘|繫 系|繭 茧|繮 缰|繯 缳|繰 缲|繳 缴|繶 𫄷|繸 䍁|繹 绎|繻 𦈡|繼 继|繽 缤|繾 缱|繿 䍀|纁 𫄸|纆 𬙊|纇 颣|纈 缬|纊 纩|續 续|纍 累|纏 缠|纓 缨|纔 才|纕 𬙋|纖 纤|纘 缵|纜 缆|缽 钵|罃 䓨|罈 坛|罌 罂|罎 坛|罰 罚|罵 骂|罷 罢|羅 罗|羆 罴|羈 羁|羋 芈|羣 群|羥 羟|羨 羡|義 义|羶 膻|習 习|翫 玩|翬 翚|翹 翘|翽 翙|耬 耧|耮 耢|聖 圣|聞 闻|聯 联|聰 聪|聲 声|聳 耸|聵 聩|聶 聂|職 职|聹 聍|聽 听|聾 聋|肅 肃|脅 胁|脈 脉|脛 胫|脣 唇|脩 修|脫 脱|脹 胀|腎 肾|腖 胨|腡 脶|腦 脑|腫 肿|腳 脚|腸 肠|膃 腽|膕 腘|膚 肤|膞 䏝|膠 胶|膢 𦝼|膩 腻|膽 胆|膾 脍|膿 脓|臉 脸|臍 脐|臏 膑|臘 腊|臚 胪|臟 脏|臠 脔|臢 臜|臥 卧|臨 临|臺 台|與 与|興 兴|舉 举|舊 旧|舖 铺|舘 馆|艙 舱|艤 舣|艦 舰|艫 舻|艱 艰|艷 艳|芻 刍|苧 苎|茲 兹|荊 荆|莊 庄|莖 茎|莢 荚|莧 苋|華 华|菴 庵|菸 烟|萇 苌|萊 莱|萬 万|萴 荝|萵 莴|葉 叶|葒 荭|葤 荮|葦 苇|葯 药|葷 荤|蒍 𫇭|蒐 搜|蒓 莼|蒔 莳|蒕 蒀|蒞 莅|蒼 苍|蓀 荪|蓆 席|蓋 盖|蓮 莲|蓯 苁|蓴 莼|蓽 荜|蔄 𬜬|蔔 卜|蔘 参|蔞 蒌|蔣 蒋|蔥 葱|蔦 茑|蔭 荫|蔯 𫈟|蔿 𫇭|蕁 荨|蕆 蒇|蕎 荞|蕒 荬|蕓 芸|蕕 莸|蕘 荛|蕢 蒉|蕩 荡|蕪 芜|蕭 萧|蕷 蓣|薀 蕰|薈 荟|薊 蓟|薌 芗|薑 姜|薔 蔷|薘 荙|薟 莶|薦 荐|薩 萨|薳 䓕|薴 苧|薵 䓓|薹 苔|薺 荠|藍 蓝|藎 荩|藝 艺|藥 药|藪 薮|藭 䓖|藴 蕴|藶 苈|藹 蔼|藺 蔺|蘀 萚|蘄 蕲|蘆 芦|蘇 苏|蘊 蕴|蘋 苹|蘚 藓|蘞 蔹|蘟 𦻕|蘢 茏|蘭 兰|蘺 蓠|蘿 萝|虆 蔂|虉 𬟁|處 处|虛 虚|虜 虏|號 号|虧 亏|虯 虬|蛺 蛱|蛻 蜕|蜆 蚬|蝀 𬟽|蝕 蚀|蝟 猬|蝦 虾|蝨 虱|蝸 蜗|螄 蛳|螞 蚂|螢 萤|螮 䗖|螻 蝼|螿 螀|蟄 蛰|蟈 蝈|蟎 螨|蟣 虮|蟬 蝉|蟯 蛲|蟲 虫|蟳 𫊻|蟶 蛏|蟻 蚁|蠁 蚃|蠅 蝇|蠆 虿|蠍 蝎|蠐 蛴|蠑 蝾|蠔 蚝|蠟 蜡|蠣 蛎|蠨 蟏|蠱 蛊|蠶 蚕|蠻 蛮|衆 众|衊 蔑|術 术|衕 同|衚 胡|衛 卫|衝 冲|袞 衮|袷 夹|裊 袅|裏 里|補 补|裝 装|裡 里|製 制|複 复|褌 裈|褘 袆|褲 裤|褳 裢|褸 褛|褻 亵|襀 𫌀|襇 裥|襉 裥|襏 袯|襖 袄|襝 裣|襠 裆|襤 褴|襪 袜|襬 摆|襯 衬|襲 袭|襴 襕|覈 核|見 见|覎 觃|規 规|覓 觅|視 视|覘 觇|覡 觋|覥 觍|覦 觎|親 亲|覬 觊|覯 觏|覲 觐|覷 觑|覺 觉|覽 览|覿 觌|觀 观|觴 觞|觶 觯|觸 触|訁 讠|訂 订|訃 讣|計 计|訊 讯|訌 讧|討 讨|訏 𬣙|訐 讦|訒 讱|訓 训|訕 讪|訖 讫|託 托|記 记|訛 讹|訝 讶|訟 讼|訢 䜣|訣 诀|訥 讷|訩 讻|訪 访|設 设|許 许|訴 诉|訶 诃|診 诊|註 注|証 证|詀 𧮪|詁 诂|詆 诋|詎 讵|詐 诈|詒 诒|詔 诏|評 评|詖 诐|詗 诇|詘 诎|詛 诅|詝 𬣞|詞 词|詠 咏|詡 诩|詢 询|詣 诣|試 试|詩 诗|詪 𬣳|詫 诧|詬 诟|詭 诡|詮 诠|詰 诘|話 话|該 该|詳 详|詵 诜|詷 𫍣|詼 诙|詿 诖|誄 诔|誅 诛|誆 诓|誇 夸|誌 志|認 认|誑 诳|誒 诶|誕 诞|誘 诱|誚 诮|語 语|誠 诚|誡 诫|誣 诬|誤 误|誥 诰|誦 诵|誨 诲|說 说|説 说|誰 谁|課 课|誶 谇|誹 诽|誼 谊|誾 訚|調 调|諂 谄|諄 谆|談 谈|諉 诿|請 请|諍 诤|諏 诹|諑 诼|諒 谅|諓 𬣡|論 论|諗 谂|諛 谀|諜 谍|諝 谞|諞 谝|諟 𬤊|諡 谥|諢 诨|諤 谔|諦 谛|諧 谐|諫 谏|諭 谕|諮 咨|諱 讳|諲 𬤇|諳 谙|諴 𫍯|諶 谌|諷 讽|諸 诸|諺 谚|諼 谖|諾 诺|謀 谋|謁 谒|謂 谓|謄 誊|謅 诌|謊 谎|謎 谜|謏 𫍲|謐 谧|謔 谑|謖 谡|謗 谤|謙 谦|謚 谥|講 讲|謝 谢|謠 谣|謡 谣|謨 谟|謫 谪|謬 谬|謭 谫|謳 讴|謹 谨|謾 谩|譁 哗|證 证|譎 谲|譏 讥|譓 𬤝|譖 谮|識 识|譙 谯|譚 谭|譜 谱|譞 𫍽|譟 噪|譫 谵|譭 毁|譯 译|議 议|譴 谴|護 护|譸 诪|譽 誉|譾 谫|讀 读|讅 谉|變 变|讋 詟|讌 䜩|讎 雠|讒 谗|讓 让|讕 谰|讖 谶|讚 赞|讜 谠|讞 谳|谿 溪|豈 岂|豎 竖|豐 丰|豔 艳|豬 猪|豶 豮|貍 狸|貓 猫|貙 䝙|貝 贝|貞 贞|貟 贠|負 负|財 财|貢 贡|貧 贫|貨 货|販 贩|貪 贪|貫 贯|責 责|貯 贮|貰 贳|貲 赀|貳 贰|貴 贵|貶 贬|買 买|貸 贷|貺 贶|費 费|貼 贴|貽 贻|貿 贸|賀 贺|賁 贲|賂 赂|賃 赁|賄 贿|賅 赅|資 资|賈 贾|賊 贼|賑 赈|賒 赊|賓 宾|賕 赇|賙 赒|賚 赉|賜 赐|賞 赏|賠 赔|賡 赓|賢 贤|賣 卖|賤 贱|賦 赋|賧 赕|質 质|賫 赍|賬 账|賭 赌|賰 䞐|賴 赖|賵 赗|賺 赚|賻 赙|購 购|賽 赛|賾 赜|贄 贽|贅 赘|贇 赟|贈 赠|贊 赞|贋 赝|贍 赡|贏 赢|贐 赆|贓 赃|贔 赑|贖 赎|贗 赝|贛 赣|贜 赃|赬 赪|趕 赶|趙 赵|趨 趋|趲 趱|跡 迹|踐 践|踰 逾|踴 踊|蹌 跄|蹕 跸|蹟 迹|蹠 跖|蹣 蹒|蹤 踪|蹺 跷|躂 跶|躉 趸|躊 踌|躋 跻|躍 跃|躎 䟢|躑 踯|躒 跞|躓 踬|躕 蹰|躚 跹|躡 蹑|躥 蹿|躦 躜|躪 躏|軀 躯|車 车|軋 轧|軌 轨|軍 军|軏 𫐄|軑 轪|軒 轩|軔 轫|軛 轭|軝 𬨂|軟 软|軤 轷|軫 轸|軲 轱|軸 轴|軹 轵|軺 轺|軻 轲|軼 轶|軾 轼|較 较|輄 𨐈|輅 辂|輇 辁|輈 辀|載 载|輊 轾|輋 𪨶|輒 辄|輓 挽|輔 辅|輕 轻|輗 𫐐|輛 辆|輜 辎|輝 辉|輞 辋|輟 辍|輥 辊|輦 辇|輩 辈|輪 轮|輬 辌|輮 𫐓|輯 辑|輳 辏|輶 𬨎|輸 输|輻 辐|輼 辒|輾 辗|輿 舆|轀 辒|轂 毂|轄 辖|轅 辕|轆 辘|轉 转|轍 辙|轎 轿|轔 辚|轟 轰|轡 辔|轢 轹|轤 轳|辦 办|辭 辞|辮 辫|辯 辩|農 农|迴 回|逕 径|這 这|連 连|週 周|進 进|遊 游|運 运|過 过|達 达|違 违|遙 遥|遜 逊|遞 递|遠 远|遡 溯|適 适|遲 迟|遶 绕|遷 迁|選 选|遺 遗|遼 辽|邁 迈|還 还|邇 迩|邊 边|邏 逻|邐 逦|郟 郏|郵 邮|鄆 郓|鄉 乡|鄒 邹|鄔 邬|鄖 郧|鄧 邓|鄩 𬩽|鄭 郑|鄰 邻|鄲 郸|鄳 𫑡|鄴 邺|鄶 郐|鄺 邝|酇 酂|酈 郦|醃 腌|醖 酝|醜 丑|醞 酝|醟 蒏|醣 糖|醫 医|醬 酱|醱 酦|醲 𬪩|釀 酿|釁 衅|釃 酾|釅 酽|釋 释|釐 厘|釒 钅|釓 钆|釔 钇|釕 钌|釗 钊|釘 钉|釙 钋|針 针|釣 钓|釤 钐|釦 扣|釧 钏|釩 钒|釴 𬬩|釵 钗|釷 钍|釹 钕|釺 钎|釾 䥺|釿 𬬱|鈀 钯|鈁 钫|鈃 钘|鈄 钭|鈅 钥|鈇 𫓧|鈈 钚|鈉 钠|鈍 钝|鈎 钩|鈐 钤|鈑 钣|鈒 钑|鈔 钞|鈕 钮|鈞 钧|鈡 钟|鈣 钙|鈥 钬|鈦 钛|鈧 钪|鈮 铌|鈰 铈|鈳 钶|鈴 铃|鈷 钴|鈸 钹|鈹 铍|鈺 钰|鈽 钸|鈾 铀|鈿 钿|鉀 钾|鉅 巨|鉆 钻|鉈 铊|鉉 铉|鉊 𬬿|鉋 铇|鉍 铋|鉑 铂|鉕 钷|鉗 钳|鉚 铆|鉛 铅|鉝 𫟷|鉞 钺|鉢 钵|鉤 钩|鉥 𬬸|鉦 钲|鉧 𬭁|鉬 钼|鉭 钽|鉮 𬬹|鉳 锫|鉶 铏|鉷 𫟹|鉸 铰|鉺 铒|鉻 铬|鉿 铪|銀 银|銃 铳|銅 铜|銈 𫓯|銍 铚|銑 铣|銓 铨|銖 铢|銘 铭|銚 铫|銛 铦|銜 衔|銠 铑|銣 铷|銥 铱|銦 铟|銨 铵|銩 铥|銪 铕|銫 铯|銬 铐|銱 铞|銳 锐|銶 𨱇|銷 销|銹 锈|銻 锑|銼 锉|鋁 铝|鋃 锒|鋅 锌|鋇 钡|鋌 铤|鋏 铗|鋐 𬭎|鋒 锋|鋗 𫓶|鋙 铻|鋝 锊|鋟 锓|鋣 铘|鋤 锄|鋥 锃|鋦 锔|鋨 锇|鋩 铓|鋪 铺|鋭 锐|鋮 铖|鋯 锆|鋰 锂|鋱 铽|鋶 锍|鋸 锯|鋹 𬬮|鋼 钢|錀 𬬭|錁 锞|錄 录|錆 锖|錇 锫|錈 锩|錏 铔|錐 锥|錒 锕|錕 锟|錘 锤|錙 锱|錚 铮|錛 锛|錞 𬭚|錟 锬|錠 锭|錡 锜|錢 钱|錤 𫓹|錦 锦|錨 锚|錩 锠|錫 锡|錮 锢|錯 错|録 录|錳 锰|錶 表|錸 铼|錼 镎|鍀 锝|鍁 锨|鍃 锪|鍅 钫|鍆 钔|鍇 锴|鍈 锳|鍊 炼|鍋 锅|鍍 镀|鍔 锷|鍘 铡|鍚 钖|鍛 锻|鍠 锽|鍤 锸|鍥 锲|鍩 锘|鍬 锹|鍭 𬭤|鍰 锾|鍵 键|鍶 锶|鍺 锗|鍼 针|鍾 钟|鎂 镁|鎄 锿|鎇 镅|鎊 镑|鎌 镰|鎓 𬭩|鎔 镕|鎖 锁|鎘 镉|鎚 锤|鎛 镈|鎝 𨱏|鎡 镃|鎢 钨|鎣 蓥|鎦 镏|鎧 铠|鎩 铩|鎪 锼|鎬 镐|鎭 镇|鎮 镇|鎰 镒|鎲 镋|鎳 镍|鎵 镓|鎶 鿔|鎸 镌|鎿 镎|鏃 镞|鏇 旋|鏈 链|鏌 镆|鏍 镙|鏏 𬭬|鏐 镠|鏑 镝|鏗 铿|鏘 锵|鏜 镗|鏝 镘|鏞 镛|鏟 铲|鏡 镜|鏢 镖|鏤 镂|鏨 錾|鏰 镚|鏵 铧|鏷 镤|鏹 镪|鏺 䥽|鏻 𬭸|鏽 锈|鐃 铙|鐄 𨱑|鐇 𫔍|鐋 铴|鐍 𫔎|鐏 𨱔|鐐 镣|鐒 铹|鐓 镦|鐔 镡|鐘 钟|鐙 镫|鐝 镢|鐠 镨|鐥 䦅|鐦 锎|鐧 锏|鐨 镄|鐩 𬭼|鐫 镌|鐮 镰|鐯 䦃|鐲 镯|鐳 镭|鐵 铁|鐶 镮|鐸 铎|鐺 铛|鐽 𫟼|鐿 镱|鑄 铸|鑊 镬|鑌 镔|鑑 鉴|鑒 鉴|鑔 镲|鑕 锧|鑞 镴|鑠 铄|鑣 镳|鑥 镥|鑪 𬬻|鑭 镧|鑰 钥|鑱 镵|鑲 镶|鑷 镊|鑹 镩|鑼 锣|鑽 钻|鑾 銮|鑿 凿|钁 镢|钂 镋|長 长|門 门|閂 闩|閃 闪|閆 闫|閈 闬|閉 闭|開 开|閌 闶|閎 闳|閏 闰|閑 闲|閒 闲|間 间|閔 闵|閘 闸|閡 阂|閣 阁|閤 合|閥 阀|閨 闺|閩 闽|閫 阃|閬 阆|閭 闾|閱 阅|閲 阅|閶 阊|閹 阉|閻 阎|閼 阏|閽 阍|閾 阈|閿 阌|闃 阒|闆 板|闇 暗|闈 闱|闉 𬮱|闊 阔|闋 阕|闌 阑|闍 阇|闐 阗|闑 𫔶|闒 阘|闓 闿|闔 阖|闕 阙|闖 闯|關 关|闞 阚|闠 阓|闡 阐|闢 辟|闤 阛|闥 闼|陘 陉|陝 陕|陞 升|陣 阵|陰 阴|陳 陈|陸 陆|陽 阳|隉 陧|隊 队|階 阶|隑 𬮿|隕 陨|際 际|隤 𬯎|隨 随|險 险|隮 𬯀|隯 陦|隱 隐|隴 陇|隸 隶|隻 只|雋 隽|雖 虽|雙 双|雛 雏|雜 杂|雞 鸡|離 离|難 难|雲 云|電 电|霑 沾|霢 霡|霧 雾|霽 霁|靂 雳|靄 霭|靆 叇|靈 灵|靉 叆|靚 靓|靜 静|靝 靔|靦 腼|靨 靥|鞏 巩|鞝 绱|鞦 秋|鞽 鞒|韁 缰|韃 鞑|韆 千|韉 鞯|韋 韦|韌 韧|韍 韨|韓 韩|韙 韪|韜 韬|韝 鞲|韞 韫|韻 韵|響 响|頁 页|頂 顶|頃 顷|項 项|順 顺|頇 顸|須 须|頊 顼|頌 颂|頍 𫠆|頎 颀|頏 颃|預 预|頑 顽|頒 颁|頓 顿|頔 𬱖|頗 颇|領 领|頜 颌|頠 𬱟|頡 颉|頤 颐|頦 颏|頫 𫖯|頭 头|頮 颒|頰 颊|頲 颋|頴 颕|頵 𫖳|頷 颔|頸 颈|頹 颓|頻 频|頽 颓|顆 颗|題 题|額 额|顎 颚|顏 颜|顒 颙|顓 颛|顔 颜|顗 𫖮|願 愿|顙 颡|顛 颠|類 类|顢 颟|顥 颢|顧 顾|顫 颤|顬 颥|顯 显|顰 颦|顱 颅|顳 颞|顴 颧|風 风|颭 飐|颮 飑|颯 飒|颱 台|颳 刮|颶 飓|颸 飔|颺 飏|颻 飖|颼 飕|飀 飗|飄 飘|飆 飙|飈 飚|飛 飞|飠 饣|飢 饥|飣 饤|飥 饦|飩 饨|飪 饪|飫 饫|飭 饬|飯 饭|飱 飧|飲 饮|飴 饴|飼 饲|飽 饱|飾 饰|飿 饳|餃 饺|餄 饸|餅 饼|餈 糍|餉 饷|養 养|餌 饵|餎 饹|餏 饻|餑 饽|餒 馁|餓 饿|餕 馂|餖 饾|餗 𫗧|餘 余|餚 肴|餛 馄|餜 馃|餞 饯|餡 馅|館 馆|餬 糊|餱 糇|餳 饧|餵 喂|餶 馉|餷 馇|餸 𩠌|餺 馎|餼 饩|餾 馏|餿 馊|饁 馌|饃 馍|饅 馒|饈 馐|饉 馑|饊 馓|饋 馈|饌 馔|饑 饥|饒 饶|饗 飨|饘 𫗴|饜 餍|饞 馋|饢 馕|馬 马|馭 驭|馮 冯|馱 驮|馳 驰|馴 驯|馹 驲|馼 𫘜|駁 驳|駃 𫘝|駉 𬳶|駐 驻|駑 驽|駒 驹|駓 𬳵|駔 驵|駕 驾|駘 骀|駙 驸|駛 驶|駝 驼|駟 驷|駡 骂|駢 骈|駪 𬳽|駭 骇|駰 骃|駱 骆|駸 骎|駼 𬳿|駿 骏|騁 骋|騂 骍|騄 𫘧|騅 骓|騊 𫘦|騌 骔|騍 骒|騎 骑|騏 骐|騑 𬴂|騖 骛|騙 骗|騞 𬴃|騠 𫘨|騤 骙|騧 䯄|騫 骞|騭 骘|騮 骝|騰 腾|騱 𫘬|騵 𫘪|騶 驺|騷 骚|騸 骟|騾 骡|驀 蓦|驁 骜|驂 骖|驃 骠|驄 骢|驅 驱|驊 骅|驌 骕|驍 骁|驎 𬴊|驏 骣|驕 骄|驗 验|驚 惊|驛 驿|驟 骤|驢 驴|驤 骧|驥 骥|驦 骦|驪 骊|驫 骉|骯 肮|髏 髅|髒 脏|體 体|髕 髌|髖 髋|髮 发|鬆 松|鬍 胡|鬚 须|鬢 鬓|鬥 斗|鬧 闹|鬨 哄|鬩 阋|鬮 阄|鬱 郁|鬹 鬶|魎 魉|魘 魇|魚 鱼|魛 鱽|魟 𫚉|魢 鱾|魨 鲀|魯 鲁|魴 鲂|魷 鱿|魺 鲄|鮀 𬶍|鮁 鲅|鮃 鲆|鮆 𫚖|鮈 𬶋|鮊 鲌|鮋 鲉|鮍 鲏|鮎 鲇|鮐 鲐|鮑 鲍|鮒 鲋|鮓 鲊|鮚 鲒|鮜 鲘|鮝 鲞|鮞 鲕|鮟 𩽾|鮠 𬶏|鮡 𬶐|鮣 䲟|鮦 鲖|鮪 鲔|鮫 鲛|鮭 鲑|鮮 鲜|鮳 鲓|鮶 鲪|鮸 𩾃|鮺 鲝|鯀 鲧|鯁 鲠|鯇 鲩|鯉 鲤|鯊 鲨|鯒 鲬|鯔 鲻|鯕 鲯|鯖 鲭|鯗 鲞|鯛 鲷|鯝 鲴|鯡 鲱|鯢 鲵|鯤 鲲|鯧 鲳|鯨 鲸|鯪 鲮|鯫 鲰|鯰 鲶|鯴 鲺|鯷 鳀|鯻 𬶟|鯽 鲫|鯿 鳊|鰁 鳈|鰂 鲗|鰃 鳂|鰆 䲠|鰈 鲽|鰉 鳇|鰊 𬶠|鰌 䲡|鰍 鳅|鰏 鲾|鰐 鳄|鰒 鳆|鰓 鳃|鰛 鳁|鰜 鳒|鰟 鳑|鰠 鳋|鰣 鲥|鰤 𫚕|鰥 鳏|鰧 䲢|鰨 鳎|鰩 鳐|鰭 鳍|鰮 鳁|鰱 鲢|鰲 鳌|鰳 鳓|鰵 鳘|鰶 𬶭|鰷 鲦|鰹 鲣|鰺 鲹|鰻 鳗|鰼 鳛|鰾 鳔|鱀 𬶨|鱂 鳉|鱅 鳙|鱇 𩾌|鱈 鳕|鱉 鳖|鱒 鳟|鱔 鳝|鱖 鳜|鱗 鳞|鱘 鲟|鱚 𬶮|鱝 鲼|鱟 鲎|鱠 鲙|鱣 鳣|鱤 鳡|鱧 鳢|鱨 鲿|鱭 鲚|鱯 鳠|鱲 𫚭|鱷 鳄|鱸 鲈|鱺 鲡|鳥 鸟|鳧 凫|鳩 鸠|鳬 凫|鳲 鸤|鳳 凤|鳴 鸣|鳶 鸢|鳾 䴓|鴆 鸩|鴇 鸨|鴉 鸦|鴒 鸰|鴕 鸵|鴛 鸳|鴝 鸲|鴞 鸮|鴟 鸱|鴣 鸪|鴦 鸯|鴨 鸭|鴯 鸸|鴰 鸹|鴴 鸻|鴷 䴕|鴻 鸿|鴿 鸽|鵁 䴔|鵂 鸺|鵃 鸼|鵏 𬷕|鵐 鹀|鵑 鹃|鵒 鹆|鵓 鹁|鵜 鹈|鵝 鹅|鵟 𫛭|鵠 鹄|鵡 鹉|鵪 鹌|鵬 鹏|鵮 鹐|鵯 鹎|鵰 雕|鵲 鹊|鵷 鹓|鵾 鹍|鶄 䴖|鶇 鸫|鶉 鹑|鶊 鹒|鶓 鹋|鶖 鹙|鶘 鹕|鶚 鹗|鶠 𬸘|鶡 鹖|鶥 鹛|鶩 鹜|鶪 䴗|鶬 鸧|鶯 莺|鶱 𬸣|鶲 鹟|鶴 鹤|鶹 鹠|鶺 鹡|鶻 鹘|鶼 鹣|鶿 鹚|鷀 鹚|鷁 鹢|鷂 鹞|鷄 鸡|鷉 䴘|鷊 鹝|鷓 鹧|鷖 鹥|鷗 鸥|鷙 鸷|鷚 鹨|鷟 𬸦|鷥 鸶|鷦 鹪|鷫 鹔|鷭 𬸪|鷯 鹩|鷲 鹫|鷳 鹇|鷴 鹇|鷸 鹬|鷹 鹰|鷺 鹭|鷽 鸴|鸂 㶉|鸇 鹯|鸊 䴙|鸌 鹱|鸏 鹲|鸑 𬸚|鸕 鸬|鸘 鹴|鸚 鹦|鸛 鹳|鸝 鹂|鸞 鸾|鹵 卤|鹹 咸|鹺 鹾|鹼 碱|鹽 盐|麗 丽|麥 麦|麩 麸|麪 面|麫 面|麬 𤿲|麯 曲|麳 𪎌|麴 曲|麵 面|麼 么|麽 么|黃 黄|黌 黉|點 点|黨 党|黲 黪|黴 霉|黶 黡|黷 黩|黽 黾|黿 鼋|鼂 鼌|鼉 鼍|鼕 冬|鼴 鼹|齊 齐|齋 斋|齎 赍|齏 齑|齒 齿|齔 龀|齕 龁|齗 龂|齘 𬹼|齙 龅|齜 龇|齟 龃|齠 龆|齡 龄|齣 出|齦 龈|齧 啮|齪 龊|齬 龉|齮 𬺈|齯 𫠜|齲 龋|齶 腭|齷 龌|齼 𬺓|龍 龙|龎 厐|龐 庞|龑 䶮|龔 龚|龕 龛|龜 龟|鿁 䜤|鿓 鿒|𠁞 𠀾|𠌥 𠌥|𠏢 𠏢|𠐊 𠐊|𠗣 㓆|𠞆 𠞆|𠠎 𠠎|𠬙 𠬙|𠼤 𠼤|𠽃 𠽃|𠿕 𠿕|𡂡 𡂡|𡃄 𡃄|𡃕 𠴛|𡃤 𡃤|𡄔 𡄔|𡄣 𡄣|𡅏 𠲥|𡅯 𡅯|𡑍 𫭼|𡑭 𡋗|𡓁 𡓁|𡓾 𡋀|𡔖 𡍣|𡞵 㛟|𡟫 𡟫|𡠹 㛿|𡢃 㛠|𡮉 𡭜|𡮣 𡭬|𡳳 𡳃|𡸗 𡸗|𡹬 𡹬|𡻕 岁|𡽗 𡽗|𡾱 㟜|𡿖 𡿖|𢍰 𢍰|𢠼 𢠼|𢣐 𢣐|𢣚 𢘝|𢣭 𢣭|𢤩 𢤩|𢤱 𢤱|𢤿 𢤿|𢯷 𢯷|𢶒 𢶒|𢶫 𢫞|𢷮 𢷮|𢹿 𢬦|𢺳 𢺳|𣈶 暅|𣋋 𣋋|𣍐 𣍐|𣙎 㭣|𣜬 𣜬|𣝕 𣝕|𣞻 𣘓|𣠩 𣞎|𣠲 𣑶|𣯩 𣯩|𣯴 𣯴|𣯶 毶|𣽏 𣽏|𣾷 㳢|𣿉 𣿉|𤁣 𣺽|𤄷 𤄷|𤅶 𣷷|𤑳 𤑳|𤑹 𤑹|𤒎 𤒎|𤒻 𤒻|𤓌 𤓌|𤓎 𤓎|𤓩 𤊰|𤘀 𤘀|𤛮 𤛮|𤛱 𤛱|𤜆 𤜆|𤠮 𤠮|𤢟 𤢟|𤢻 𤢻|𤩂 𤩂|𤪺 㻘|𤫩 㻏|𤬅 𤬅|𤳷 𤳷|𤳸 𤳄|𤷃 𤷃|𤸫 𤸫|𤺔 𤺔|𥊝 𥅿|𥌃 𥅘|𥏝 𥏝|𥕥 𥐰|𥖅 𥐯|𥖲 𥖲|𥗇 𥗇|𥗽 𬒗|𥜐 𥜐|𥜰 𥜰|𥞵 𥞵|𥢢 䅪|𥢶 𥢶|𥢷 𥢷|𥨐 𥨐|𥪂 𥪂|𥯤 𥯤|𥴨 𥴨|𥴼 𥴼|𥵃 𥵃|𥵊 𥵊|𥶽 𥶽|𥸠 𥮋|𥻦 𥻦|𥼽 𥹥|𥽖 𥽖|𥾯 𥾯|𥿊 𥿊|𦀖 𦀖|𦂅 𦂅|𦃄 𦃄|𦃩 𦃩|𦅇 𦅇|𦅈 𦅈|𦆲 𦆲|𦒀 𦒀|𦔖 𦔖|𦘧 𡳒|𦟼 𦟼|𦠅 𦠅|𦡝 𦡝|𦢈 𦢈|𦣎 𦟗|𦧺 𦧺|𦪙 䑽|𦪽 𦪽|𦱌 𦱌|𦾟 𦾟|𧎈 𧎈|𧒯 𧒯|𧔥 𧔥|𧕟 𧕟|𧜗 䘞|𧜵 䙊|𧝞 䘛|𧞫 𧞫|𧟀 𧝧|𧡴 𧡴|𧢄 𧢄|𧦝 𧦝|𧦧 𧦧|𧩕 𧩕|𧩙 䜥|𧩼 𧩼|𧫝 𧫝|𧬤 𧬤|𧭈 𧭈|𧭹 𧭹|𧳟 𧳟|𧵳 䞌|𧶔 𧶔|𧶧 䞎|𧷎 𧷎|𧸘 𧸘|𧹈 𧹈|𧽯 𧽯|𨂐 𨂐|𨄣 𨄣|𨅍 𨅍|𨆪 𨆪|𨇁 𨇁|𨇞 𨇞|𨇤 𨇤|𨇰 𨇰|𨇽 𨇽|𨈊 𨈊|𨈌 𨈌|𨊰 䢀|𨊸 䢁|𨊻 𨊻|𨋢 䢂|𨌈 𨌈|𨍰 𨍰|𨎌 𨎌|𨎮 𨎮|𨏠 𨏠|𨏥 𨏥|𨞺 𨞺|𨟊 𨟊|𨢿 𨢿|𨣈 𨣈|𨣞 𨣞|𨣧 𨣧|𨤻 𨤰|𨥛 𨥛|𨥟 𨥟|𨦫 䦀|𨧀 𬭊|𨧜 䦁|𨧰 𨧰|𨧱 𨧱|𨨏 𬭛|𨨛 𨨛|𨨢 𨨢|𨩰 𨩰|𨪕 𨪕|𨫒 𨫒|𨬖 𨬖|𨭆 𬭶|𨭎 𬭳|𨭖 𨭖|𨭸 𨭸|𨮂 𨮂|𨮳 𨮳|𨯅 䥿|𨯟 𨯟|𨰃 𨰃|𨰋 𨰋|𨰥 𨰥|𨰲 𨰲|𨲳 𨲳|𨳑 𨳑|𨳕 𨳕|𨴗 𨴗|𨴹 𨴹|𨵩 𨵩|𨵸 𨵸|𨶀 𨶀|𨶏 𨶏|𨶮 𨶮|𨶲 𨶲|𨷲 𨷲|𨼳 𨼳|𨽏 𨽏|𩀨 𩀨|𩅙 𩅙|𩎖 𩎖|𩎢 𩎢|𩏂 𩏂|𩏠 𩏠|𩏪 𩏪|𩏷 𩏷|𩑔 𩑔|𩒎 𩒎|𩓣 𩓣|𩓥 𩓥|𩔑 𩔑|𩔳 𩔳|𩖰 𩖰|𩗀 𩗀|𩗓 𩗓|𩗴 𩗴|𩘀 𩘀|𩘝 𩘝|𩘹 𩘹|𩘺 𩘺|𩙈 𩙈|𩚛 𩚛|𩚥 𩚥|𩚩 𩚩|𩚵 𩚵|𩛆 𩛆|𩛌 𩛌|𩛡 𩛡|𩛩 𩛩|𩜇 𩜇|𩜦 𩜦|𩜵 𩜵|𩝔 𩝔|𩝽 𩝽|𩞄 𩞄|𩞦 𩞦|𩞯 䭪|𩟐 𩟐|𩟗 𩟗|𩠴 𩠠|𩡣 𩡣|𩡺 𩡺|𩢡 𩢡|𩢴 𩢴|𩢸 𩢸|𩢾 𩢾|𩣏 𩣏|𩣑 䯃|𩣫 𩣫|𩣵 𩣵|𩣺 𩣺|𩤊 𩤊|𩤙 𩤙|𩤲 𩤲|𩤸 𩤸|𩥄 𩥄|𩥇 𩥇|𩥉 𩥉|𩥑 𩥑|𩦠 𩦠|𩧆 𩧆|𩭙 𩭙|𩯁 𩯁|𩯳 𩯳|𩰀 𩰀|𩰹 𩰹|𩳤 𩳤|𩴵 𩴵|𩵦 𩵦|𩵩 𩵩|𩵹 𩵹|𩶁 𩶁|𩶘 䲞|𩶰 𩶰|𩶱 𩶱|𩷰 𩷰|𩸃 𩸃|𩸄 𩸄|𩸡 𩸡|𩸦 𩸦|𩻗 𩻗|𩻬 𩻬|𩻮 𩻮|𩼶 𩼶|𩽇 𩽇|𩿅 𩿅|𩿤 𩿤|𩿪 𩿪|𪀖 𪀖|𪀦 𪀦|𪀾 𪀾|𪁈 𪁈|𪁖 𪁖|𪂆 𪂆|𪃍 𪃍|𪃏 𪃏|𪃒 𪃒|𪃧 𪃧|𪄆 𪄆|𪄕 𪄕|𪅂 𪅂|𪆷 𪆷|𪇳 𪇳|𪈼 𪈼|𪉸 𪉸|𪋿 𪋿|𪌭 𪌭|𪍠 𪍠|𪓰 𪓰|𪔵 𪔵|𪘀 𪘀|𪘯 𪘯|𪙏 𪙏|𪟖 𪟖|𪷓 𪷓|𫒡 𫒡|𫜦 𫜦|𰻞 𰻝",A="豈 豈|更 更|車 車|賈 賈|滑 滑|串 串|句 句|龜 龜|龜 龜|契 契|金 金|喇 喇|奈 奈|懶 懶|癩 癩|羅 羅|蘿 蘿|螺 螺|裸 裸|邏 邏|樂 樂|洛 洛|烙 烙|珞 珞|落 落|酪 酪|駱 駱|亂 亂|卵 卵|欄 欄|爛 爛|蘭 蘭|鸞 鸞|嵐 嵐|濫 濫|藍 藍|襤 襤|拉 拉|臘 臘|蠟 蠟|廊 廊|朗 朗|浪 浪|狼 狼|郎 郎|來 來|冷 冷|勞 勞|擄 擄|櫓 櫓|爐 爐|盧 盧|老 老|蘆 蘆|虜 虜|路 路|露 露|魯 魯|鷺 鷺|碌 碌|祿 祿|綠 綠|菉 菉|錄 錄|鹿 鹿|論 論|壟 壟|弄 弄|籠 籠|聾 聾|牢 牢|磊 磊|賂 賂|雷 雷|壘 壘|屢 屢|樓 樓|淚 淚|漏 漏|累 累|縷 縷|陋 陋|勒 勒|肋 肋|凜 凜|凌 凌|稜 稜|綾 綾|菱 菱|陵 陵|讀 讀|拏 拏|樂 樂|諾 諾|丹 丹|寧 寧|怒 怒|率 率|異 異|北 北|磻 磻|便 便|復 復|不 不|泌 泌|數 數|索 索|參 參|塞 塞|省 省|葉 葉|說 說|殺 殺|辰 辰|沈 沈|拾 拾|若 若|掠 掠|略 略|亮 亮|兩 兩|凉 凉|梁 梁|糧 糧|良 良|諒 諒|量 量|勵 勵|呂 呂|女 女|廬 廬|旅 旅|濾 濾|礪 礪|閭 閭|驪 驪|麗 麗|黎 黎|力 力|曆 曆|歷 歷|轢 轢|年 年|憐 憐|戀 戀|撚 撚|漣 漣|煉 煉|璉 璉|秊 秊|練 練|聯 聯|輦 輦|蓮 蓮|連 連|鍊 鍊|列 列|劣 劣|咽 咽|烈 烈|裂 裂|說 說|廉 廉|念 念|捻 捻|殮 殮|簾 簾|獵 獵|令 令|囹 囹|寧 寧|嶺 嶺|怜 怜|玲 玲|瑩 瑩|羚 羚|聆 聆|鈴 鈴|零 零|靈 靈|領 領|例 例|禮 禮|醴 醴|隸 隸|惡 惡|了 了|僚 僚|寮 寮|尿 尿|料 料|樂 樂|燎 燎|療 療|蓼 蓼|遼 遼|龍 龍|暈 暈|阮 阮|劉 劉|杻 杻|柳 柳|流 流|溜 溜|琉 琉|留 留|硫 硫|紐 紐|類 類|六 六|戮 戮|陸 陸|倫 倫|崙 崙|淪 淪|輪 輪|律 律|慄 慄|栗 栗|率 率|隆 隆|利 利|吏 吏|履 履|易 易|李 李|梨 梨|泥 泥|理 理|痢 痢|罹 罹|裏 裏|裡 裡|里 里|離 離|匿 匿|溺 溺|吝 吝|燐 燐|璘 璘|藺 藺|隣 隣|鱗 鱗|麟 麟|林 林|淋 淋|臨 臨|立 立|笠 笠|粒 粒|狀 狀|炙 炙|識 識|什 什|茶 茶|刺 刺|切 切|度 度|拓 拓|糖 糖|宅 宅|洞 洞|暴 暴|輻 輻|行 行|降 降|見 見|廓 廓|兀 兀|嗀 嗀|塚 塚|晴 晴|凞 凞|猪 猪|益 益|礼 礼|神 神|祥 祥|福 福|靖 靖|精 精|羽 羽|蘒 蘒|諸 諸|逸 逸|都 都|飯 飯|飼 飼|館 館|鶴 鶴|郞 郞|隷 隷|侮 侮|僧 僧|免 免|勉 勉|勤 勤|卑 卑|喝 喝|嘆 嘆|器 器|塀 塀|墨 墨|層 層|屮 屮|悔 悔|慨 慨|憎 憎|懲 懲|敏 敏|既 既|暑 暑|梅 梅|海 海|渚 渚|漢 漢|煮 煮|爫 爫|琢 琢|碑 碑|社 社|祉 祉|祈 祈|祐 祐|祖 祖|祝 祝|禍 禍|禎 禎|穀 穀|突 突|節 節|練 練|縉 縉|繁 繁|署 署|者 者|臭 臭|艹 艹|艹 艹|著 著|褐 褐|視 視|謁 謁|謹 謹|賓 賓|贈 贈|辶 辶|逸 逸|難 難|響 響|頻 頻|恵 恵|𤋮 𤋮|舘 舘|並 並|况 况|全 全|侀 侀|充 充|冀 冀|勇 勇|勺 勺|喝 喝|啕 啕|喙 喙|嗢 嗢|塚 塚|墳 墳|奄 奄|奔 奔|婢 婢|嬨 嬨|廒 廒|廙 廙|彩 彩|徭 徭|惘 惘|慎 慎|愈 愈|憎 憎|慠 慠|懲 懲|戴 戴|揄 揄|搜 搜|摒 摒|敖 敖|晴 晴|朗 朗|望 望|杖 杖|歹 歹|殺 殺|流 流|滛 滛|滋 滋|漢 漢|瀞 瀞|煮 煮|瞧 瞧|爵 爵|犯 犯|猪 猪|瑱 瑱|甆 甆|画 画|瘝 瘝|瘟 瘟|益 益|盛 盛|直 直|睊 睊|着 着|磌 磌|窱 窱|節 節|类 类|絛 絛|練 練|缾 缾|者 者|荒 荒|華 華|蝹 蝹|襁 襁|覆 覆|視 視|調 調|諸 諸|請 請|謁 謁|諾 諾|諭 諭|謹 謹|變 變|贈 贈|輸 輸|遲 遲|醙 醙|鉶 鉶|陼 陼|難 難|靖 靖|韛 韛|響 響|頋 頋|頻 頻|鬒 鬒|龜 龜|𢡊 𢡊|𢡄 𢡄|𣏕 𣏕|㮝 㮝|䀘 䀘|䀹 䀹|𥉉 𥉉|𥳐 𥳐|𧻓 𧻓|齃 齃|龎 龎|丽 丽|丸 丸|乁 乁|𠄢 𠄢|你 你|侮 侮|侻 侻|倂 倂|偺 偺|備 備|僧 僧|像 像|㒞 㒞|𠘺 𠘺|免 免|兔 兔|兤 兤|具 具|𠔜 𠔜|㒹 㒹|內 內|再 再|𠕋 𠕋|冗 冗|冤 冤|仌 仌|冬 冬|况 况|𩇟 𩇟|凵 凵|刃 刃|㓟 㓟|刻 刻|剆 剆|割 割|剷 剷|㔕 㔕|勇 勇|勉 勉|勤 勤|勺 勺|包 包|匆 匆|北 北|卉 卉|卑 卑|博 博|即 即|卽 卽|卿 卿|卿 卿|卿 卿|𠨬 𠨬|灰 灰|及 及|叟 叟|𠭣 𠭣|叫 叫|叱 叱|吆 吆|咞 咞|吸 吸|呈 呈|周 周|咢 咢|哶 哶|唐 唐|啓 啓|啣 啣|善 善|善 善|喙 喙|喫 喫|喳 喳|嗂 嗂|圖 圖|嘆 嘆|圗 圗|噑 噑|噴 噴|切 切|壮 壮|城 城|埴 埴|堍 堍|型 型|堲 堲|報 報|墬 墬|𡓤 𡓤|売 売|壷 壷|夆 夆|多 多|夢 夢|奢 奢|𡚨 𡚨|𡛪 𡛪|姬 姬|娛 娛|娧 娧|姘 姘|婦 婦|㛮 㛮|㛼 㛼|嬈 嬈|嬾 嬾|嬾 嬾|𡧈 𡧈|寃 寃|寘 寘|寧 寧|寳 寳|𡬘 𡬘|寿 寿|将 将|当 当|尢 尢|㞁 㞁|屠 屠|屮 屮|峀 峀|岍 岍|𡷤 𡷤|嵃 嵃|𡷦 𡷦|嵮 嵮|嵫 嵫|嵼 嵼|巡 巡|巢 巢|㠯 㠯|巽 巽|帨 帨|帽 帽|幩 幩|㡢 㡢|𢆃 𢆃|㡼 㡼|庰 庰|庳 庳|庶 庶|廊 廊|𪎒 𪎒|廾 廾|𢌱 𢌱|𢌱 𢌱|舁 舁|弢 弢|弢 弢|㣇 㣇|𣊸 𣊸|𦇚 𦇚|形 形|彫 彫|㣣 㣣|徚 徚|忍 忍|志 志|忹 忹|悁 悁|㤺 㤺|㤜 㤜|悔 悔|𢛔 𢛔|惇 惇|慈 慈|慌 慌|慎 慎|慌 慌|慺 慺|憎 憎|憲 憲|憤 憤|憯 憯|懞 懞|懲 懲|懶 懶|成 成|戛 戛|扝 扝|抱 抱|拔 拔|捐 捐|𢬌 𢬌|挽 挽|拼 拼|捨 捨|掃 掃|揤 揤|𢯱 𢯱|搢 搢|揅 揅|掩 掩|㨮 㨮|摩 摩|摾 摾|撝 撝|摷 摷|㩬 㩬|敏 敏|敬 敬|𣀊 𣀊|旣 旣|書 書|晉 晉|㬙 㬙|暑 暑|㬈 㬈|㫤 㫤|冒 冒|冕 冕|最 最|暜 暜|肭 肭|䏙 䏙|朗 朗|望 望|朡 朡|杞 杞|杓 杓|𣏃 𣏃|㭉 㭉|柺 柺|枅 枅|桒 桒|梅 梅|𣑭 𣑭|梎 梎|栟 栟|椔 椔|㮝 㮝|楂 楂|榣 榣|槪 槪|檨 檨|𣚣 𣚣|櫛 櫛|㰘 㰘|次 次|𣢧 𣢧|歔 歔|㱎 㱎|歲 歲|殟 殟|殺 殺|殻 殻|𣪍 𣪍|𡴋 𡴋|𣫺 𣫺|汎 汎|𣲼 𣲼|沿 沿|泍 泍|汧 汧|洖 洖|派 派|海 海|流 流|浩 浩|浸 浸|涅 涅|𣴞 𣴞|洴 洴|港 港|湮 湮|㴳 㴳|滋 滋|滇 滇|𣻑 𣻑|淹 淹|潮 潮|𣽞 𣽞|𣾎 𣾎|濆 濆|瀹 瀹|瀞 瀞|瀛 瀛|㶖 㶖|灊 灊|災 災|灷 灷|炭 炭|𠔥 𠔥|煅 煅|𤉣 𤉣|熜 熜|𤎫 𤎫|爨 爨|爵 爵|牐 牐|𤘈 𤘈|犀 犀|犕 犕|𤜵 𤜵|𤠔 𤠔|獺 獺|王 王|㺬 㺬|玥 玥|㺸 㺸|㺸 㺸|瑇 瑇|瑜 瑜|瑱 瑱|璅 璅|瓊 瓊|㼛 㼛|甤 甤|𤰶 𤰶|甾 甾|𤲒 𤲒|異 異|𢆟 𢆟|瘐 瘐|𤾡 𤾡|𤾸 𤾸|𥁄 𥁄|㿼 㿼|䀈 䀈|直 直|𥃳 𥃳|𥃲 𥃲|𥄙 𥄙|𥄳 𥄳|眞 眞|真 真|真 真|睊 睊|䀹 䀹|瞋 瞋|䁆 䁆|䂖 䂖|𥐝 𥐝|硎 硎|碌 碌|磌 磌|䃣 䃣|𥘦 𥘦|祖 祖|𥚚 𥚚|𥛅 𥛅|福 福|秫 秫|䄯 䄯|穀 穀|穊 穊|穏 穏|𥥼 𥥼|𥪧 𥪧|𥪧 𥪧|竮 竮|䈂 䈂|𥮫 𥮫|篆 篆|築 築|䈧 䈧|𥲀 𥲀|糒 糒|䊠 䊠|糨 糨|糣 糣|紀 紀|𥾆 𥾆|絣 絣|䌁 䌁|緇 緇|縂 縂|繅 繅|䌴 䌴|𦈨 𦈨|𦉇 𦉇|䍙 䍙|𦋙 𦋙|罺 罺|𦌾 𦌾|羕 羕|翺 翺|者 者|𦓚 𦓚|𦔣 𦔣|聠 聠|𦖨 𦖨|聰 聰|𣍟 𣍟|䏕 䏕|育 育|脃 脃|䐋 䐋|脾 脾|媵 媵|𦞧 𦞧|𦞵 𦞵|𣎓 𣎓|𣎜 𣎜|舁 舁|舄 舄|辞 辞|䑫 䑫|芑 芑|芋 芋|芝 芝|劳 劳|花 花|芳 芳|芽 芽|苦 苦|𦬼 𦬼|若 若|茝 茝|荣 荣|莭 莭|茣 茣|莽 莽|菧 菧|著 著|荓 荓|菊 菊|菌 菌|菜 菜|𦰶 𦰶|𦵫 𦵫|𦳕 𦳕|䔫 䔫|蓱 蓱|蓳 蓳|蔖 蔖|𧏊 𧏊|蕤 蕤|𦼬 𦼬|䕝 䕝|䕡 䕡|𦾱 𦾱|𧃒 𧃒|䕫 䕫|虐 虐|虜 虜|虧 虧|虩 虩|蚩 蚩|蚈 蚈|蜎 蜎|蛢 蛢|蝹 蝹|蜨 蜨|蝫 蝫|螆 螆|䗗 䗗|蟡 蟡|蠁 蠁|䗹 䗹|衠 衠|衣 衣|𧙧 𧙧|裗 裗|裞 裞|䘵 䘵|裺 裺|㒻 㒻|𧢮 𧢮|𧥦 𧥦|䚾 䚾|䛇 䛇|誠 誠|諭 諭|變 變|豕 豕|𧲨 𧲨|貫 貫|賁 賁|贛 贛|起 起|𧼯 𧼯|𠠄 𠠄|跋 跋|趼 趼|跰 跰|𠣞 𠣞|軔 軔|輸 輸|𨗒 𨗒|𨗭 𨗭|邔 邔|郱 郱|鄑 鄑|𨜮 𨜮|鄛 鄛|鈸 鈸|鋗 鋗|鋘 鋘|鉼 鉼|鏹 鏹|鐕 鐕|𨯺 𨯺|開 開|䦕 䦕|閷 閷|𨵷 𨵷|䧦 䧦|雃 雃|嶲 嶲|霣 霣|𩅅 𩅅|𩈚 𩈚|䩮 䩮|䩶 䩶|韠 韠|𩐊 𩐊|䪲 䪲|𩒖 𩒖|頋 頋|頋 頋|頩 頩|𩖶 𩖶|飢 飢|䬳 䬳|餩 餩|馧 馧|駂 駂|駾 駾|䯎 䯎|𩬰 𩬰|鬒 鬒|鱀 鱀|鳽 鳽|䳎 䳎|䳭 䳭|鵧 鵧|𪃎 𪃎|䳸 䳸|𪄅 𪄅|𪈎 𪈎|𪊑 𪊑|麻 麻|䵖 䵖|黹 黹|黾 黾|鼅 鼅|鼏 鼏|鼖 鼖|鼻 鼻|𪘀 𪘀";const C={hk:[[f,g]],hkp:[[d,f,g]],tw:[[p,h]],twp:[[y,p,h]],jp:[["一獲千金 一攫千金|丁寧 叮嚀|丁重 鄭重|三差路 三叉路|世論 輿論|予備 預備|予告 預告|予定 預定|予感 預感|予測 預測|予算 預算|予約 預約|予習 預習|予言 預言|予防 預防|亜鈴 啞鈴|交差 交叉|代弁 代辯|供宴 饗宴|俊馬 駿馬|保塁 堡壘|個条書 箇条書|偏平 扁平|停泊 碇泊|優俊 優駿|先兵 尖兵|先端 尖端|先鋭 尖銳|共役 共軛|冗舌 饒舌|凶器 兇器|削岩 鑿岩|包丁 庖丁|包帯 繃帶|区画 區劃|厳然 儼然|友宜 友誼|反乱 叛亂|収集 蒐集|叙情 抒情|台頭 擡頭|合弁 合辦|喜遊曲 嬉遊曲|嘆願 歎願|回転 廻転|回遊 回游|国際連盟 國際聯盟|奉持 捧持|委縮 萎縮|安全弁 安全瓣|展転 輾轉|希少 稀少|幻惑 眩惑|広範 廣泛|広野 曠野|廃虚 廢墟|建坪率 建蔽率|弁別 辨別|弁当 辨當|弁才 辯才|弁明 辯明|弁膜 瓣膜|弁解 辯解|弁証 辯證|弁論 辯論|弁論家 辯論家|弁護 辯護|弁護士 辯護士|弁財天 辯財天|弁駁 辯駁|弁髪 辮髮|弦歌 絃歌|恩義 恩誼|意向 意嚮|慰謝料 慰藉料|憶断 臆斷|憶病 臆病|戦没 戰歿|扇情 煽情|手帳 手帖|技量 伎倆|抜粋 抜萃|披歴 披瀝|抵触 牴觸|抽選 抽籤|拘引 勾引|拠出 醵出|拠金 醵金|掘削 掘鑿|控除 扣除|援護 掩護|放棄 抛棄|散水 撒水|敬謙 敬虔|敷延 敷衍|断固 斷乎|族生 簇生|昇叙 陞敘|暖房 煖房|暗唱 暗誦|暗夜 闇夜|暴露 曝露|枯渇 涸渴|格好 恰好|格幅 恰幅|棄損 毀損|模索 摸索|橋頭保 橋頭堡|欠缺 欠缺|欧州 歐洲|欧州連合 歐洲聯盟|死体 屍體|殿部 臀部|母指 拇指|気迫 氣魄|決別 訣別|決壊 決潰|沈殿 沈澱|油送船 油槽船|波乱 波瀾|注釈 註釋|洗浄 洗滌|活発 活潑|浸透 滲透|浸食 浸蝕|消却 銷卻|混然 渾然|湾曲 彎曲|溶接 熔接|漁労 漁撈|漂然 飄然|激高 激昂|火炎 火焰|焦燥 焦躁|猶予 猶豫|班点 斑點|留飲 溜飲|略奪 掠奪|疎通 疏通|発酵 醱酵|白亜 白堊|相克 相剋|知恵 智慧|破棄 破毀|確固 確乎|禁固 禁錮|符丁 符牒|粉装 扮裝|紫班 紫斑|終息 終熄|総合 綜合|編集 編輯|義援 義捐|耕運機 耕耘機|肝心 肝腎|肩甲骨 肩胛骨|背徳 悖德|脈拍 脈搏|膨張 膨脹|花弁 花瓣|芳純 芳醇|英知 叡智|蒸留 蒸溜|薫蒸 燻蒸|薫製 燻製|衣装 衣裳|衰退 衰退|裕然 悠然|補佐 輔佐|訓戒 訓誡|試練 試煉|詭弁 詭辯|講和 媾和|象眼 象嵌|貫録 貫祿|買弁 買辦|賛辞 讚辭|踏襲 蹈襲|車両 車輛|転倒 顛倒|輪郭 輪廓|退色 褪色|途絶 杜絕|連係 連繫|連合 聯合|連合会 聯合會|連合国 聯合國|連合艦隊 聯合艦隊|連合軍 聯合軍|連名 聯名|連想 聯想|連携 聯攜|連盟 聯盟|連立 聯立|連結 聯結|連結器 聯結器|連結性 聯結性|連絡 聯絡|連絡員 聯絡員|連絡網 聯絡網|連絡線 聯絡線|連絡船 聯絡船|連邦 聯邦|連邦共和国 聯邦共和國|連邦制 聯邦制|連邦国 聯邦國|連邦国家 聯邦國家|連邦政府 聯邦政府|連邦議会 聯邦議會|連邦軍 聯邦軍|連隊 聯隊|選考 銓衡|酢酸 醋酸|野卑 野鄙|鉱石 礦石|間欠 間歇|関数 函數|関連 關聯|関連図 關聯圖|関連性 關聯性|関連語 關聯語|防御 防禦|険阻 嶮岨|障壁 牆壁|障害 障礙|隠滅 湮滅|雄弁 雄辯|集落 聚落|雇用 僱傭|風諭 諷喩|飛語 蜚語|香典 香奠|骨格 骨骼|高進 亢進|鳥観 鳥瞰","万 萬|与 與|両 兩|並 竝|乗 乘|乱 亂|亀 龜|予 豫|争 爭|亘 亙|亜 亞|仏 佛|仮 假|会 會|伝 傳|体 體|余 餘|併 倂|価 價|倹 儉|偽 僞|児 兒|党 黨|円 圓|写 寫|凜 凛|処 處|剣 劍|剤 劑|剰 剩|励 勵|労 勞|効 效|勅 敕|勧 勸|勲 勳|区 區|医 醫|単 單|即 卽|厳 嚴|参 參|双 雙|収 收|叙 敍|台 臺|号 號|唖 啞|営 營|嘱 囑|噛 嚙|団 團|囲 圍|図 圖|国 國|圏 圈|圧 壓|堕 墮|塁 壘|塩 鹽|増 增|壊 壞|壌 壤|壮 壯|声 聲|壱 壹|売 賣|変 變|奥 奧|奨 奬|嬢 孃|学 學|宝 寶|実 實|寛 寬|寝 寢|対 對|寿 壽|専 專|将 將|尭 堯|尽 盡|届 屆|属 屬|岳 嶽|峡 峽|巌 巖|巣 巢|巻 卷|帯 帶|帰 歸|庁 廳|広 廣|廃 廢|弁 辨|弐 貳|弥 彌|弯 彎|弾 彈|当 當|径 徑|従 從|徳 德|徴 徵|応 應|恋 戀|恒 恆|恵 惠|悩 惱|悪 惡|惨 慘|慎 愼|懐 懷|戦 戰|戯 戲|戻 戾|払 拂|抜 拔|択 擇|担 擔|拝 拜|拠 據|拡 擴|挙 擧|挟 挾|挿 插|捜 搜|掲 揭|掻 搔|揺 搖|摂 攝|撃 擊|撹 攪|数 數|斉 齊|斎 齋|断 斷|旧 舊|昼 晝|晃 晄|晩 晚|暁 曉|暦 曆|曽 曾|条 條|来 來|枢 樞|栄 榮|桜 櫻|桝 枡|桟 棧|桧 檜|検 檢|楼 樓|楽 樂|概 槪|様 樣|槙 槇|権 權|横 橫|欠 缺|欧 歐|歓 歡|歩 步|歯 齒|歳 歲|歴 歷|残 殘|殴 毆|殻 殼|毎 每|気 氣|沢 澤|沪 濾|浄 淨|浅 淺|浜 濱|涙 淚|渇 渴|済 濟|渉 涉|渋 澁|渓 溪|温 溫|湾 灣|湿 濕|満 滿|滝 瀧|滞 滯|潜 潛|瀬 瀨|灯 燈|炉 爐|点 點|為 爲|焼 燒|犠 犧|状 狀|独 獨|狭 狹|猟 獵|献 獻|獣 獸|瓶 甁|画 畫|畳 疊|痩 瘦|痴 癡|発 發|盗 盜|県 縣|真 眞|研 硏|砕 碎|礼 禮|祢 禰|祷 禱|禄 祿|禅 禪|秘 祕|称 稱|稲 稻|穂 穗|穏 穩|穣 穰|窃 竊|竜 龍|粋 粹|粛 肅|糸 絲|経 經|絵 繪|継 繼|続 續|総 總|緑 綠|緒 緖|縁 緣|縄 繩|縦 縱|繊 纖|繍 繡|缶 罐|翻 飜|聴 聽|胆 膽|脚 腳|脱 脫|脳 腦|臓 臟|艶 艷|芦 蘆|芸 藝|茎 莖|荘 莊|萌 萠|蒋 蔣|蔵 藏|薫 薰|薬 藥|虚 虛|虫 蟲|蚕 蠶|蛍 螢|蛮 蠻|蝋 蠟|衛 衞|装 裝|褒 襃|覇 霸|覚 覺|覧 覽|観 觀|触 觸|訳 譯|証 證|誉 譽|説 說|読 讀|謡 謠|譲 讓|豊 豐|賛 贊|践 踐|転 轉|軽 輕|辞 辭|辺 邊|逓 遞|遅 遲|遥 遙|郎 郞|郷 鄕|酔 醉|醤 醬|醸 釀|釈 釋|鉄 鐵|鉱 鑛|銭 錢|鋳 鑄|錬 鍊|録 錄|鎮 鎭|関 關|閲 閱|闘 鬭|陥 陷|険 險|随 隨|隠 隱|雑 雜|霊 靈|静 靜|頴 穎|頼 賴|顔 顏|顕 顯|餅 餠|駅 驛|駆 驅|騒 騷|験 驗|髄 髓|髪 髮|鴎 鷗|鶏 鷄|鹸 鹼|麦 麥|麹 麴|麺 麵|黄 黃|黒 黑|黙 默|齢 齡"]]},E={cn:[[v,m]]},N={hk2s:{normalizationChain:[[A]],segmentation:[v],conversionChain:[[f,g],[v,m]]},hk2sp:{normalizationChain:[[A]],segmentation:[v],conversionChain:[[d,f,g],[v,m]]},t2s:{normalizationChain:[[A]],conversionChain:[[v,m]]},tw2s:{normalizationChain:[[A]],segmentation:[v],conversionChain:[[p,h],[v,m]]},tw2sp:{normalizationChain:[[A]],segmentation:[v],conversionChain:[[y,p,h],[v,m]]}};var T=Object.freeze({__proto__:null,configs:N,from:C,to:E});const b=(w=T,function(n){if(["from","to"].forEach(e=>{if(!n||"string"!=typeof n[e])throw new Error("Please provide the `"+e+"` option");if("t"!==n[e]&&!w[e][n[e]])throw new Error("Unknown `"+e+"` locale: "+n[e])}),w.configs){const o=w.configs[t=n.from,r=n.to,"cn"===t?`s2${r}`:"cn"===r?"hkp"===t?"hk2sp":"twp"===t?"tw2sp":`${t}2s`:`${t}2${r}`];if(o){const n=function(n,...t){let r=null;n&&(r=new e,Array.isArray(n)&&n.every(n=>"string"==typeof n)?r.loadDictGroup(n):r.loadDict(n));const o=t.map(n=>{const t=new e;return t.loadDictGroup(n),t});return function(n){const e=r?r.segment(n):[n];return o.reduce((n,e)=>n.map(n=>e.convert(n)),e).join("")}}(o.segmentation,...o.conversionChain);if(!o.normalizationChain)return n;const t=i(...o.normalizationChain);return function(e){return n(t(e))}}}var t,r;let o=[];return["from","to"].forEach(e=>{var t;"t"!==n[e]&&o.push(...(t=w[e][n[e]],Array.isArray(t)&&Array.isArray(t[0])?t:[t]))}),i.apply(null,o)});var w;const L={Trie:e,ConverterFactory:i,Converter:b,CustomConverter:s,HTMLConverter:u,Locale:T};n.Converter=b,n.ConverterFactory=i,n.CustomConverter=s,n.HTMLConverter=u,n.Locale=T,n.Trie=e,n.default=L,Object.defineProperty(n,"__esModule",{value:!0})});

return module.exports.Converter({from:"t",to:"cn"}); }; uiLocale.convert = (text) => (openccConvert ||= buildOpencc())(text); }
// ---- 03-locale-ui.js
// 簡體模式下，建立元素時直接轉換文字，不再替每個元素多包一層元件。
// 語言切換由各掛載點的根元件訂閱一次（useUiLanguage），整棵樹跟著重繪。
const uiConvertCache = new Map()
function uiConvert(value) {
  if (value.length > 200) return uiLocale.convert(value)
  let out = uiConvertCache.get(value)
  if (out === undefined) {
    out = uiLocale.convert(value)
    if (uiConvertCache.size >= 4000) uiConvertCache.clear()
    uiConvertCache.set(value, out)
  }
  return out
}
const uiTranslate = (value) =>
  typeof value === 'string' ? uiConvert(value) : Array.isArray(value) ? value.map(uiTranslate) : value
const UI_VERBATIM_TAGS = new Set(['style', 'script', 'textarea', 'pre', 'code'])
const UI_TEXT_PROPS = ['title', 'placeholder', 'aria-label', 'alt']
const uiCreateElement = (tag, props, ...content) => {
  if (
    typeof tag !== 'string' ||
    uiLocale.get() !== 'zh-Hans' ||
    props?.['data-ui-verbatim'] ||
    UI_VERBATIM_TAGS.has(tag) ||
    /(?:dpl-log|dpl-hist-text)/.test(props?.className || '')
  )
    return UiReact.createElement(tag, props, ...content)
  let next = props
  for (const key of UI_TEXT_PROPS)
    if (typeof props?.[key] === 'string') {
      if (next === props) next = { ...props }
      next[key] = uiConvert(props[key])
    }
  return UiReact.createElement(tag, next, ...content.map(uiTranslate))
}
const useUiLanguage = () => UiReact.useSyncExternalStore(uiLocale.subscribe, uiLocale.get, uiLocale.get)
const React = { ...UiReact, createElement: uiCreateElement }
function UiLanguagePicker() {
  const language = UiReact.useSyncExternalStore(uiLocale.subscribe, uiLocale.get, uiLocale.get)
  return UiReact.createElement(
    'label',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontSize: 12,
      },
    },
    '文 / A',
    UiReact.createElement(
      'select',
      {
        'aria-label': '介面語言 / 界面语言',
        value: language,
        onChange: (event) => uiLocale.set(event.target.value),
        style: {
          font: 'inherit',
          color: 'inherit',
          background: 'var(--dpl-bg,var(--dsw-alias-bg-layer-3,Canvas))',
          border: '1px solid #8887',
          borderRadius: 8,
          padding: '6px 8px',
          maxWidth: '100%',
        },
      },
      UiReact.createElement('option', { value: 'zh-Hant' }, '繁體中文'),
      UiReact.createElement('option', { value: 'zh-Hans' }, '简体中文'),
    ),
  )
}

// Chevron comes from core UI primitives; local SVG is a fallback for
// builds without the package. Icon always points down; open state rotates.
// ---- 04-core.js
let ChevronIcon = null
try {
  const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
  ChevronIcon = primitives && primitives.IconChevronDownOutline14
} catch (noPrimitives) {
  ChevronIcon = null
}
const NS = 'dsh-sound-atelier'
// Plugins page row seat: key = '<package name>#<row id>', row id as cordis.patch.yml declares it.
const PKG = 'dsh-sound-atelier'
const ROW_ID = 'dsh-sound-atelier'
const ROW_CONFIG_KEY = PKG + '#' + ROW_ID
const PROVIDERS = [
  'local-tts',
  'kokoro',
  'f5',
  'fish',
  'cartesia',
  'dashscope',
  'polly',
  'inworld',
  'google-cloud',
  'voai',
  'openai',
  'elevenlabs',
  'google',
  'azure',
  'groq',
  'deepgram',
  'openrouter',
  'siliconflow',
  'deepinfra',
  'fireworks',
  'mimo',
  'doubao',
  'deepseek-web',
  'custom',
  'edge',
  'piper',
  'espeak',
  'minimax',
  'cosyvoice',
]
const CLOUD = {
  'local-tts': 1,
  fish: 1,
  cartesia: 1,
  dashscope: 1,
  polly: 1,
  inworld: 1,
  'google-cloud': 1,
  voai: 1,
  minimax: 1,
  openai: 1,
  elevenlabs: 1,
  google: 1,
  azure: 1,
  groq: 1,
  deepgram: 1,
  openrouter: 1,
  siliconflow: 1,
  deepinfra: 1,
  fireworks: 1,
  mimo: 1,
  doubao: 1,
  'deepseek-web': 1,
  custom: 1,
}
// Official sources checked 2026-11-12. A valid key alone does not grant model access.
const KEY_GUIDES = {
  fish: 'https://docs.fish.audio/developer-guide/getting-started/quickstart',
  cartesia: 'https://docs.cartesia.ai/api-reference/tts/bytes',
  dashscope: 'https://help.aliyun.com/zh/model-studio/qwen-audio-tts-http-api',
  polly: 'https://docs.aws.amazon.com/service-authorization/latest/reference/list_polly.html',
  inworld: 'https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/list-voices',
  'google-cloud': 'https://docs.cloud.google.com/text-to-speech/docs/authentication',
  elevenlabs: 'https://elevenlabs.io/docs/api-reference/authentication',
  openai: 'https://developers.openai.com/api/docs/guides/rbac',
  google: 'https://ai.google.dev/gemini-api/docs/api-key',
  azure: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions',
  groq: 'https://console.groq.com/docs/model-permissions',
  deepgram: 'https://developers.deepgram.com/guides/deep-dives/working-with-roles',
  openrouter: 'https://openrouter.ai/docs/guides/features/guardrails',
  siliconflow: 'https://docs.siliconflow.cn/docs/userguide/capabilities/text-to-speech',
  deepinfra: 'https://docs.deepinfra.com/account/authentication',
  minimax: 'https://platform.minimax.io/docs/guides/quickstart-preparation',
  mimo: 'https://mimo.mi.com/docs/en-US/quick-start/error-codes',
  doubao: 'https://docs.volcengine.com/docs/doubao-voice/console-guidance?lang=zh',
  voai: 'https://connect.voai.ai/docs/index.html',
  fireworks: 'https://docs.fireworks.ai/accounts/service-accounts',
  'deepseek-web': 'https://github.com/GooDAnDReaDY/dsh-tts',
}
const providerLabel = (t, provider) =>
  ({
    'local-tts': '本機 TTS 服務（Xinference / GPT-SoVITS）',
    kokoro: 'Kokoro（本機 CPU，英文）',
    f5: 'F5-TTS（本機 Xinference）',
    fish: 'Fish Audio',
    cartesia: 'Cartesia',
    dashscope: 'DashScope',
    polly: 'Amazon Polly',
    inworld: 'Inworld AI',
    'google-cloud': 'Google Cloud TTS',
  })[provider] ||
  (provider === 'custom'
    ? t('providerCustomOpenAI')
    : provider === 'deepseek-web'
      ? t('providerDeepSeekWeb')
      : provider)
const credentialLabel = (provider) =>
  ({
    polly: 'catalogAwsCredential',
    'google-cloud': 'catalogGoogleCredential',
    inworld: 'catalogInworldCredential',
    'deepseek-web': 'catalogWebToken',
  })[provider] || 'catalogKey'
// Hints stay generic: concrete provider model IDs rot quickly.
const MODEL_HINT = {
  openai: 'provider default',
  elevenlabs: 'provider default',
  google: 'provider default',
  azure: 'region voice name',
  groq: 'provider default',
  deepgram: 'provider default (English-only voices)',
  openrouter: 'provider/model id',
  siliconflow: 'model id (e.g. FunAudioLLM/CosyVoice2-0.5B)',
  deepinfra: 'model id (e.g. hexgrad/Kokoro-82M)',
  fireworks: 'model id (e.g. kokoro)',
  mimo: 'model id (e.g. mimo-v2.5-tts)',
  doubao: 'seed-tts-2.0 / seed-tts-1.0',
  'deepseek-web': 'web audio model (e.g. deepseek-chat)',
  custom: 'custom model',
  minimax: 'model id',
  cosyvoice: 'model id (e.g. CosyVoice2-0.5B)',
  edge: 'BCP-47 voice, e.g. en-US-AriaNeural',
  piper: 'path to .onnx',
  espeak: 'language code, e.g. en',
  kokoro: '獨立 CPU 推理；請先在聲音管理準備環境',
  f5: '使用 Xinference；需要參考錄音與逐字稿',
}

function clientFetch(url, options) {
  const opts = options || {}
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 15000
  const controller = new AbortController()
  let timer = null
  let parentCleanup = null

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (parentCleanup) {
      parentCleanup()
      parentCleanup = null
    }
  }

  timer = setTimeout(() => {
    try {
      controller.abort()
    } catch {
      /* already aborted */
    }
  }, timeoutMs)
  if (timer && typeof timer.unref === 'function') timer.unref()

  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort()
    } else {
      const onAbort = () => {
        try {
          controller.abort()
        } catch {
          /* already aborted */
        }
      }
      opts.signal.addEventListener('abort', onAbort, { once: true })
      parentCleanup = () => {
        try {
          opts.signal.removeEventListener('abort', onAbort)
        } catch {
          /* listener already removed */
        }
      }
    }
  }

  const fetchOpts = Object.assign({}, opts, { signal: controller.signal })
  delete fetchOpts.timeoutMs

  return fetch(url, fetchOpts).then(
    (res) => {
      if (!res.body || res.bodyUsed) {
        cleanup()
        return res
      }
      const wrap = (orig) => {
        if (typeof orig !== 'function') return orig
        return function (...args) {
          return orig.apply(res, args).finally(cleanup)
        }
      }
      res.json = wrap(res.json)
      res.text = wrap(res.text)
      res.blob = wrap(res.blob)
      res.arrayBuffer = wrap(res.arrayBuffer)
      return res
    },
    (err) => {
      cleanup()
      throw err
    },
  )
}

function getModelHint(provider, t) {
  if (typeof t === 'function') {
    const loc = t('modelHint_' + provider)
    if (loc && !loc.startsWith('modelHint_')) return loc
  }
  return MODEL_HINT[provider] || ''
}

function createErrorBoundary() {
  if (!React || typeof React.Component !== 'function') {
    return function NoopBoundary(props) {
      return (props && props.children) || null
    }
  }
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error }
    }
    componentDidCatch(error, errorInfo) {
      console.error('[dsh-tts] React Error:', error, errorInfo)
    }
    render() {
      if (this.state.hasError) {
        return React.createElement(
          'div',
          {
            className: 'dts-alert dts-alert-err',
            style: { margin: '12px 0', padding: '14px', borderRadius: '8px' },
          },
          React.createElement(
            'div',
            { style: { fontWeight: 600, marginBottom: '6px' } },
            typeof fallbackDockText === 'function' ? fallbackDockText('ttsUiError') : '⚠️ TTS UI Error:',
          ),
          React.createElement(
            'div',
            { style: { fontSize: '12px', wordBreak: 'break-all' } },
            String((this.state.error && this.state.error.message) || this.state.error),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              style: { marginTop: '10px', fontSize: '12px', padding: '4px 10px' },
              onClick: () => this.setState({ hasError: false, error: null }),
            },
            typeof fallbackDockText === 'function' ? fallbackDockText('retry') : 'Retry',
          ),
        )
      }
      return (this.props && this.props.children) || null
    }
  }
}
const ErrorBoundary = createErrorBoundary()
const SNAPSHOT_READY = Object.freeze({ status: 'ready', value: {} })
const SNAPSHOT_LOADING = Object.freeze({ status: 'loading', value: {} })
// 內建音色包：每個風格各有台灣（zh-TW）與大陸（zh-CN）的免金鑰 Edge 中文音色。
const VOICE_PACK_REGIONS = [
  ['zh-TW', '台灣（zh-TW）'],
  ['zh-CN', '大陸（zh-CN）'],
]
const VOICE_PACKS = [
  {
    id: 'narrator',
    name: 'Narrator',
    nameZh: '專業旁白',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-YunJheNeural', 'zh-CN': 'zh-CN-YunyangNeural' },
    rate: 1.0,
    chime: 'ding',
  },
  {
    id: 'buddy',
    name: 'Energetic Buddy',
    nameZh: '活力搭檔',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoYuNeural', 'zh-CN': 'zh-CN-XiaoyiNeural' },
    rate: 1.1,
    chime: 'pop',
  },
  {
    id: 'calm',
    name: 'Calm Lecturer',
    nameZh: '沉穩導師',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoChenNeural', 'zh-CN': 'zh-CN-XiaoxiaoNeural' },
    rate: 0.95,
    chime: 'subtle',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Terminal',
    nameZh: '賽博終端',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-YunJheNeural', 'zh-CN': 'zh-CN-YunjianNeural' },
    rate: 1.15,
    chime: 'ding',
  },
  {
    id: 'whisper',
    name: 'Quiet / Night Mode',
    nameZh: '溫和夜讀',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoChenNeural', 'zh-CN': 'zh-CN-YunxiNeural' },
    rate: 0.9,
    chime: 'none',
  },
]
// ---- 05-styles.js
// 樣式內容在 styles.css，建置時嵌入為 SET_CSS 常數。
const setCssId = 'dsh-tts/settings.module.css'
if (typeof document !== 'undefined' && !document.querySelector('style[data-dsh-plugin="dsh-tts"]')) {
  const tag = document.createElement('style')
  tag.textContent = SET_CSS
  tag.setAttribute('data-dsh-plugin', 'dsh-tts')
  tag.dataset.pluginCss = setCssId
  document.head.appendChild(tag)
}
// Player.
//
// Each incoming chunk used to replace the previous one immediately; while reading
// For full replies this was invisible; with speak-as-it-goes only the last
// chunk would be heard. Now items queue: the next starts after the previous ends.
// ---- 10-player.js
const autoplay = { blocked: false, listeners: new Set() }
function setAutoplayBlocked(next) {
  if (autoplay.blocked === next) return
  autoplay.blocked = next
  for (const l of [...autoplay.listeners]) {
    try {
      l()
    } catch {
      /* listener isolation */
    }
  }
}

let clearGestureListeners = null
function removeGestureListeners() {
  if (typeof clearGestureListeners === 'function') {
    clearGestureListeners()
    clearGestureListeners = null
  }
}

function unlockAudio() {
  removeGestureListeners()
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) {
      const ctx = new AC()
      if (ctx.state === 'suspended')
        ctx.resume().catch(() => {
          /* audio context unlock failure ignored */
        })
      setTimeout(() => {
        try {
          ctx.close()
        } catch {
          /* closed */
        }
      }, 300)
    }
  } catch {
    /* no AudioContext */
  }
  setAutoplayBlocked(false)
  player.blocked = false
  playerChanged()
  drainQueue()
  // Anything the host synthesised while the browser was blocking playback is
  // still queued server-side; pull it once the gesture opened the gate.
  try {
    pollPending()
  } catch {
    /* host not ready yet */
  }
}
function useAutoplayGate() {
  const [, force] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    autoplay.listeners.add(force)
    return () => {
      autoplay.listeners.delete(force)
    }
  }, [])
  return autoplay
}
let wakeLockSentinel = null
async function acquireWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null
      })
    }
  } catch (_e) {
    /* wake lock unavailable */
  }
}
async function releaseWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release()
      wakeLockSentinel = null
    }
  } catch (_e) {}
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && player.busy && !player.paused) acquireWakeLock()
  })
}

let activeKaraokeEl = null
function updateKaraokeHighlight(item) {
  clearKaraokeHighlight()
  if (!item || !item.text || typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return
  try {
    const text = String(item.text).trim()
    if (!text) return
    const steps = document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i]
      if (step.textContent && step.textContent.includes(text)) {
        step.classList.add('dts-karaoke-active')
        activeKaraokeEl = step
        break
      }
    }
  } catch (_err) {}
}
function clearKaraokeHighlight() {
  try {
    if (activeKaraokeEl) {
      activeKaraokeEl.classList.remove('dts-karaoke-active')
      activeKaraokeEl = null
    }
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      for (const el of document.querySelectorAll('.dts-karaoke-active')) el.classList.remove('dts-karaoke-active')
    }
  } catch (_err) {}
}

const player = {
  audio: null,
  after: '',
  enabled: false,
  rate: 1,
  duckOnTyping: 'duck',
  isDucked: false,
  chime: 'ding',
  queue: [],
  bargeIn: true,
  busy: false,
  paused: false,
  blocked: false,
  listeners: new Set(),
  unlockAudio,
  useAutoplayGate,
  get autoplayBlocked() {
    return autoplay.blocked
  },
}
const clientId =
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()
let sessionGeneration = 0,
  playbackGeneration = 0,
  requestController = null,
  streamCleanup = null
let pendingStopPromise = Promise.resolve()
const ignoredJobs = new Set(),
  jobTexts = new Map()
const noticeDecisions = new Map()
function queueAutomatic(item) {
  if (item.noticePolicy) {
    const key = item.noticeId || item.id
    if (!noticeDecisions.has(key)) {
      const accepted = item.noticePolicy !== 'idle-only' || !isSpeakingNow()
      noticeDecisions.set(key, accepted)
      if (noticeDecisions.size > 128) noticeDecisions.delete(noticeDecisions.keys().next().value)
      if (accepted && item.noticePolicy === 'interrupt') {
        for (const id of item.cancelledJobs || []) ignoredJobs.add(id)
        stopPlayback(false)
      }
    }
    if (!noticeDecisions.get(key)) return
  } else if (statusKnown && !player.enabled) return
  if (item.text) recent.add(item.text)
  player.queue.push({ ...item, source: item.noticePolicy ? 'notice' : 'auto' })
}
const ownershipChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('dsh-tts/playback') : null
let yieldUntil = 0,
  leaseUntil = 0
if (ownershipChannel)
  ownershipChannel.onmessage = (event) => {
    const data = event.data
    if (data?.sessionId !== player.sessionId || data.clientId === clientId || data.type !== 'takeover') return
    stopPlayback(false)
    if (requestController) requestController.abort()
    player.owner = false
    yieldUntil = Date.now() + 5000
    if (streamCleanup) {
      streamCleanup()
      streamCleanup = null
    }
  }
function scopeQuery(sid = player.sessionId) {
  return 'sessionId=' + encodeURIComponent(sid || '') + '&clientId=' + encodeURIComponent(clientId)
}
function reportPlaybackError(error) {
  player.error = String(error?.message || error)
  playerChanged()
}
function useSessionIdentity(props) {
  const snap = typeof props?.useSession === 'function' ? props.useSession((s) => s) : null
  return props?.sessionId || snap?.sessionId || props?.session?.id || null
}
function releaseSession(sid) {
  if (!sid) return
  clientFetch('/dsh-sound-atelier/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'release', sessionId: sid, clientId }),
    keepalive: true,
  }).catch(() => {})
}
function bindSession(sid) {
  if ((sid || null) === (player.sessionId || null)) return
  stopPlayback()
  releaseSession(player.sessionId)
  if (streamCleanup) {
    streamCleanup()
    streamCleanup = null
  }
  player.sessionId = sid || null
  player.after = ''
  player.lastJob = null
  player.lastItem = null
  player.lastText = ''
  player.owner = false
  player.baseline = true
  sessionGeneration++
  refreshStatusSoon()
  seenIds.clear()
  ignoredJobs.clear()
  jobTexts.clear()
  if (sid) pollPending()
  playerChanged()
}
function rememberJob(item) {
  if (!item.jobId) {
    player.lastJob = null
    return
  }
  player.lastJob = { jobId: item.jobId, sessionId: item.sessionId || player.sessionId || '' }
  const id = item.jobId
  if (!jobTexts.has(id)) {
    jobTexts.set(id, item.text || '')
    if (jobTexts.size > 64) jobTexts.delete(jobTexts.keys().next().value)
    clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(id) + '&' + scopeQuery(item.sessionId))
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          if (player.lastJob?.jobId === id)
            player.segmentTotal = Math.max(player.segmentTotal || 0, d.totalSegments || 0)
          jobTexts.set(id, d.text)
          if (player.lastJob?.jobId === id) {
            player.lastText = d.text
            playerChanged()
          }
        }
      })
      .catch(() => {})
  }
  player.lastText = jobTexts.get(id) || item.text || ''
}
function acceptsItem(item) {
  return !!(
    !archivedSessions.has(item?.sessionId) &&
    player.owner &&
    !player.stopping &&
    item?.sessionId === player.sessionId &&
    (!item.clientId || item.clientId === clientId) &&
    !ignoredJobs.has(item.jobId) &&
    !item.cancelled
  )
}
const archivedSessions = new Set()
const seenIds = new Set()
// Reply <div data-turn-tail> the current playback belongs to. Set when the
// per-message speaker starts a clip; null for auto-speech, where the newest
// reply hosts the transport instead.
let activeTailEl = null
// False until /dsh-tts/status answers: before that the `enabled` default is
// not a real reading, so stream items must not be discarded.
let statusKnown = false
let currentAudioResolve = null
function playerChanged() {
  playerSeen = playerSignature()
  for (const listener of [...player.listeners]) {
    try {
      listener()
    } catch (listenerFailure) {
      /* foreign listener failure is not ours */
    }
  }
}
// 畫面會用到的播放狀態。每則回覆都掛一個訂閱，所以定時檢查只比對這個字串，
// 有變化才重繪；沒有播放時不會造成任何重繪。
function playerSignature() {
  const audio = player.audio
  return [
    audio ? 1 : 0,
    audio ? Math.round((Number(audio.currentTime) || 0) * 5) : 0,
    audio ? Number(audio.duration) || 0 : 0,
    audio ? Number(audio.playbackRate) || 1 : 1,
    player.busy ? 1 : 0,
    player.paused ? 1 : 0,
    player.blocked ? 1 : 0,
    player.enabled ? 1 : 0,
    player.owner ? 1 : 0,
    player.awaitingSpeech ? 1 : 0,
    player.queue.length,
    player.segmentIndex || 0,
    player.segmentTotal || 0,
    player.playbackMode || '',
    player.error || '',
    player.lastText || '',
  ].join('|')
}
let playerSeen = '',
  playerTicker = null
function usePlayer() {
  const [, force] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    player.listeners.add(force)
    if (!playerTicker) {
      playerSeen = playerSignature()
      // 所有訂閱共用一個計時器，補上沒有明確通知的狀態改變（例如 HTMLAudio 的播放進度）。
      playerTicker = setInterval(() => {
        if (playerSignature() !== playerSeen) playerChanged()
      }, 250)
    }
    return () => {
      player.listeners.delete(force)
      if (!player.listeners.size && playerTicker) {
        clearInterval(playerTicker)
        playerTicker = null
      }
    }
  }, [])
  return player
}
// Short chime is synthesized in-browser: no file to download, store, or configure.
function playChime(kind) {
  return new Promise((resolve) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) {
        resolve()
        return
      }
      // 先判斷再建立：瀏覽器限制同時存在的 AudioContext 數量，建立後不關閉會累積。
      if (kind === 'none') {
        resolve()
        return
      }
      const audioCtx = new AC()
      const gain = audioCtx.createGain()
      gain.connect(audioCtx.destination)
      // [頻率清單, 音量峰值, 每個音的長度（秒）]
      const CHIMES = {
        ding: [[660, 990], 0.25, 0.2],
        beep: [[880, 880], 0.25, 0.2],
        pop: [[520], 0.3, 0.09],
        subtle: [[440, 554], 0.1, 0.16],
      }
      const [tones, peak, length] = CHIMES[kind] || CHIMES.ding
      let at = audioCtx.currentTime
      for (const freq of tones) {
        const osc = audioCtx.createOscillator()
        osc.frequency.value = freq
        osc.connect(gain)
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(peak, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length - 0.02)
        osc.start(at)
        osc.stop(at + length)
        at += length + 0.02
      }
      setTimeout(() => {
        try {
          audioCtx.close()
        } catch (already) {
          /* already closed */
        }
        resolve()
      }, 600)
    } catch {
      resolve() /* no AudioContext */
    }
  })
}
// Provider failed — fall back to the browser voice. Worse quality, but silence
// is worse: the user would not know the reply is ready.
function speakInBrowser(text, item) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis || !text) {
        resolve()
        return
      }
      const utterance = new SpeechSynthesisUtterance(String(text))
      utterance.rate = Math.max(0.5, Math.min(2, (item && item.rate) || player.rate || 1))
      utterance.volume = typeof item?.volume === 'number' ? Math.max(0, Math.min(1, item.volume)) : 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    } catch {
      resolve() /* no speechSynthesis */
    }
  })
}
function prepareAudioItem(item) {
  if (!item || !item.audioBase64 || item.prepared) return item
  try {
    const bin = atob(item.audioBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: item.mime || 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.preload = 'auto'
    item.prepared = { audio, url }
  } catch {
    /* decode error — item stays unprepared */
  }
  return item
}
function prebufferNext() {
  for (const next of player.queue) {
    if (next && next.audioBase64 && !next.prepared) {
      prepareAudioItem(next)
      break
    }
  }
}
function playAudio(item) {
  return new Promise((resolve) => {
    try {
      prepareAudioItem(item)
      if (!item.prepared) return resolve()
      const { audio, url } = item.prepared
      audio.playbackRate = Math.max(0.5, Math.min(2, (item && item.rate) || player.rate || 1))
      audio.preservesPitch = true
      audio.volume = typeof item?.volume === 'number' ? Math.max(0, Math.min(1, item.volume)) : 1
      player.audio = audio
      player.segmentIndex = item.sentenceIndex || 0
      player.segmentTotal = item.totalSentences || 1
      player.playbackMode = 'HTMLAudio'
      acquireWakeLock()
      updateKaraokeHighlight(item)
      if (item.audioBase64 && item.kind !== 'chime') {
        // Keep the last clip in memory so replay is instant (no round trip).
        player.lastItem = {
          jobId: item.jobId,
          sessionId: item.sessionId,
          rate: item.rate,
          volume: item.volume,
          text: item.text || '',
          mime: item.mime || 'audio/mpeg',
          audioBase64: item.audioBase64,
        }
      }
      if (item.text) player.lastText = item.text
      rememberJob(item)
      playerChanged()
      prebufferNext()
      let doneCalled = false
      const done = (reason = 'cancelled') => {
        if (doneCalled) return
        doneCalled = true
        currentAudioResolve = null
        audio.onended = null
        audio.onerror = null
        if (reason !== 'ended') {
          try {
            audio.pause()
          } catch {
            /* already paused */
          }
        }
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* URL already revoked */
        }
        clearKaraokeHighlight()
        if (player.queue.length === 0) releaseWakeLock()
        item.prepared = null
        player.audio = null
        playerChanged()
        resolve()
      }
      currentAudioResolve = done
      audio.onended = () => done('ended')
      audio.onerror = () => {
        reportPlaybackError(Error('音訊無法解碼或播放。'))
        done('error')
      }
      audio.play().catch((playErr) => {
        if (doneCalled) return
        // Autoplay without a user gesture is blocked — retain queue and surface unlock UX (#160)
        if (playErr && (playErr.name === 'NotAllowedError' || playErr.name === 'SecurityError')) {
          player.blocked = true
          setAutoplayBlocked(true)
          player.queue.unshift(item)
          audio.onended = null
          audio.onerror = null
          currentAudioResolve = null
          player.audio = null
          player.busy = false
          playerChanged()
          if (typeof window !== 'undefined') {
            removeGestureListeners()
            const onUserGesture = () => {
              removeGestureListeners()
              unlockAudio()
            }
            window.addEventListener('click', onUserGesture, { once: true })
            window.addEventListener('keydown', onUserGesture, { once: true })
            window.addEventListener('touchstart', onUserGesture, { once: true })
            clearGestureListeners = () => {
              window.removeEventListener('click', onUserGesture)
              window.removeEventListener('keydown', onUserGesture)
              window.removeEventListener('touchstart', onUserGesture)
            }
          }
          resolve()
          return
        }
        done()
      })
    } catch {
      /* cannot decode — skip chunk */
      currentAudioResolve = null
      resolve()
    }
  })
}

// Sample-clock scheduling for successive decoded chunks of one message.
// Buffer underflow is reported; no silence is inserted or tail trimmed.
async function playGapless(first) {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC || !first.jobId) return false
  const generation = playbackGeneration,
    context = new AC(),
    gain = context.createGain()
  gain.connect(context.destination)
  let ended = false,
    pumping = false,
    finish,
    scheduled = [],
    timeline = [],
    nextAt = context.currentTime + 0.04,
    position = 0,
    rate = 1,
    volume = 1,
    ticker
  const complete = new Promise((r) => (finish = r)),
    valid = () => generation === playbackGeneration && !ended
  const total = () => timeline.reduce((s, r) => s + r.buffer.duration, 0)
  const current = () => {
    const now = context.currentTime,
      r = scheduled.find((s) => now >= s.at && now < s.end)
    return r ? Math.min(total(), r.offset + (now - r.at) * r.rate) : position
  }
  const clearSources = () => {
    for (const r of scheduled) {
      r.source.onended = null
      try {
        r.source.stop()
      } catch {}
    }
    scheduled = []
  }
  const stop = () => {
    if (ended) return
    ended = true
    clearInterval(ticker)
    clearSources()
    context.close().catch(() => {})
    if (player.audio === control) player.audio = null
    clearKaraokeHighlight()
    currentAudioResolve = null
    finish()
  }
  function schedule(row, offset = 0) {
    const source = context.createBufferSource()
    source.buffer = row.buffer
    source.playbackRate.value = rate
    source.connect(gain)
    const at = Math.max(nextAt, context.currentTime + 0.015),
      span = (row.buffer.duration - offset) / rate,
      record = { source, at, end: at + span, offset: row.offset + offset, rate, row }
    source.onended = () => {
      if (!valid()) return
      position = row.offset + row.buffer.duration
      scheduled = scheduled.filter((s) => s !== record)
      void pump()
    }
    source.start(at, offset)
    nextAt = record.end
    scheduled.push(record)
  }
  function rebuild(at) {
    clearSources()
    position = Math.max(0, Math.min(total(), at))
    nextAt = context.currentTime + 0.02
    for (const r of timeline) {
      if (r.offset + r.buffer.duration > position) schedule(r, Math.max(0, position - r.offset))
    }
  }
  const control = {
    get currentTime() {
      return current()
    },
    set currentTime(v) {
      if (Number.isFinite(v)) rebuild(v)
    },
    get duration() {
      return total()
    },
    get paused() {
      return context.state === 'suspended'
    },
    get playbackRate() {
      return rate
    },
    set playbackRate(v) {
      const at = current()
      rate = Math.max(0.5, Math.min(2, Number(v) || 1))
      rebuild(at)
    },
    get volume() {
      return volume
    },
    set volume(v) {
      volume = Math.max(0, Math.min(1, Number(v) || 0))
      gain.gain.value = volume
    },
    pause() {
      return context.suspend()
    },
    play() {
      return context.resume()
    },
    skip() {
      const at = current(),
        row = timeline.find((r) => at < r.offset + r.buffer.duration)
      if (row) rebuild(row.offset + row.buffer.duration)
    },
    gapless: true,
  }
  const add = async (item) => {
    const binary = atob(item.audioBase64),
      data = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      buffer = await context.decodeAudioData(data.buffer)
    if (!valid()) return
    const row = { item, buffer, offset: total() }
    timeline.push(row)
    schedule(row)
    player.lastItem = { ...item, prepared: undefined }
    rememberJob(item)
    player.lastText = item.text || player.lastText
    if (item.prepared?.url) {
      URL.revokeObjectURL(item.prepared.url)
      item.prepared = null
    }
  }
  let progressNotifiedAt = 0
  async function pump() {
    if (pumping || !valid()) return
    pumping = true
    try {
      while (valid() && scheduled.length < 3) {
        const item = player.queue[0]
        if (
          !item?.audioBase64 ||
          item.jobId !== first.jobId ||
          item.sessionId !== first.sessionId ||
          item.kind === 'chime'
        )
          break
        player.queue.shift()
        await add(item)
      }
      const at = current(),
        row = timeline.find((r) => at >= r.offset && at < r.offset + r.buffer.duration)
      let segmentChanged = false
      if (row && player.segmentIndex !== row.item.sentenceIndex) {
        segmentChanged = true
        player.segmentIndex = row.item.sentenceIndex
        player.segmentTotal = Math.max(player.segmentTotal || 0, row.item.totalSentences || 0, timeline.length)
        updateKaraokeHighlight(row.item)
      }
      player.progress = at
      player.duration = total()
      player.playbackMode = 'WebAudio'
      // 排程每 25 毫秒檢查一次，但畫面進度每 200 毫秒通知一次就夠；段落切換立即通知。
      if (segmentChanged || Date.now() - progressNotifiedAt >= 200) {
        progressNotifiedAt = Date.now()
        playerChanged()
      }
      if (!scheduled.length) {
        const waiting = player.awaitingSpeech || player.queue[0]?.kind === 'reserved'
        if (waiting) {
          player.playbackMode = 'buffering'
          return
        }
        stop()
      }
    } catch (e) {
      reportPlaybackError(e)
      stop()
    } finally {
      pumping = false
    }
  }
  try {
    await context.resume()
    if (!valid()) {
      await context.close()
      return true
    }
    if (context.state !== 'running') {
      await context.close()
      return false
    }
    rate = Math.max(0.5, Math.min(2, first.rate || player.rate || 1))
    volume = typeof first.volume === 'number' ? Math.max(0, Math.min(1, first.volume)) : 1
    gain.gain.value = volume
    player.segmentTotal = first.totalSentences || 0
    player.audio = control
    currentAudioResolve = stop
    acquireWakeLock()
    await add(first)
    ticker = setInterval(() => void pump(), 25)
    await pump()
    await complete
    return true
  } catch {
    stop()
    return timeline.length > 0 || generation !== playbackGeneration
  }
}

async function drainQueue() {
  if (player.busy || player.blocked || player.paused) return
  const generation = playbackGeneration
  player.busy = true
  playerChanged()
  try {
    while (generation === playbackGeneration && player.queue.length && !player.blocked && !player.paused) {
      const item = player.queue.shift()
      if (!item || item.kind === 'reserved') continue
      player.playbackSource = item.source || (item.kind ? 'auto' : 'manual')
      if (item.kind === 'chime') {
        await playChime(item.chime || player.chime)
        continue
      }
      if (item.audioBase64) {
        if (!(await playGapless(item))) await playAudio(item)
      } else if (item.error && item.text) {
        reportPlaybackError(Error(item.error))
        await speakInBrowser(item.text, item)
      }
    }
  } finally {
    player.busy = false
    playerChanged()
    if (player.queue.length && !player.blocked && !player.paused) drainQueue()
  }
}

function stopPlayback(cancel = true) {
  playbackGeneration++
  if (cancel) {
    if (requestController) {
      requestController.abort()
      requestController = null
    }
    const jobs = [player.lastJob, ...player.queue].filter((item) => item?.jobId)
    for (const job of jobs) {
      ignoredJobs.add(job.jobId)
      clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId), {
        method: 'DELETE',
      }).catch(() => {})
    }
    if (ignoredJobs.size > 128) ignoredJobs.delete(ignoredJobs.values().next().value)
    if (player.owner && player.sessionId) {
      player.stopping = true
      const task = clientFetch('/dsh-sound-atelier/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', sessionId: player.sessionId, clientId }),
      })
        .then((r) => r.json())
        .then((d) => {
          for (const id of d.ignoredJobs || []) ignoredJobs.add(id)
        })
        .catch(() => {})
        .finally(() => {
          if (pendingStopPromise === task) player.stopping = false
        })
      pendingStopPromise = task
    }
  }
  player.awaitingSpeech = false
  player.playbackSource = null
  clearKaraokeHighlight()
  releaseWakeLock()
  activeTailEl = null
  removeGestureListeners()
  player.blocked = false
  setAutoplayBlocked(false)
  for (const item of player.queue) {
    if (item && item.prepared && item.prepared.url) {
      try {
        URL.revokeObjectURL(item.prepared.url)
      } catch {
        /* already revoked */
      }
      item.prepared = null
    }
  }
  player.queue.length = 0
  player.paused = false
  if (player.audio) {
    try {
      player.audio.pause()
      player.audio.currentTime = 0
    } catch {
      /* already paused */
    }
  }
  if (currentAudioResolve) {
    currentAudioResolve()
  }
  player.audio = null
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  } catch {
    /* no speechSynthesis */
  }
  playerChanged()
}
function togglePause() {
  player.paused = !player.paused
  if (player.audio) {
    try {
      player.paused ? player.audio.pause() : player.audio.play()
    } catch (already) {
      /* ignore play/pause failure */
    }
  }
  if (!player.paused) drainQueue()
  playerChanged()
}
function skipCurrent() {
  if (player.audio?.gapless) {
    player.audio.skip()
    return
  }
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  } catch (_err) {
    /* no speechSynthesis */
  }
  if (player.audio) {
    try {
      player.audio.pause()
      player.audio.currentTime = 0
    } catch (_err) {
      /* ignore pause error */
    }
  }
  if (currentAudioResolve) {
    currentAudioResolve()
  } else {
    player.audio = null
    player.busy = false
    playerChanged()
    if (player.queue.length) drainQueue()
  }
}

// User started talking — stop playback.
//
// The event may come from a voice-input plugin, but there is no hard dependency:
// without that plugin the event simply never fires. We listen on window on purpose.
function listenForVoice() {
  if (typeof window === 'undefined') return () => {}
  const onSpeaking = (event) => {
    const phase = event && event.detail && event.detail.phase
    if (phase !== 'start') return
    if (!player.bargeIn || player.vadBargeIn === false) return
    stopPlayback()
  }
  window.addEventListener('dsh-voice:speaking', onSpeaking)
  return () => window.removeEventListener('dsh-voice:speaking', onSpeaking)
}
// Unified SSE Realtime Stream Connection (#158, #206)
let activeSse = null
let activeSseAttempt = 0
let activeSseTimer = null
let activeSseWatchdog = null
let sseDisposed = false
const SSE_IDLE_TIMEOUT_MS = 30000

function startSseStream() {
  if (!player.sessionId || !player.owner || typeof window === 'undefined' || typeof window.EventSource === 'undefined')
    return () => {}
  sseDisposed = false

  const resetWatchdog = () => {
    if (activeSseWatchdog) clearTimeout(activeSseWatchdog)
    if (sseDisposed) return
    activeSseWatchdog = setTimeout(() => {
      if (activeSse && !sseDisposed) {
        try {
          if (typeof activeSse.onerror === 'function') {
            activeSse.onerror(new Event('error'))
          } else {
            activeSse.close()
          }
        } catch (_err) {
          /* error trigger ignore */
        }
      }
    }, SSE_IDLE_TIMEOUT_MS)
  }

  const onItem = (e) => {
    resetWatchdog()
    try {
      const item = JSON.parse(e.data)
      if (!item || !item.id || !acceptsItem(item)) return
      if (statusKnown && player.enabled === false && !item.noticePolicy) return
      player.after = item.id
      if (seenIds.has(item.id)) return
      seenIds.add(item.id)
      if (seenIds.size > 500) {
        const first = seenIds.values().next().value
        seenIds.delete(first)
      }
      queueAutomatic(item)
      drainQueue()
    } catch {
      /* ignore malformed SSE */
    }
  }
  const onChime = (e) => {
    resetWatchdog()
    try {
      const item = JSON.parse(e.data)
      if (!item || !acceptsItem(item) || seenIds.has(item.id)) return
      seenIds.add(item.id)
      if (statusKnown && player.enabled === false && !item.noticePolicy) return
      queueAutomatic(item)
      drainQueue()
    } catch (_err) {
      /* ignore malformed chime payload */
    }
  }
  const connect = () => {
    if (sseDisposed) return
    if (activeSseWatchdog) {
      clearTimeout(activeSseWatchdog)
      activeSseWatchdog = null
    }
    if (activeSse) {
      try {
        activeSse.close()
      } catch (_err) {
        /* active sse already closed */
      }
      activeSse = null
    }
    try {
      const es = new EventSource('/dsh-sound-atelier/stream?' + scopeQuery())
      activeSse = es
      es.onopen = () => {
        activeSseAttempt = 0
        resetWatchdog()
      }
      es.onmessage = () => {
        resetWatchdog()
      }
      es.addEventListener('utterance', onItem)
      es.addEventListener('chime', onChime)
      es.onerror = () => {
        if (activeSseWatchdog) {
          clearTimeout(activeSseWatchdog)
          activeSseWatchdog = null
        }
        if (activeSse === es) {
          try {
            es.close()
          } catch (_err) {
            /* eventsource already closed */
          }
          activeSse = null
        }
        if (sseDisposed) return
        activeSseAttempt++
        const delay = Math.min(10000, 500 * Math.pow(2, Math.min(activeSseAttempt, 5)))
        if (activeSseTimer) clearTimeout(activeSseTimer)
        activeSseTimer = setTimeout(connect, delay)
      }
      resetWatchdog()
    } catch {
      /* EventSource failed */
    }
  }
  connect()

  return () => {
    sseDisposed = true
    if (activeSseTimer) {
      clearTimeout(activeSseTimer)
      activeSseTimer = null
    }
    if (activeSseWatchdog) {
      clearTimeout(activeSseWatchdog)
      activeSseWatchdog = null
    }
    if (activeSse) {
      try {
        activeSse.close()
      } catch (_err) {
        /* active sse already closed on dispose */
      }
      activeSse = null
    }
  }
}
let polling = false
const STATUS_REFRESH_MS = 5000
let statusFetchedAt = 0
// 設定剛改過（儲存、切換自動朗讀、換會話）時呼叫，下一次輪詢立即重讀偏好值。
function refreshStatusSoon() {
  statusFetchedAt = 0
}
async function pollPending() {
  if (polling) return
  polling = true
  const generation = sessionGeneration,
    sid = player.sessionId
  try {
    // 偏好值幾秒同步一次即可；每秒需要的只有下面的 /pending（播放權租約與新片段）。
    if (!statusKnown || Date.now() - statusFetchedAt >= STATUS_REFRESH_MS) {
      const st = await clientFetch('/dsh-sound-atelier/status', { cache: 'no-store', timeoutMs: 8000 })
      if (!st.ok || generation !== sessionGeneration) return
      const meta = await st.json()
      if (generation !== sessionGeneration) return
      statusFetchedAt = Date.now()
      const previousEnabled = player.enabled
      player.enabled = !!meta?.speakReplies
      player.notificationsEnabled = !!meta?.announceApproval
      statusKnown = true
      if (previousEnabled !== player.enabled) playerChanged()
      for (const key of ['rate', 'duckOnTyping', 'chime', 'roles', 'bargeIn', 'vadBargeIn'])
        if (meta[key] !== undefined) player[key] = meta[key]
    }
    if (!sid || archivedSessions.has(sid) || Date.now() < yieldUntil) return
    const res = await clientFetch(
      '/dsh-sound-atelier/pending?' + scopeQuery(sid) + '&after=' + encodeURIComponent(player.after || ''),
      { cache: 'no-store', timeoutMs: 8000 },
    )
    const data = await res.json()
    if (generation !== sessionGeneration) return
    if (!data.owner) {
      if (player.owner) {
        stopPlayback(false)
        if (requestController) requestController.abort()
        if (streamCleanup) {
          streamCleanup()
          streamCleanup = null
        }
      }
      player.owner = false
      return
    }
    const gained = !player.owner
    player.owner = true
    leaseUntil = Date.now() + 4000
    const items = Array.isArray(data.items) ? data.items : []
    player.awaitingSpeech =
      player.enabled &&
      (!!data.preparing || items.some((item) => item.kind === 'reserved' && !ignoredJobs.has(item.jobId)))
    if (player.baseline || gained) {
      // Opening a chat or taking over an expired lease never replays its history.
      for (const item of items) {
        seenIds.add(item.id)
        player.after = item.id
      }
      player.baseline = false
    } else {
      for (const item of items) {
        if (item.kind === 'reserved') break
        player.after = item.id
        if (!acceptsItem(item) || seenIds.has(item.id)) continue
        seenIds.add(item.id)
        if (seenIds.size > 1000) seenIds.delete(seenIds.values().next().value)
        queueAutomatic(item)
      }
    }
    if (!streamCleanup && (player.enabled || player.notificationsEnabled)) streamCleanup = startSseStream()
    if (!player.enabled) {
      // Auto-read preferences never cancel an explicit preview or replay.
      const automatic = player.queue.filter((item) => item.source === 'auto')
      player.queue = player.queue.filter((item) => item.source !== 'auto')
      for (const item of automatic) {
        if (item.prepared?.url) URL.revokeObjectURL(item.prepared.url)
        if (item.jobId)
          clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(item.jobId) + '&' + scopeQuery(item.sessionId), {
            method: 'DELETE',
          }).catch(() => {})
      }
      if (player.playbackSource === 'auto') {
        const notices = player.queue.filter((i) => i.source === 'notice'),
          job = player.lastJob
        if (job?.jobId) {
          ignoredJobs.add(job.jobId)
          clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId), {
            method: 'DELETE',
          }).catch(() => {})
        }
        stopPlayback(false)
        player.queue.push(...notices)
      }
    }
    if (player.queue.length) drainQueue()
  } catch {
    /* host restarting */
  } finally {
    polling = false
  }
}
// Recent utterances: last reply texts and favorites (localStorage).
function recentStore() {
  const KEY = 'dsh-tts/recent'
  let st
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    st = JSON.parse(raw) || { items: [], favs: [] }
  } catch (broken) {
    st = { items: [], favs: [] }
  }
  const persist = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(st))
    } catch (full) {
      /* private mode / quota */
    }
  }
  return {
    add(text) {
      if (!text || text.length < 2) return
      st.items = [text, ...st.items.filter((x) => x !== text)].slice(0, 30)
      persist()
    },
    toggleFav(text) {
      st.favs = st.favs.includes(text) ? st.favs.filter((x) => x !== text) : [text, ...st.favs].slice(0, 20)
      persist()
    },
    list() {
      return { items: st.items, favs: st.favs }
    },
  }
}
const recent = recentStore()

// Unified playback through the shared player controller (#159)
function playAudioItem(item) {
  stopPlayback(false)
  player.queue.push({ ...item, source: 'manual' })
  drainQueue()
}
async function claimPlayback(sid, signal) {
  if (!sid) return
  const r = await clientFetch('/dsh-sound-atelier/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'claim', takeover: true, sessionId: sid, clientId }),
    signal,
  })
  const d = await r.json()
  if (!d.owner) throw Error('無法取得此會話的播放權。')
  signal?.throwIfAborted()
  ownershipChannel?.postMessage({ type: 'takeover', sessionId: sid, clientId })
  yieldUntil = 0
  player.owner = true
  leaseUntil = Date.now() + 4000
}
async function requestSpeech(text, overrides = {}, sid = player.sessionId) {
  if (archivedSessions.has(sid)) throw Error('此會話已歸檔，請先還原會話再朗讀。')
  stopPlayback()
  player.error = ''
  if (sid && sid !== player.sessionId) bindSession(sid)
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  try {
    await pendingStopPromise
    controller.signal.throwIfAborted()
    await claimPlayback(sid, controller.signal)
    const r = await clientFetch('/dsh-sound-atelier/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel: 'web', sessionId: sid || '', clientId, ...overrides }),
      signal: controller.signal,
      timeoutMs: 600000,
    })
    const d = await r.json()
    if (generation !== playbackGeneration || controller.signal.aborted) return null
    if (!d.ok) throw Error(d.error?.message || 'Speech synthesis failed')
    player.owner = true
    return { ...d, id: d.jobId, text: d.text || text }
  } finally {
    if (requestController === controller) requestController = null
  }
}
function playStandalone(text) {
  if (!text) return
  requestSpeech(text)
    .then((item) => {
      if (item) playAudioItem(item)
    })
    .catch((e) => {
      if (e.name !== 'AbortError') reportPlaybackError(e)
    })
}
async function retainedAudio(job) {
  const r = await clientFetch(
    '/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId) + '&audio=1',
    { timeoutMs: 600000 },
  )
  const d = await r.json()
  if (!d.ok) throw Error(d.error?.message || '完整語音尚未完成或已過期，請重新朗讀。')
  return { ...d, id: d.jobId }
}
function replayRetained(source, tailEl = null) {
  if (archivedSessions.has(source.sessionId || player.sessionId)) {
    reportPlaybackError(Error('此會話已歸檔，請先還原會話再重播。'))
    return
  }
  stopPlayback(false)
  if (requestController) requestController.abort()
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  claimPlayback(source.sessionId || player.sessionId, controller.signal)
    .then(() => (source.jobId ? retainedAudio(source) : source))
    .then((item) => {
      if (generation === playbackGeneration && !controller.signal.aborted) {
        playAudioItem(item)
        activeTailEl = tailEl
      }
    })
    .catch((e) => {
      if (e.name !== 'AbortError') reportPlaybackError(e)
    })
    .finally(() => {
      if (requestController === controller) requestController = null
    })
}
function replayLast() {
  if (player.lastJob) {
    replayRetained(player.lastJob)
    return true
  }
  if (player.lastItem?.audioBase64) {
    replayRetained({ ...player.lastItem })
    return true
  }
  if (player.lastText) {
    playStandalone(player.lastText)
    return true
  }
  return false
}

function isSpeakingNow() {
  return !!player.audio || player.busy || player.queue.length > 0 || player.awaitingSpeech
}

function previewSpeech(provider, model, voice, text, tuning) {
  stopPlayback()
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  return clientFetch('/dsh-sound-atelier/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, voice, text, tuning }),
    signal: controller.signal,
    timeoutMs: 65000,
  })
    .then((r) => r.json())
    .then((d) => {
      if (generation !== playbackGeneration || controller.signal.aborted) return
      if (!d || !d.ok) throw new Error((d && d.error && d.error.message) || 'HTTP error')
      return claimPlayback(player.sessionId, controller.signal).then(() => {
        if (generation !== playbackGeneration || controller.signal.aborted) return
        playAudioItem({
          id: `preview-${Date.now()}`,
          rate: d.rate,
          volume: d.volume,
          text: d.text || text,
          mime: d.mime || 'audio/mpeg',
          audioBase64: d.audioBase64,
        })
      })
    })
    .finally(() => {
      if (requestController === controller) requestController = null
    })
}

player.playAudioItem = playAudioItem
player.previewSpeech = previewSpeech
player.startSseStream = startSseStream
player.skipCurrent = skipCurrent
async function exportAudioClip() {
  try {
    const item = player.lastJob ? await retainedAudio(player.lastJob) : player.lastItem
    if (!item?.audioBase64) throw Error('沒有可匯出的完整語音，請先完成朗讀。')
    const bin = atob(item.audioBase64),
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const mime = item.mime || 'audio/mpeg'
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    const extension = mime.includes('wav')
      ? '.wav'
      : mime.includes('flac')
        ? '.flac'
        : mime.includes('ogg') || mime.includes('opus')
          ? '.ogg'
          : mime.includes('mp4')
            ? '.m4a'
            : mime.includes('aac')
              ? '.aac'
              : mime.includes('pcm')
                ? '.pcm'
                : '.mp3'
    a.download = 'dsh-tts-' + Date.now() + extension
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    reportPlaybackError(e)
  }
}
function credOf(map, provider) {
  return (map && map[provider]) || { configured: false, writable: true, ref: '' }
}
// ---- 16-i18n-zh.js
const zh = {
  ttsUiError: '⚠️ TTS 介面錯誤：',
  modelHint_openai: '服務商預設',
  modelHint_elevenlabs: '服務商預設',
  modelHint_google: '服務商預設',
  modelHint_azure: '區域語音名稱',
  modelHint_groq: '服務商預設',
  modelHint_deepgram: '服務商預設 (僅英語語音)',
  modelHint_openrouter: '服務商/模型 ID',
  modelHint_siliconflow: '模型 ID (如 FunAudioLLM/CosyVoice2-0.5B)',
  modelHint_deepinfra: '模型 ID (如 hexgrad/Kokoro-82M)',
  modelHint_fireworks: '模型 ID (如 kokoro)',
  modelHint_mimo: '模型 ID (如 mimo-v2.5-tts)',
  modelHint_custom: '自定義模型',
  modelHint_minimax: '模型 ID',
  modelHint_edge: 'BCP-47 語音名稱，如 en-US-AriaNeural',
  modelHint_piper: '.onnx 模型檔案路徑',
  modelHint_espeak: '語言程式碼，如 en',
  modelHint_kokoro: '獨立 CPU 推理；請先在聲音管理準備環境',
  modelHint_f5: '使用 Xinference；需要參考錄音與逐字稿',
  dockLabel: '語音朗讀',
  dockPause: '暫停朗讀',
  dockResume: '繼續朗讀',
  dockStop: '停止朗讀',
  dockCurrent: '當前朗讀',
  dockNone: '等待語音',
  dockQueue: '佇列',
  dockClearQueue: '清空佇列',
  dockReplay: '重新朗讀',
  dockFavorite: '收藏',
  dockUnfavorite: '取消收藏',
  dockFavorites: '收藏語音',
  speakMessage: '朗讀這條回覆',
  speakMessageStop: '停止朗讀這條回覆',
  speakMessageEmpty: '這條回覆沒有可朗讀的內容',
  exportAudio: '匯出語音片段',
  exportSuccess: '音訊已匯出',
  statusOnline: '服務線上',
  recent: '最近朗讀',
  recentEmpty: '暫無朗讀記錄',
  retry: '重試',
  advancedCollapsed: '高階設定',
  confirmClearCache: '確定清除語音合成快取嗎？此操作無法撤銷。',
  confirmDeleteModel: '確定刪除該引擎已下載的模型權重嗎？',
  autoplayBlocked: '聲音已受系統限制，請點選任意位置以啟用音訊',
  enableSound: '開啟聲音',
  runtimeNotBundled: '未捆綁神經推理執行時',
  runtimeNotBundledHint: '僅下載權重無法直接合成。建議使用 Edge、Piper 或 eSpeak 進行離線語音合成。',
  testProvider: '測試服務商',
  breakerOpen: '熔斷中',
  lastError: '最近錯誤',
  activeProvider: '當前服務商',
  queueLen: '佇列長度',
  sseState: 'SSE狀態',
  currentVoice: '發音人',
  statusOffline: '服務不可達',
  cacheStats: '快取統計',
  general: '常規設定',
  loading: '載入中…',
  chainHintCard: '選擇服務商，貼上 API Key 並儲存。金鑰將直接寫入服務端安全憑證庫，前端不會回顯。',
  speakRepliesHint: '啟用後，智慧體回覆將在服務端合成語音並在當前瀏覽器中播放。音訊不會回傳至模型。',
  chainHint: '從上到下為降級候選順序。雲端金鑰直接儲存在服務端憑證中心，絕不存入插件公開設定中。',
  entryAdvanced: '此降級候選的獨立設定',
  entryAdvancedHint:
    '留空沿用全域設定。音色／模型查詢使用已儲存的全域連線；另一端點請手動填入 ID。憑證欄填既有安全憑證的名稱。',
  entryEndpoint: '獨立 API 端點',
  entryCredential: '既有安全憑證名稱',
  entryOptions: '此候選的合成參數（JSON 物件）',
  title: '語音朗讀 (TTS)',
  speakReplies: '朗讀智慧體回覆',
  speakAsItGoes: '流式逐句朗讀',
  speakAsItGoesHint: '模型輸出時按句子即時流式朗讀，無需等待整段內容生成完畢。',
  rate: '播放語速',
  rateHint: '0.5 到 2.0 倍速。服務端按標準速度合成，由瀏覽器調整播放速率。',
  bargeIn: '打斷靜音 (Barge-in)',
  bargeInHint: '當麥克風開啟或檢測到說話時立即中斷朗讀。',
  duckOnTyping: '打字輸入時避讓',
  duckOnTypingHint: '當你在聊天框輸入文字時自動調整朗讀聲音。',
  duckOnTypingDuck: '壓低音量 (Duck)',
  duckOnTypingPause: '暫停朗讀',
  duckOnTypingStop: '完全停止',
  duckOnTypingOff: '不作調整 (繼續朗讀)',
  announce: '重要事件播報',
  announceHint: '當智慧體等待使用者審批或提出問題時，播放提示音並語音播報。',
  approvalText: '審批提示語',
  approvalHint: '請求審批時播報的短語，會自動附帶工具名稱。',
  questionText: '提問提示語',
  questionHint: '智慧體提問時播報的前導短語。留空則直接讀出問題。',
  chime: '提示音效',
  chimeHint: '可選 ding、beep 或無。',
  language: '語言選擇',
  languageHint: '針對需要指定語言的服務商（如 eSpeak 或 Azure SSML）。',
  piperModel: 'Piper 模型路徑',
  piperModelHint: 'ONNX 模型的絕對路徑。留空則跳過 Piper。',
  piperBin: 'Piper 可執行檔案',
  binHint: '預設從 PATH 查詢，除非指定絕對路徑。',
  espeakBin: 'eSpeak 可執行檔案',
  espeakHint: '通常為 espeak-ng。',
  edgeBin: 'edge-tts 可執行檔案',
  edgeHint: 'Python edge-tts 命令列工具。',
  azureRegion: 'Azure 區域',
  azureHint: 'Azure 語音服務所在區域，例如 eastus。',
  openaiBaseUrl: 'OpenAI API 地址',
  openaiBaseUrlHint: '相容 OpenAI 的 TTS 介面地址。',
  mimoBaseUrl: 'MiMo API 地址',
  mimoBaseUrlHint: 'MiMo 介面根地址，透過其對話介面提取語音。',
  mimoFormat: 'MiMo 音訊格式',
  mimoFormatHint: 'mp3 或 wav。',
  minimaxBin: 'MiniMax CLI 路徑',
  minimaxBinHint: '預設從 PATH 查詢，需提前安裝並登入。',
  doubaoAppId: '豆包 App ID',
  doubaoAppIdHint: '火山引擎 TTS 應用 ID。',
  doubaoCluster: '豆包叢集',
  doubaoClusterHint: '火山引擎 TTS 叢集標識，例如 volcano_tts。',
  doubaoBaseUrl: '豆包 API 地址',
  doubaoBaseUrlHint: '火山引擎 TTS REST 介面地址。',
  deepseekWebBaseUrl: 'DeepSeek Web 介面地址',
  deepseekWebBaseUrlHint: 'DeepSeek 網頁端語音介面或網橋地址。',
  cosyvoiceUrl: 'CosyVoice 服務地址',
  cosyvoiceUrlHint: '本地 CosyVoice HTTP 服務介面地址。',
  voicePacksTitle: '預設音色包（一鍵配置）',
  voicePacksHint: '一鍵套用經過調校的音色風格、語速與提示音。',
  pack_narrator: '專業旁白',
  pack_buddy: '活力搭檔',
  pack_calm: '沉穩導師',
  pack_cyberpunk: '賽博終端',
  pack_whisper: '溫和夜讀',
  applyPack: '應用預設',
  eventChimesTitle: '智慧體事件提示音',
  eventChimesHint: '在關鍵智慧體事件發生時播放輕量提示音。',
  onTurnComplete: '回覆完成提示音',
  onApprovalRequired: '請求審批提示音',
  onError: '異常告警提示音',
  onSubagentStart: '子智慧體啟動提示音',
  onSubagentDone: '子智慧體完成提示音',

  advancedTitle: '高階參數',
  advancedHint: '字元上限與介面重定向。API 金鑰在候選鏈中維護，憑證環境變數僅在後臺生效。',
  maxChars: '最大字元上限',
  maxCharsHint: '觸發長文字截斷或摘要的硬性上限；0 表示無限制。',
  sentenceChars: '單句切片大小',
  sentenceCharsHint: '流式語音合成中單句的最大字元長度。',
  timeoutMs: '服務商超時 (毫秒)',
  timeoutMsHint: '單次語音合成請求超時時間，超時後自動切換下一服務商。',
  maxQueue: '最大佇列長度',
  maxQueueHint: '合成預算，最多四個並行請求；保留等待中的句子。設為 0 停用自動朗讀。',
  chainTitle: '服務商降級鏈 (Fallback Chain)',
  addProvider: '新增服務商',
  localProvider: '本地 / CLI 服務商（無需 API 金鑰）',
  configured: '已配置',
  notSet: '未設定',
  fromEnv: '來自環境變數',
  clear: '清空',
  remove: '移除',
  up: '上移',
  down: '下移',
  save: '儲存設定',
  saved: '已儲存',
  cardHint: '配置服務商降級順序、發音人與朗讀參數。',
  skipCode: '跳過程式碼塊',
  skipCodeHint: '遇到程式碼塊時朗讀簡短提示，而不逐行朗讀程式碼字元。',
  skipTables: '跳過 Markdown 表格',
  skipTablesHint: '遇到表格時朗讀簡短提示，而不逐格朗讀表格內容。',
  cleanUrls: '淨化網頁連結',
  cleanUrlsHint: '將長網址替換為簡短域名朗讀。',
  keepInlineCode: '保留行內程式碼',
  keepInlineCodeHint: '朗讀反引號內的行內程式碼文字，而非略過。',
  adaptiveRate: '智慧語速 (Smart Speed)',
  adaptiveRateHint: '對長篇回答自動適度加快播放速度。',
  tldrDefault: '重點結論模式 (TL;DR)',
  tldrDefaultHint: '預設僅朗讀回答中的總結、結論或核心要點。',
  speakMessageTldr: '僅朗讀要點 (TL;DR)',
  cache: '合成音訊快取',
  cacheHint: '重複短語直接從本地快取讀取，無需重複合成。',
  cacheMaxMb: '快取上限 (MB)',
  cacheMaxMbHint: '超出容量時優先淘汰最近最少使用 (LRU) 的音訊。',
  clearCache: '清空快取',
  pronTitle: '發音糾正字典',
  pronHint: '規則自上而下匹配。左側支援 /…/ 正規表示式；支援按語言過濾。',
  pronFrom: '原詞',
  pronTo: '替換為',
  pronWhole: '全詞匹配',
  pronLang: '語言',
  addRule: '新增規則',
  rolesTitle: '角色專屬音色',
  rolesHint: '留空項將自動繼承主服務商配置。',
  roleReply: '普通回覆',
  roleApproval: '操作審批',
  roleError: '系統錯誤',
  ssmlStyle: '情感語調 (SSML)',
  ssmlStyleHint: '情緒語調風格（如 cheerful、serious、empathetic 等）。',
  longReply: '長回覆處理',
  longReplyHint: 'truncate: 截斷超長部分; summarize: 智慧生成簡述; full: 完整朗讀全文。',
  summaryModel: '摘要生成模型',
  summaryModelHint: 'provider/model 格式，留空則跟隨當前對話模型。',
  summarySentences: '摘要句數',
  summarySentencesHint: '語音朗讀所採用的摘要句子數量。',
  preview: '試聽',
  statsTitle: '實時統計',
  statTotal: '總請求數',
  statHits: '快取命中',
  statErrors: '合成失敗',
  statReset: '重置統計',
  autoDetect: '按句自動識別語種',
  autoDetectHint: '每句根據字元特徵自動推測語言，而非強制使用全域性設定。',
  narrateQuotesOnly: '僅朗讀引用內容',
  narrateQuotesHint: '僅朗讀正文中用引號括起來的引用短語。',
  skipActions: '跳過 *星號動作*',
  skipActionsHint: '自動剔除 *動作說明* 文字。',
  removeRegex: '自定義正則過濾',
  removeRegexHint: '在合成前由全域性正規表示式匹配並剔除匹配文字。',
  customBaseUrl: '自定義 TTS API 地址',
  customBaseUrlHint: '相容 OpenAI 的介面地址，如 http://localhost:8880/v1；留空禁用。',
  customKeyEnv: '自定義介面憑據名',
  customKeyEnvHint: '用於儲存自定義介面 Bearer Token 的憑證槽位名稱。',
  localEnginesTitle: '本地離線引擎 (Offline)',
  localEnginesHint: '在本地離線執行語音合成，無需 API 金鑰與網際網路。',
  enableLocalEngines: '啟用本地引擎',
  enableLocalEnginesHint: '檢測並呼叫本地 Kokoro 或 F5-TTS 模型。',
  streamingEnabled: '逐句漸進播放',
  streamingEnabledHint: '透過 SSE 傳送已合成片段，其餘句子繼續合成。',
  useKokoro: '啟用 Kokoro-82M (CPU)',
  useKokoroHint: '基於 CPU 的輕量級快速神經語音合成。',
  useF5: '啟用 F5-TTS (GPU)',
  useF5Hint: '基於 NVIDIA GPU 的高保真零樣本克隆語音合成。',
  installed: '已就緒',
  notInstalled: '未安裝',
  downloading: '下載中',
  installKokoro: '安裝權重 (350 MB)',
  installF5: '安裝權重 (2.1 GB)',
  deleteModel: '刪除模型',
  voiceNotInstalledTitle: '依賴插件 @goodandready/dsh-voice 尚未安裝',
  voiceInstallHint: '如需啟用語音對話，請透過以下命令安裝該插件：',
  vadBargeIn: 'VAD 語音打斷',
  vadBargeInHint: '檢測到人類語音時立即終止智慧體當前語音輸出。',
  newSubagentRole: '子智慧體標識 (例如 coder, reviewer)',
  addSubagentRole: '新增子智慧體',
  autoDetectSubagent: '自動感應會話中的子智慧體角色',
  role_coder: '編碼助手 (Coder)',
  role_reviewer: '程式碼評審 (Reviewer)',
  role_planner: '架構規劃 (Planner)',
  enableItDictionary: '內建 IT 術語發音校正',
  enableItDictionaryHint: '自動糾正 SQL、Nginx、K8s、Docker、API、JSON、YAML 等專有名詞發音。',
  loadItDictionary: '填入常用 IT 術語',
  exportJson: '📥 匯出 JSON',
  importJson: '📤 匯入 JSON',
  invalidJsonFormat: '無效的字典 JSON 格式',
  previewRule: '試聽發音',
  updaterTitle: '插件更新',
  updaterCheck: '檢查更新',
  updaterChecking: '正在檢查…',
  updaterCurrent: '當前版本',
  updaterLatest: '最新版本',
  updaterUpToDate: '已是最新',
  updaterUpdateNow: '一鍵更新至 v{version}',
  updaterUpdating: '正在更新…',
  updaterSuccess: '插件更新成功！請重啟 DSH 服務以生效。',
  updaterFailed: '更新檢查失敗：',
  subtitle: 'DSH 聲音工坊（DSH-sound-atelier）：DeepSeek Harness 語音合成插件',
  available: '可用',
  dockSkip: '跳過',
  longReplyTruncate: '截斷',
  longReplySummarize: '總結',
  longReplyFull: '完整朗讀',
  unlockAudio: '點選解鎖音訊',
  errorLoading: '載入設定失敗：',
}
Object.assign(zh, {
  speechInstruction: '語氣／心情提示',
  doubaoPitch: '豆包音調（半音）',
  doubaoAutoEndpoint: '留空依模型選擇新版 V3 或舊版 V1 API。',
  doubaoHint: '豆包 2.0 在合成時套用語氣與半音調整；語速和音量套用於播放。',
  voaiStyle: '說話風格',
  voaiPitch: '音調偏移',
  voaiWeight: '風格強度',
  voaiPause: '句間停頓',
  voaiHint: 'VoAI 會在合成時調整音調與停頓。風格強度僅 Classic 支援；語速與音量套用於播放。',
  voaiBaseUrl: 'VoAI API 網址',
  voaiBaseUrlHint: '官方 ConnectAPI 網址，或你的私有部署地址。',
  voaiSoft: '細膩',
  voaiStrong: '鮮明',
  voaiShort: '連貫',
  voaiLong: '從容停頓',
  catalogModel: '模型',
  catalogVoice: '聲音',
  catalogDefault: '使用服務預設',
  catalogRefresh: '重新偵測',
  catalogSearch: '搜尋聲音、語言或性別',
  catalogLive: '服務即時清單',
  catalogPreset: '內建預設・尚未驗證',
  catalogMixed: '服務清單＋內建預設',
  catalogManual: '進階：手動輸入 ID',
  catalogExisting: '目前設定・不在本次清單中',
  catalogEmpty: '沒有符合的選項',
  catalogLoading: '正在偵測模型與聲音…',
  catalogHint: '選擇服務商，再選模型與聲音，試聽後儲存即可。API Key 會安全儲存在這臺電腦。',
  catalogSavedEndpoint: '偵測使用已儲存的連線設定。變更網址或區域後，請先儲存，再重新偵測。',
  catalog_missing_key: '請先儲存 API Key，即可偵測可用選項。',
  catalog_auth: '驗證或權限檢查失敗，請檢查金鑰與權限，尚不能確定金鑰無效。',
  catalog_invalid_key: 'API Key 無效或未提供。',
  catalog_permission: 'API Key 缺少所需權限。',
  catalog_credits: '帳戶或 API Key 額度不足，請檢查兩者的額度限制。',
  catalog_payment: '付款、額度或方案限制，尚無法判定確切原因。',
  catalog_plan: '目前方案無法使用此功能。',
  catalog_voice_access: '無法使用此音色，請檢查音色權限與方案限制。',
  catalog_free_tier_blocked: 'ElevenLabs 偵測到異常使用並限制免費方案，請檢查帳戶狀態或聯絡該服務。',
  catalog_timeout: '偵測逾時，請檢查服務後重試。',
  catalog_unreachable: '無法連線服務或執行本機語音工具，請檢查網址或安裝狀態。',
  catalog_unsupported: '此服務未提供支援的清單 API，可選內建預設或在進階選項輸入 ID。',
  catalog_region: '請設定下方的 Azure 區域，儲存後重新偵測。',
  catalog_endpoint: '請設定下方的 API 網址，儲存後重新偵測。',
  catalog_piper_path: '請設定下方的 Piper 模型路徑，即可偵測同資料夾中的 ONNX 模型。',
  catalog_runtime: '此插件尚未內建這個引擎的語音合成執行環境。',
  catalog_rate_limit: '服務暫時限制請求次數，請稍後重試。',
  catalog_http: '服務目前無法回傳清單。',
  catalog_invalid_response: '服務回傳的清單格式無法辨識。',
  catalog_empty: '本機工具未回傳任何聲音。',
  catalog_partial: '這份清單尚未完整，服務中可能還有其他選項。',
  catalogExtras: '角色音色、發音字典與整合',
  catalogSaved: '已儲存，將使用新設定重新偵測。',
  catalogSaving: '儲存中…',
  catalogPrimary: '主要服務',
  catalogFallback: '備用服務',
  catalogKey: 'API Key',
  catalogKeepKey: '留空以保留已儲存的金鑰',
  catalogSaveKey: '儲存金鑰',
  catalogKeyPermissions: '請到服務商後臺檢查服務授權與金鑰額度限制。儲存變更後，回到此處重新偵測。',
  catalogElevenLabsPermissions:
    'ElevenLabs：請開啟 Text to Speech（text_to_speech）、Models：Read（models_read）與 Voices：Read（voices_read）。',
  catalogKeyGuide: '官方金鑰／權限說明',
  catalogAwsCredential: 'AWS 憑證 JSON',
  catalogGoogleCredential: 'Google 服務帳號 JSON',
  catalogInworldCredential: 'Inworld Base64 API 憑證',
  'catalogPermissions_local-tts':
    '本機服務未啟用認證或已建立代管帳號時可留空；其他情況填入該服務的 token。此欄顯示宿主憑證狀態，代管連線另行處理，不是雲端 API Key。',
  catalogPermissions_fish:
    '請使用 Fish Audio API Key；付費模型需有 API 額度，可先選 s2.1-pro-free。另須選擇有權使用的聲音模型 ID；網頁訂閱與 API 額度請分別確認。',
  catalogPermissions_cartesia:
    '請使用可合成語音及讀取音色的 Cartesia API Key，並確認額度與音色存取。情感控制使用指定選項，目前僅支援英文。',
  catalogPermissions_dashscope:
    'API Key、業務空間 ID 與地域必須屬於同一百煉空間，並確認已開通所選 Qwen-Audio 模型與配額；此項使用原生 HTTP TTS。',
  catalogPermissions_polly:
    '安全憑證填 AWS JSON（accessKeyId、secretAccessKey、可選 sessionToken）。IAM 基本需 polly:SynthesizeSpeech、polly:DescribeVoices；串流另需 polly:StartSpeechSynthesisStream。長文工作需對應 Start/Get/ListSpeechSynthesisTask 與 S3 寫入權限；詞典依操作開 ListLexicons、GetLexicon、PutLexicon、DeleteLexicon。',
  catalogPermissions_inworld:
    '貼入 Inworld Portal 的 Base64 憑證，不要再次編碼。清單需讀取權限、合成需寫入權限；命名發音詞典使用 Standard key 的 Voices Read（查詢）／Voices Write（編輯），且工作區需另開通詞典合成。請確認地域、工作區與額度。',
  'catalogPermissions_google-cloud':
    '可填完整服務帳號 JSON，或在進階能力選 ADC，使用 DSH 主機的 Application Default Credentials。專案須啟用 Cloud Text-to-Speech、計費與合成權限，OAuth scope 為 cloud-platform；這與 Gemini API Key 不同。',
  catalogOriginalGuide: '原插件說明',
  providerCustomOpenAI: '自訂（OpenAI 相容 TTS）',
  providerDeepSeekWeb: 'DeepSeek Web（網頁語音橋接）',
  catalogWebToken: 'DeepSeek Web session token',
  catalogKeepToken: '留空以保留已儲存的 token',
  catalogSaveToken: '儲存 token',
  catalogPermissions_openai:
    '專案金鑰及其擁有者角色需允許 Model capabilities：Request（api.model.request）與 List models（api.model.read）；專案也須允許所選的 Speech／Realtime 模型。',
  catalogPermissions_google:
    '請使用 Google AI Studio 在正確專案建立的 API Key。若設定 API 限制，需允許 Generative Language API（Gemini API），並檢查專案配額與模型可用性。',
  catalogPermissions_azure:
    '請使用 Speech 資源的金鑰，區域必須與該資源一致。本插件使用資源金鑰驗證；只有 Entra 角色授權並不能代替此金鑰。',
  catalogPermissions_groq:
    '請檢查組織與專案兩層的 Model Permissions，允許所選 Orpheus 模型；專案無法解除組織層的封鎖。',
  catalogPermissions_deepgram:
    '請使用正確專案的金鑰，具備 usage:write 權限（member 角色已包含），並確認有效期與餘額；合成不需要管理員或金鑰管理權限。',
  catalogPermissions_openrouter:
    '請檢查工作區／金鑰 Guardrails 的模型與 Provider 允許清單、帳戶隱私政策及金鑰支出上限，確認所選語音模型與服務商都可使用。',
  catalogPermissions_siliconflow:
    '金鑰需屬於所用服務站點與帳戶，並確認模型存取權及餘額。官方語音檔案註明自訂音色需要實名認證。',
  catalogPermissions_deepinfra:
    '請開啟 inference、models:read、voice:read。使用聲音合成需要 inference 與 voice:read；此處不需要建立／刪除音色的管理權限。',
  catalogPermissions_minimax:
    '本插件的 HTTP 接入請使用按量計費 API Key，並確認有 Speech 資源或餘額；不要把文字／Coding 訂閱金鑰視為已取得語音權限。',
  catalogPermissions_mimo:
    '金鑰需與設定的 MiMo API 網址及計費方式相符；Token Plan 與按量計費憑證不同，另須確認模型存取與地區限制。',
  catalogPermissions_doubao:
    '請先在目標專案的「開通管理」啟用所選語音模型，再使用同專案的豆包語音 API Key；模型、音色及資源按專案隔離。',
  catalogPermissions_voai:
    '請使用 VoAI 依合約發放的 ConnectAPI 金鑰；可用模型／配音員、額度、有效期與併發上限依帳戶授權決定。',
  catalogPermissions_fireworks:
    '請確認金鑰擁有者／服務帳號可執行推論。本插件的 Fireworks TTS 介面契約仍待核實，金鑰有效不代表支援語音合成。',
  'catalogPermissions_deepseek-web':
    '原插件將此項描述為 DeepSeek 網頁語音橋接，使用 Web session token，並可覆寫橋接網址；不是 DeepSeek 公開 API Key。本機帳戶的實際語音存取尚未驗證。',
  catalogPermissions_custom:
    '服務需相容 OpenAI /audio/speech；只支援 Chat Completions 並不足夠。請允許語音生成及服務有提供的模型／音色清單端點，權限以該服務為準。',
  catalogLanguage: '所有語言',
  catalogLocal: '本機工具／無需 API Key',
})

Object.assign(zh, {
  speechInstruction: '語氣／心情提示',
  doubaoPitch: '豆包音調（半音）',
  doubaoAutoEndpoint: '留空依模型選擇新版 V3 或舊版 V1 API。',
  tuneTitle: '聲音調音臺',
  tuneSpeed: '語速',
  tunePitch: '音調',
  tuneVolume: '音量',
  studioTitle: '聲音工坊',
  studioSubtitle: '挑一個聲音，調成你喜歡的樣子。',
  studioAuto: '自動朗讀',
  studioStream: '邊生成邊朗讀',
  studioAlerts: '審批語音提醒',
  studioOn: '已開啟',
  studioOff: '已關閉',
  mimoStyle: '說話風格',
  mimoDesign: '描述想要的聲音',
  mimoDesignHint: '描述音色、口音和角色氣質。Voice Design 使用描述生成聲音，不使用聲音 ID。',
  styleNatural: '自然',
  styleGentle: '溫柔',
  styleLively: '活潑',
  styleNarrator: '旁白',
  tuneSlow: '從容慢讀',
  tuneFast: '俐落快讀',
  tuneLow: '低沉',
  tuneHigh: '明亮',
  tuneQuiet: '安靜',
  tuneLoud: '飽滿',
  tuneReset: '恢復預設',
  tuneNatural: '自然',
  tuneWarm: '溫暖旁白',
  tuneBright: '輕快活潑',
  tuneHint: '語速與音量即時套用於播放；Edge、Azure 可調整合成音調。試聽滿意後再儲存。',
  tuneUnsupported: '此服務不支援音調調整，仍可使用語速與音量。',
  tuneText: '試聽文字',
  tuneExample: '你好！這是我的聲音。試著調整滑桿，找到你喜歡的說話方式。',
  tuneOwn: '為這個角色使用獨立調音',
  tunePreviewing: '正在準備試聽…',
})

// ---- 白話版標籤與說明（覆寫上方同名項目）。
// 原則：說明這個設定做什麼、什麼時候用；不寫實作細節，一般不需要修改的項目直接說明。
Object.assign(zh, {
  general: '一般設定',
  bargeIn: '有人說話時停止朗讀',
  bargeInHint: '麥克風偵測到你開口時，立刻停止目前的朗讀。',
  vadBargeIn: '用人聲偵測判斷插話',
  vadBargeInHint: '以人聲偵測判斷是否有人說話，比單純偵測音量更不容易誤判。',
  duckOnTypingHint: '你在聊天框打字時，自動降低或暫停朗讀。',
  skipCode: '不朗讀程式碼',
  skipCodeHint: '遇到程式碼區塊時只說「程式碼，共幾行」，不逐字唸出。',
  skipTables: '不朗讀表格',
  skipTablesHint: '遇到表格時只說「表格，共幾列」，不逐格唸出。',
  cleanUrls: '網址只唸網站名稱',
  cleanUrlsHint: '長網址只唸出網站名稱，不唸整串。',
  keepInlineCode: '朗讀夾在句子裡的指令文字',
  keepInlineCodeHint: '唸出句子中夾帶的指令或變數名稱，而不是略過。',
  adaptiveRate: '長回覆自動加快',
  adaptiveRateHint: '回覆很長時自動稍微加快語速。',
  tldrDefault: '只朗讀重點',
  tldrDefaultHint: '只唸回覆中的總結或結論，不唸全文。',
  cache: '重複的句子不重新合成',
  cacheHint: '相同的句子直接使用上次的音訊，省時間也省費用。',
  cacheMaxMb: '快取空間上限 (MB)',
  cacheMaxMbHint: '超過上限時自動刪除最久沒用到的音訊。',
  longReplyHint: '回覆太長時的處理方式：截斷（只唸前面）、摘要（先濃縮再唸）或完整朗讀。',
  summaryModel: '摘要使用的模型',
  summaryModelHint: '格式為「服務/模型」。留空使用目前對話的模型。',
  summarySentencesHint: '摘要要濃縮成幾句。',
  autoDetect: '自動判斷每句的語言',
  autoDetectHint: '中英夾雜時逐句判斷語言，而不是全部當成同一種語言。',
  narrateQuotesHint: '只唸引號裡的內容，適合只想聽對白的情境。',
  skipActions: '不朗讀 *動作描述*',
  skipActionsHint: '略過用星號包起來的動作說明，例如 *微笑*。',
  removeRegex: '自訂要略過的文字（正規表示式）',
  removeRegexHint: '符合這個規則的文字不會被朗讀。不熟悉正規表示式可以留空。',
  approvalHint: '需要你批准操作時說的話，後面會自動加上工具名稱。',
  questionHint: 'AI 向你提問前說的話。留空則直接唸出問題。',
  languageHint: '主要朗讀的語言，例如 zh-TW。部分語音服務需要這項資訊。',
  customKeyEnv: '自訂服務的金鑰名稱（進階）',
  customKeyEnvHint: '使用自訂語音服務時，金鑰存放的名稱。一般不需要修改。',
  piperModelHint: 'Piper 模型檔的完整路徑。沒有使用 Piper 可以留空。',
  binHint: '一般不需要修改。程式不在系統路徑時才填完整路徑。',
  espeakHint: '一般為 espeak-ng，不需要修改。',
  edgeHint: '一般不需要修改；預設使用內建的 Edge 語音連線。',
  advancedHint: '字數上限、逾時與各服務的連線網址。一般不需要修改。',
  maxCharsHint: '回覆超過這個字數時，依「長回覆處理」截斷或摘要。0 表示不限制。',
  sentenceChars: '每段朗讀的長度',
  sentenceCharsHint: '邊生成邊朗讀時，每次送去合成的最大字數。',
  timeoutMs: '合成逾時 (毫秒)',
  timeoutMsHint: '語音服務超過這個時間沒回應，就改用下一個備援服務。',
  maxQueue: '最多排隊幾句',
  maxQueueHint: '等待朗讀的句子上限。設為 0 會停用自動朗讀。',
})
// 用語統一：「智慧體」在繁中介面改稱 AI／子代理。
for (const key of Object.keys(zh)) {
  if (typeof zh[key] === 'string' && zh[key].includes('智慧體'))
    zh[key] = zh[key].replaceAll('子智慧體', '子代理').replaceAll('智慧體', 'AI')
}
// ---- 20-tuning-bar.js
const TUNING_DEFAULTS = { rate: 1, pitch: 0, volume: 1, voaiPitch: 0, doubaoPitch: 0, styleWeight: 0.5, breathPause: 0 }

function TuningBar(props) {
  const t = props.t
  const pitchSupported = ['edge', 'azure'].includes(props.provider)
  const value = Object.assign(
    { rate: 1, pitch: 0, volume: 1, voaiPitch: 0, doubaoPitch: 0, styleWeight: 0.5, breathPause: 0 },
    props.value,
  )
  const [text, setText] = React.useState(() => t('tuneExample'))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const slider = (key, title, min, max, step, low, high, format, disabled) =>
    React.createElement(
      'label',
      { className: 'dts-tune-slider' },
      React.createElement(
        'span',
        { className: 'dts-tune-label' },
        t(title),
        React.createElement('output', null, format(value[key])),
      ),
      React.createElement('input', {
        type: 'range',
        min,
        max,
        step,
        value: value[key],
        disabled: !props.writable || disabled,
        'aria-label': t(title),
        'aria-valuetext': format(value[key]),
        onChange: (e) => props.onChange({ [key]: Number(e.target.value) }),
      }),
      React.createElement(
        'span',
        { className: 'dts-tune-ends' },
        React.createElement('span', null, t(low)),
        React.createElement('span', null, t(high)),
      ),
    )
  const preview = async () => {
    setBusy(true)
    setError('')
    try {
      await props.onPreview(text, value)
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setBusy(false)
    }
  }
  return React.createElement(
    'div',
    { className: 'dts-tune' },
    React.createElement(
      'div',
      { className: 'dts-tune-header' },
      React.createElement('strong', null, t('tuneTitle')),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dts-link',
          // 全部已是預設值時停用，避免按了沒有任何變化。
          disabled: !props.writable || Object.keys(TUNING_DEFAULTS).every((key) => value[key] === TUNING_DEFAULTS[key]),
          onClick: () => props.onChange({ ...TUNING_DEFAULTS }),
        },
        t('tuneReset'),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      [
        { label: 'tuneNatural', rate: 1, pitch: 0, volume: 1 },
        { label: 'tuneWarm', rate: 0.9, pitch: -15, volume: 0.8 },
        { label: 'tuneBright', rate: 1.15, pitch: 15, volume: 0.95 },
      ].map((p) => {
        const patch = {
          rate: p.rate,
          pitch: pitchSupported ? p.pitch : 0,
          volume: p.volume,
          ...(props.provider === 'voai' ? { voaiPitch: p.pitch / 10, breathPause: 0, styleWeight: 0.5 } : {}),
        }
        return React.createElement(
          'button',
          {
            key: p.label,
            type: 'button',
            className: 'dts-btn',
            disabled: !props.writable,
            // 目前數值已經等於這組預設時標示為已選取，讓使用者知道再按不會有變化。
            'aria-pressed': Object.keys(patch).every((key) => value[key] === patch[key]),
            onClick: () => props.onChange(patch),
          },
          t(p.label),
        )
      }),
    ),
    slider('rate', 'tuneSpeed', 0.5, 2, 0.05, 'tuneSlow', 'tuneFast', (n) => Number(n).toFixed(2) + '×'),
    props.provider === 'doubao'
      ? slider('doubaoPitch', 'doubaoPitch', -12, 12, 1, 'tuneLow', 'tuneHigh', (n) => (n > 0 ? '+' : '') + n)
      : props.provider === 'voai'
        ? slider('voaiPitch', 'voaiPitch', -5, 5, 0.5, 'tuneLow', 'tuneHigh', (n) => (n > 0 ? '+' : '') + n)
        : slider(
            'pitch',
            'tunePitch',
            -50,
            50,
            1,
            'tuneLow',
            'tuneHigh',
            (n) => (n > 0 ? '+' : '') + n + ' Hz',
            !pitchSupported,
          ),
    slider('volume', 'tuneVolume', 0, 1, 0.05, 'tuneQuiet', 'tuneLoud', (n) => Math.round(n * 100) + '%'),
    props.provider === 'voai'
      ? slider('breathPause', 'voaiPause', 0, 10, 0.1, 'voaiShort', 'voaiLong', (n) => Number(n).toFixed(1) + ' s')
      : null,
    props.provider === 'voai' && props.model === 'Classic'
      ? slider('styleWeight', 'voaiWeight', 0, 1, 0.05, 'voaiSoft', 'voaiStrong', (n) => Math.round(n * 100) + '%')
      : null,
    React.createElement(
      'div',
      { className: 'dts-sub' },
      t(
        props.provider === 'voai'
          ? 'voaiHint'
          : props.provider === 'doubao'
            ? 'doubaoHint'
            : pitchSupported
              ? 'tuneHint'
              : 'tuneUnsupported',
      ),
    ),
    ['fish', 'dashscope'].includes(props.provider) ||
      (props.provider === 'inworld' && (!props.model || props.model === 'inworld-tts-2')) ||
      props.provider === 'mimo' ||
      props.provider === 'google' ||
      (props.provider === 'google-cloud' && /^gemini-.*tts/.test(props.model || '')) ||
      (props.provider === 'deepinfra' && /^Qwen\/Qwen3-TTS/.test(props.model || '')) ||
      (props.provider === 'groq' && (!props.model || props.model === 'canopylabs/orpheus-v1-english')) ||
      (props.provider === 'cosyvoice' && (props.cosyvoiceMode || value.cosyvoiceMode || '').startsWith('instruct')) ||
      (props.provider === 'siliconflow' && /cosyvoice/i.test(props.model || '')) ||
      (props.provider === 'openai' && !/^tts-1/.test(props.model || '')) ||
      (props.provider === 'elevenlabs' && /^eleven_v[34]/.test(props.model || '')) ||
      (props.provider === 'openrouter' && /^(openai|google|fish-audio)\//.test(props.model || '')) ||
      (props.provider === 'doubao' && (!props.model || props.model === 'seed-tts-2.0'))
      ? React.createElement(
          'div',
          { className: 'dts-catalog-field' },
          React.createElement('strong', null, t('speechInstruction')),
          React.createElement(
            'div',
            { className: 'dts-row' },
            [
              ['styleNatural', ''],
              ['styleGentle', 'Speak gently, warmly and calmly.'],
              ['styleLively', 'Speak with a bright, upbeat and lively tone.'],
              ['styleNarrator', 'Read clearly as a composed storyteller, with natural pauses.'],
            ].map(([label, instruction]) =>
              React.createElement(
                'button',
                {
                  key: label,
                  type: 'button',
                  className: 'dts-btn',
                  disabled: !props.writable,
                  'aria-pressed': (value.instruction || '') === instruction,
                  onClick: () => props.onChange({ instruction }),
                },
                t(label),
              ),
            ),
          ),
          React.createElement('input', {
            className: 'dts-input',
            'aria-label': t('speechInstruction'),
            value: value.instruction || '',
            maxLength: props.provider === 'groq' ? 100 : 2000,
            disabled: !props.writable,
            onChange: (e) => props.onChange({ instruction: e.target.value }),
          }),
          props.provider === 'groq'
            ? React.createElement(
                'span',
                { className: 'dts-sub' },
                '英文 Orpheus 語氣提示最多 100 字元，建議使用簡短英文。',
              )
            : null,
          props.model === 'mimo-v2.5-tts-voicedesign' || props.model === 'Qwen/Qwen3-TTS-VoiceDesign'
            ? React.createElement(
                'label',
                { className: 'dts-catalog-field' },
                t('mimoDesign'),
                React.createElement('textarea', {
                  className: 'dts-input',
                  style: { height: 80, padding: 10 },
                  value: value.voiceDesign || '',
                  maxLength: 2000,
                  disabled: !props.writable,
                  onChange: (e) => props.onChange({ voiceDesign: e.target.value }),
                }),
                React.createElement('span', { className: 'dts-sub' }, t('mimoDesignHint')),
              )
            : null,
        )
      : null,
    React.createElement(
      'label',
      { className: 'dts-catalog-field' },
      t('tuneText'),
      React.createElement('textarea', {
        className: 'dts-input',
        style: { height: 64, padding: '10px' },
        value: text,
        maxLength: 500,
        onChange: (e) => setText(e.target.value),
      }),
    ),
    React.createElement(
      'button',
      { type: 'button', className: 'dts-btn', disabled: busy || !text.trim() || !props.provider, onClick: preview },
      busy ? t('tunePreviewing') : '▶ ' + t('preview'),
    ),
    error ? React.createElement('div', { className: 'dts-bad', role: 'alert' }, error) : null,
  )
}
// ---- 21-catalog-picker.js
function CatalogPicker(props) {
  const t = props.t
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [refresh, setRefresh] = React.useState(0)
  const [search, setSearch] = React.useState('')
  const [language, setLanguage] = React.useState('')
  const [manual, setManual] = React.useState(false)
  React.useEffect(() => {
    setSearch('')
    setLanguage('')
    setManual(false)
  }, [props.provider])
  React.useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    if (!props.provider) {
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    const query =
      '?provider=' +
      encodeURIComponent(props.provider) +
      '&model=' +
      encodeURIComponent(props.model || '') +
      (refresh ? '&refresh=1' : '')
    clientFetch('/dsh-sound-atelier/catalog' + query, { signal: controller.signal, timeoutMs: 14000, cache: 'no-store' })
      .then(async (res) => {
        const value = await res.json()
        if (!res.ok || !value.ok) throw new Error('catalog')
        return value
      })
      .then((value) => {
        if (!controller.signal.aborted) setData(Object.assign({}, value, { requestedModel: props.model || '' }))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('catalog_unreachable'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [props.provider, props.model, props.catalogEpoch, refresh])
  React.useEffect(() => {
    if (
      props.provider !== 'voai' ||
      !data ||
      data.provider !== props.provider ||
      data.requestedModel !== (props.model || '') ||
      props.autoSelect === false ||
      !props.writable
    )
      return
    const patch = {}
    if (!props.model && data.defaultModel) patch.model = data.defaultModel
    if (!props.voice && data.voices?.[0]) patch.voice = data.voices[0].id
    const voice = data.voices?.find((v) => v.id === (props.voice || patch.voice))
    if (!props.style && voice?.styles?.[0]) patch.style = voice.styles[0]
    if (Object.keys(patch).length) props.onChange(patch)
  }, [data, props.provider, props.model, props.voice, props.style, props.writable])
  const sourceLabel = (name) =>
    t(
      data?.sources?.[name] === 'live'
        ? 'catalogLive'
        : data?.sources?.[name] === 'mixed'
          ? 'catalogMixed'
          : 'catalogPreset',
    )
  const picker = (kind, value, items, filtered) => {
    const label = t(kind === 'models' ? 'catalogModel' : 'catalogVoice')
    return React.createElement(
      'label',
      { className: 'dts-catalog-field' },
      React.createElement(
        'span',
        { className: 'dts-catalog-label' },
        label,
        data ? React.createElement('small', null, sourceLabel(kind) + ' · ' + items.length) : null,
      ),
      manual
        ? React.createElement('input', {
            className: 'dts-input',
            'aria-label': label,
            value: value || '',
            disabled: !props.writable,
            onChange: (e) =>
              props.onChange(
                kind === 'models'
                  ? { model: e.target.value, voice: '', style: '' }
                  : { voice: e.target.value, style: '' },
              ),
          })
        : React.createElement(
            'select',
            {
              className: 'dts-input',
              'aria-label': label,
              value: value || '',
              disabled: !props.writable || loading || !props.provider,
              onChange: (e) =>
                props.onChange(
                  kind === 'models'
                    ? { model: e.target.value, voice: '', style: '' }
                    : { voice: e.target.value, style: '' },
                ),
            },
            React.createElement('option', { value: '' }, t('catalogDefault')),
            value && !items.some((v) => v.id === value)
              ? React.createElement('option', { value }, value + ' (' + t('catalogExisting') + ')')
              : null,
            (filtered || items).map((v) =>
              React.createElement(
                'option',
                { key: v.id, value: v.id },
                [v.name || v.id, v.language, v.gender].filter(Boolean).join(' · '),
              ),
            ),
            filtered && !filtered.length ? React.createElement('option', { disabled: true }, t('catalogEmpty')) : null,
          ),
    )
  }
  const voices = data?.voices || []
  const styles = voices.find((v) => v.id === props.voice)?.styles || []
  const langs = [...new Set(voices.map((v) => v.language).filter(Boolean))].sort()
  const filtered = voices.filter(
    (v) =>
      v.id === props.voice ||
      ((!language || v.language === language) &&
        [v.id, v.name, v.language, v.gender].join(' ').toLowerCase().includes(search.toLowerCase())),
  )
  return React.createElement(
    'div',
    { className: 'dts-catalog' },
    React.createElement(
      'div',
      { className: 'dts-catalog-grid' },
      picker('models', props.model, data?.models || []),
      picker('voices', props.voice, voices, filtered),
    ),
    props.provider === 'voai'
      ? React.createElement(
          'label',
          { className: 'dts-catalog-field' },
          t('voaiStyle'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: props.style || '',
              disabled: !props.writable || loading,
              onChange: (e) => props.onChange({ style: e.target.value }),
            },
            React.createElement('option', { value: '' }, t('catalogDefault')),
            props.style && !styles.includes(props.style)
              ? React.createElement('option', { value: props.style }, props.style + ' (' + t('catalogExisting') + ')')
              : null,
            styles.map((style) => React.createElement('option', { key: style, value: style }, style)),
          ),
        )
      : null,
    React.createElement(
      'div',
      { className: 'dts-catalog-tools' },
      React.createElement('input', {
        type: 'search',
        className: 'dts-input',
        'aria-label': t('catalogSearch'),
        placeholder: t('catalogSearch'),
        value: search,
        onChange: (e) => setSearch(e.target.value),
      }),
      langs.length > 1
        ? React.createElement(
            'select',
            {
              className: 'dts-input',
              value: language,
              'aria-label': t('catalogLanguage'),
              onChange: (e) => setLanguage(e.target.value),
            },
            React.createElement('option', { value: '' }, t('catalogLanguage')),
            langs.map((l) => React.createElement('option', { key: l, value: l }, l)),
          )
        : null,
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: loading || !props.provider,
          onClick: () => setRefresh((v) => v + 1),
        },
        t('catalogRefresh'),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-sub', role: 'status', 'aria-live': 'polite' },
      loading
        ? t('catalogLoading')
        : error ||
            [
              ...new Set(
                (data?.warnings || []).map(
                  (w) =>
                    t('catalog_' + w.code) +
                    (['text_to_speech', 'models_read', 'voices_read'].includes(w.permission)
                      ? ' (' + w.permission + ')'
                      : '') +
                    (w.status ? ' (HTTP ' + w.status + ')' : ''),
                ),
              ),
            ].join(' '),
    ),
    React.createElement(
      'label',
      { className: 'dts-sub dts-row' },
      React.createElement('input', {
        type: 'checkbox',
        checked: manual,
        disabled: !props.writable,
        onChange: (e) => setManual(e.target.checked),
      }),
      t('catalogManual'),
    ),
  )
}
// ---- 22-chain-editor.js
function ChainEditor(props) {
  // Translator comes from the card: the slot passes props.t only to it.
  const t = props.t || ((key) => key)
  const rows = Array.isArray(props.value) ? props.value : []
  const change = (i, patch) => {
    const next = rows.map((r, k) => (k === i ? Object.assign({}, r, patch) : r))
    props.onChange(next)
  }
  const move = (i, delta) => {
    const j = i + delta
    if (j < 0 || j >= rows.length) return
    const next = rows.slice()
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    props.onChange(next)
  }
  const remove = (i) => props.onChange(rows.filter((_, k) => k !== i))
  const add = () => props.onChange(rows.concat([{ provider: 'edge', model: '', voice: '' }]))
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement(
      'div',
      { className: 'dts-sub' },
      '由上到下依序嘗試：第一個是主要服務，失敗或沒有金鑰時自動改用下一個備援。',
    ),
    rows.map((row, i) => {
      const cloud = !!CLOUD[row.provider]
      const cred = credOf(props.credentials, row.provider)
      const draft = (props.keyDrafts && props.keyDrafts[row.provider]) || ''
      const badge = !cloud ? null : !cred.writable ? t('fromEnv') : cred.configured ? t('configured') : t('notSet')
      return React.createElement(
        'div',
        { className: 'dts-entry', key: i, 'data-primary': i === 0 ? 'true' : 'false' },
        React.createElement(
          'div',
          { className: 'dts-h' },
          t(i === 0 ? 'catalogPrimary' : 'catalogFallback') + (i ? ' ' + i : ''),
          (() => {
            // 一眼看出這一列能不能用：缺金鑰、暫停中、上次失敗，或可用。
            const hit = Array.isArray(props.breaker)
              ? props.breaker.find((b) => b && (b.id === row.provider || b.id.startsWith(row.provider + ':' + i + ':')))
              : null
            const state =
              cloud && !cred.configured
                ? ['missing', '缺金鑰', ' dts-badge-bad']
                : hit?.open
                  ? ['paused', '暫停中（連續失敗）', ' dts-badge-bad']
                  : hit?.lastError
                    ? ['failed', '上次失敗', ' dts-badge-warn']
                    : ['ok', cloud ? '可用' : row.provider === 'edge' ? '可用・免金鑰' : '本機', ' dts-badge-on']
            return React.createElement(
              'span',
              { className: 'dts-badge' + state[2], style: { marginLeft: 8 }, 'data-chain-status': state[0] },
              state[1],
            )
          })(),
        ),
        React.createElement(
          'div',
          { className: 'dts-row' },
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: row.provider,
              disabled: !props.writable,
              'aria-label': t(i === 0 ? 'catalogPrimary' : 'catalogFallback'),
              onChange: (e) =>
                change(i, {
                  provider: e.target.value,
                  model: '',
                  voice: '',
                  style: '',
                  baseUrl: '',
                  keyEnv: '',
                  options: '',
                }),
            },
            PROVIDERS.filter(
              (p) =>
                i > 0 ||
                p === row.provider ||
                ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice'].includes(p) ===
                  (props.sourceMode === 'local'),
            ).map((p) => React.createElement('option', { key: p, value: p }, providerLabel(t, p))),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('up'),
              'aria-label': t('up'),
              disabled: !props.writable || i === 0,
              onClick: () => move(i, -1),
            },
            '\u2191',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('down'),
              'aria-label': t('down'),
              disabled: !props.writable || i === rows.length - 1,
              onClick: () => move(i, 1),
            },
            '\u2193',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: !props.writable,
              onClick: () =>
                props.onPreview(row.provider, row.model, row.voice, undefined, {
                  style: row.style,
                  baseUrl: row.baseUrl,
                  keyEnv: row.keyEnv,
                  options: row.options,
                  referenceAsset: row.referenceAsset,
                }),
            },
            '\u25b6 ' + t('preview'),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('remove'),
              'aria-label': t('remove'),
              disabled: !props.writable,
              onClick: () => remove(i),
            },
            '\u00d7',
          ),
        ),
        cloud
          ? React.createElement(
              'div',
              { className: 'dts-row' },
              React.createElement('input', {
                className: 'dts-key dts-input',
                type: 'password',
                autoComplete: 'off',
                value: draft,
                disabled: !props.writable || !cred.writable,
                'aria-label': t(credentialLabel(row.provider)),
                placeholder: cred.configured
                  ? t(row.provider === 'deepseek-web' ? 'catalogKeepToken' : 'catalogKeepKey')
                  : t(credentialLabel(row.provider)),
                onChange: (e) => props.onDraft(row.provider, e.target.value),
              }),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: !props.writable || !cred.writable || !draft.trim(),
                  onClick: () => props.onCommitKey(row.provider, draft),
                },
                t(row.provider === 'deepseek-web' ? 'catalogSaveToken' : 'catalogSaveKey'),
              ),
              React.createElement('span', { className: 'dts-badge' + (cred.configured ? ' dts-badge-on' : '') }, badge),
              cred.configured && cred.writable
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dts-link',
                      disabled: !props.writable,
                      onClick: () => props.onClearKey(row.provider),
                    },
                    t('clear'),
                  )
                : null,
            )
          : React.createElement(
              'span',
              { className: 'dts-sub' },
              row.provider === 'edge' ? '線上服務・免金鑰' : t('catalogLocal'),
            ),
        cloud
          ? React.createElement(
              'div',
              { className: 'dts-sub' },
              row.provider !== 'deepseek-web' ? t('catalogKeyPermissions') : null,
              React.createElement(
                'div',
                null,
                t(
                  row.provider === 'elevenlabs' ? 'catalogElevenLabsPermissions' : 'catalogPermissions_' + row.provider,
                ),
              ),
              KEY_GUIDES[row.provider]
                ? React.createElement(
                    'a',
                    {
                      className: 'dts-link',
                      href: KEY_GUIDES[row.provider],
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                    t(row.provider === 'deepseek-web' ? 'catalogOriginalGuide' : 'catalogKeyGuide'),
                  )
                : null,
            )
          : null,
        React.createElement(CatalogPicker, {
          t,
          provider: row.provider,
          model: row.model,
          voice: row.voice,
          style: row.style,
          writable: props.writable,
          catalogEpoch: props.catalogEpoch,
          onChange: (patch) => change(i, patch),
        }),
        ['local-tts', 'f5', 'cosyvoice', 'fish', 'mimo', 'siliconflow'].includes(row.provider)
          ? React.createElement(
              'label',
              { className: 'dts-field' },
              '此候選的參考錄音',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '此候選的參考錄音',
                  value: row.referenceAsset || '',
                  disabled: !props.writable,
                  onChange: (e) => change(i, { referenceAsset: e.target.value }),
                },
                React.createElement(
                  'option',
                  { value: '' },
                  ['local-tts', 'f5', 'cosyvoice'].includes(row.provider) ? '沿用本機參考錄音設定' : '不傳送參考錄音',
                ),
                (props.referenceAssets || []).map((a) =>
                  React.createElement('option', { key: a.id, value: a.id }, a.name),
                ),
              ),
              React.createElement(
                'span',
                { className: 'dts-sub' },
                ['fish', 'mimo', 'siliconflow'].includes(row.provider)
                  ? '明確選擇後，合成會將此錄音傳送至該雲端服務；本機全域選擇不會自動套用。'
                  : '上傳與管理位於「本機模型與參考音色」。',
              ),
            )
          : null,
        React.createElement(
          'details',
          null,
          React.createElement('summary', { className: 'dts-sub' }, t('entryAdvanced')),
          React.createElement('div', { className: 'dts-sub' }, t('entryAdvancedHint')),
          ...[
            ...([
              'local-tts',
              'openai',
              'custom',
              'voai',
              'doubao',
              'mimo',
              'deepinfra',
              'siliconflow',
              'minimax',
              'cosyvoice',
            ].includes(row.provider)
              ? [['baseUrl', 'entryEndpoint']]
              : []),
            ...(cloud ? [['keyEnv', 'entryCredential']] : []),
            ['options', 'entryOptions'],
          ].map(([field, label]) =>
            React.createElement(
              'label',
              { className: 'dts-block', key: field },
              t(label),
              React.createElement(field === 'options' ? 'textarea' : 'input', {
                className: 'dts-input',
                'aria-label': t(label),
                value: row[field] || '',
                disabled: !props.writable,
                onChange: (e) => change(i, { [field]: e.target.value }),
              }),
            ),
          ),
        ),
        cloud && cred.ref ? React.createElement('span', { className: 'dts-sub' }, '已儲存為 ' + cred.ref) : null,
        (() => {
          const hit = Array.isArray(props.breaker)
            ? props.breaker.find((b) => b && (b.id === row.provider || b.id.startsWith(row.provider + ':' + i + ':')))
            : null
          if (!hit || (!hit.open && !hit.lastError)) return null
          return React.createElement(
            'div',
            { className: 'dts-sub dts-bad' },
            (hit.open ? t('breakerOpen') + ' · ' : '') + (hit.lastError || ''),
          )
        })(),
      )
    }),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement(
        'button',
        { type: 'button', className: 'dts-btn', disabled: !props.writable, onClick: add },
        '+ ' + t('addProvider'),
      ),
      React.createElement('span', { className: 'dts-sub' }, t('chainHint')),
    ),
  )
}

// Card strings live in the locale registry so a separate package can translate
// them without touching this plugin. English is the source language and fallback.
// ---- 23-provider-panels.js
function ProviderOperationsPanel({ provider }) {
  const h = React.createElement
  const choices =
    provider === 'polly'
      ? [
          ['lexicon-list', '列出發音詞典', {}],
          ['lexicon-get', '讀取發音詞典', { name: 'Terms' }],
          [
            'lexicon-put',
            '儲存發音詞典',
            {
              name: 'Terms',
              content:
                '<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" alphabet="ipa" xml:lang="en-US"><lexeme><grapheme>DSH</grapheme><alias>Deep Seek Harness</alias></lexeme></lexicon>',
            },
          ],
          ['lexicon-delete', '刪除發音詞典', { name: 'Terms' }],
          ['task-list', '列出長文工作', {}],
          ['task-get', '查詢長文工作', { id: '' }],
          ['task-start', '送出長文工作（可能計費）', { text: '', bucket: '', prefix: 'dsh-tts/' }],
        ]
      : [
          ['dictionary-list', '列出發音詞典', { workspace: '' }],
          ['dictionary-get', '讀取發音詞典', { workspace: '', id: '' }],
          ['dictionary-create', '建立發音詞典', { workspace: '', displayName: 'Terms', pronunciations: [] }],
          [
            'dictionary-update',
            '更新發音詞典（取代完整內容）',
            { workspace: '', id: '', etag: '', displayName: 'Terms', pronunciations: [] },
          ],
          ['dictionary-delete', '刪除發音詞典', { workspace: '', id: '', etag: '' }],
          ['async-start', '送出非同步語音（可能計費）', { text: '' }],
          ['batch-start', '送出批次語音（可能計費）', { items: [{ id: 'one', text: '' }] }],
          ['operation-get', '查詢非同步工作', { name: 'ttsAsyncJobs/JOB_ID/operations/OPERATION_ID' }],
          ['operation-list', '列出工作操作', { id: '', batch: false }],
        ]
  const [action, setAction] = React.useState(choices[0][0]),
    [input, setInput] = React.useState(JSON.stringify(choices[0][2], null, 2)),
    [result, setResult] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  const run = async () => {
    setBusy(true)
    setResult('')
    try {
      const r = await clientFetch('/dsh-sound-atelier/provider-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, action, input: JSON.parse(input) }),
        timeoutMs: 65000,
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw Error(d.error?.message || '服務操作失敗')
      setResult(JSON.stringify(d.result, null, 2))
    } catch (e) {
      setResult(e.message)
    } finally {
      setBusy(false)
    }
  }
  return h(
    'details',
    null,
    h('summary', null, '發音詞典與雲端長文工作'),
    h(
      'div',
      { className: 'dts-sub' },
      '使用已儲存的第一個同服務候選及安全憑證。此處不會自動送出操作；更新／刪除會修改雲端資源。Inworld 更新需要先讀取目前 etag，pronunciations 會完整取代舊內容。長文結果由服務存放，查詢狀態不會重送合成。',
    ),
    h(
      'select',
      {
        className: 'dts-input',
        'aria-label': '雲端服務操作',
        value: action,
        disabled: busy,
        onChange: (e) => {
          setAction(e.target.value)
          setInput(JSON.stringify(choices.find((c) => c[0] === e.target.value)[2], null, 2))
          setResult('')
        },
      },
      choices.map(([v, label]) => h('option', { value: v, key: v }, label)),
    ),
    h('textarea', {
      className: 'dts-input',
      'aria-label': '雲端操作參數',
      value: input,
      rows: 7,
      disabled: busy,
      onChange: (e) => setInput(e.target.value),
    }),
    h(
      'button',
      { className: 'dts-btn', type: 'button', disabled: busy, onClick: run },
      busy ? '處理中…' : '執行所選操作',
    ),
    result
      ? h(
          'pre',
          { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 300, overflow: 'auto' } },
          result,
        )
      : null,
  )
}

function ProviderCapabilitiesPanel({ draft, setTop, writable, referenceAssets = [] }) {
  const h = React.createElement
  const first = draft.chain?.[0] || {}
  let selectedTransport = ''
  try {
    selectedTransport = JSON.parse(draft.providerOptions || '{}')[first.provider]?.transport || ''
  } catch {}

  const [cap, setCap] = React.useState(null)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [ssml, setSsml] = React.useState('<speak>你好，<break time="300ms"/>這是完整的語音測試。</speak>')
  const [speakers, setSpeakers] = React.useState([
    { id: 'A', voice: '' },
    { id: 'B', voice: '' },
  ])
  const [turns, setTurns] = React.useState([
    { speaker: 'A', text: '你好，今天過得如何？', instruction: '' },
    { speaker: 'B', text: '今天很開心，謝謝你！', instruction: '開心而自然' },
  ])
  const [mode, setMode] = React.useState('auto')
  const [result, setResult] = React.useState(null)
  React.useEffect(() => {
    const controller = new AbortController()
    setCap(null)
    setError('')
    if (first.provider)
      clientFetch(
        '/dsh-sound-atelier/capabilities?' +
          new URLSearchParams({
            provider: first.provider,
            model: first.model || '',
            voice: first.voice || '',
            transport: selectedTransport,
          }),
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((d) => {
          if (!controller.signal.aborted && d.ok) setCap(d.capabilities)
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message)
        })
    return () => controller.abort()
  }, [first.provider, first.model, first.voice, selectedTransport])
  let options = {},
    valid = true
  try {
    options = JSON.parse(draft.providerOptions || '{}')
    if (!options || Array.isArray(options)) throw Error()
  } catch {
    valid = false
  }
  const current = options[first.provider] || {}
  const change = (key, value) => {
    if (!valid) {
      setError('請先修正進階合成 JSON。')
      return
    }
    const updated = { ...current }
    if (value === '') delete updated[key]
    else updated[key] = value
    setTop('providerOptions', JSON.stringify({ ...options, [first.provider]: updated }))
  }
  const field = (label, control) => h('label', { className: 'dts-field' }, label, control)
  const select = (key, choices, label) =>
    field(
      label,
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: current[key] === undefined ? '' : String(current[key]),
          disabled: !writable || !valid,
          onChange: (e) => change(key, e.target.value),
        },
        h('option', { value: '' }, '服務預設'),
        choices.map((v) => h('option', { key: v, value: v }, v)),
      ),
    )
  const toggle = (key, label) =>
    field(
      label,
      h('input', {
        type: 'checkbox',
        'aria-label': label,
        checked: !!current[key],
        disabled: !writable || !valid,
        onChange: (e) => change(key, e.target.checked ? true : ''),
      }),
    )
  const textOption = (key, label) =>
    field(
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: current[key] || '',
        disabled: !writable || !valid,
        onChange: (e) => change(key, e.target.value),
      }),
    )
  const jsonOption = (key, label) =>
    field(
      label,
      h('textarea', {
        key: first.provider + key + JSON.stringify(current[key]),
        className: 'dts-input',
        'aria-label': label,
        rows: 2,
        defaultValue: current[key] === undefined ? '' : JSON.stringify(current[key]),
        disabled: !writable || !valid,
        placeholder: 'JSON 陣列／物件；留空沿用預設',
        onBlur: (e) => {
          try {
            change(key, e.target.value.trim() ? JSON.parse(e.target.value) : '')
            setError('')
          } catch {
            setError(label + '：JSON 格式錯誤')
          }
        },
      }),
    )
  const run = async (kind) => {
    if (busy) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const payload =
        kind === 'ssml'
          ? { provider: first.provider, model: first.model, voice: first.voice, ssml }
          : { mode, speakers: speakers.map((s) => ({ ...s, voice: s.voice || first.voice })), turns }
      const r = await clientFetch('/dsh-sound-atelier/' + (kind === 'ssml' ? 'preview' : 'dialogue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 600000,
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw Error(data.error?.message || '合成失敗')
      setResult(data)
      playAudioItem({
        ...data,
        text: kind === 'ssml' ? 'SSML 試聽' : turns.map((t) => t.text).join('\n'),
        kind: 'speech',
        sessionId: player.sessionId,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-capabilities': '1' },
    h('div', { className: 'dts-h' }, '模型進階能力與多角色'),
    h(
      'div',
      { className: 'dts-sub' },
      '依降級鏈第一列顯示能力。此處編輯全域參數，候選的獨立參數有優先權。合成使用已儲存設定；變更後請先儲存。',
    ),
    cap
      ? h(
          React.Fragment,
          null,
          h(
            'div',
            { className: 'dts-sub' },
            [
              cap.ssml ? 'SSML' : '',
              cap.timestamps.length
                ? '時間戳：' +
                  cap.timestamps
                    .map(
                      (v) =>
                        ({
                          word: '字詞',
                          character: '字元',
                          phoneme: '音素',
                          sentence: '句子',
                          ssml: 'SSML 標記',
                          viseme: '嘴形',
                        })[v] || v,
                    )
                    .join('、')
                : '',
              cap.nativeDialogue ? '原生多角色' : '逐段多角色',
              cap.liveInput ? '原生雙向輸入' : '整段輸入',
              cap.reference ? '參考錄音' : '',
            ]
              .filter(Boolean)
              .join(' · '),
          ),
          (cap.notes || []).map((note, i) => h('div', { className: 'dts-sub', key: i }, note)),
          cap.transports.length > 1 ? select('transport', cap.transports, '合成傳輸方式') : null,
          cap.controls.includes('format') ? select('format', cap.formats, '合成音訊格式') : null,
          cap.controls.includes('auth') ? select('auth', ['service-account', 'adc'], 'Google Cloud 驗證方式') : null,
          cap.controls.includes('timestamps')
            ? first.provider === 'inworld'
              ? select('timestamps', ['none', 'word', 'character'], '時間戳類型')
              : toggle('timestamps', '回傳時間戳')
            : null,
          cap.controls.includes('phonemes') ? toggle('phonemes', '回傳音素時間戳') : null,
          cap.controls.includes('deliveryMode')
            ? select('deliveryMode', ['STABLE', 'BALANCED', 'CREATIVE'], 'Inworld 表達模式')
            : null,
          cap.controls.includes('inputMode') ? select('inputMode', ['text', 'markup'], 'Chirp 輸入模式') : null,
          cap.controls.includes('sampleRate')
            ? field(
                '合成取樣率 Hz',
                h('input', {
                  className: 'dts-input',
                  type: 'number',
                  min: 8000,
                  max: 48000,
                  value: current.sampleRate || '',
                  disabled: !writable || !valid,
                  onChange: (e) => change('sampleRate', e.target.value ? Number(e.target.value) : ''),
                }),
              )
            : null,
          cap.controls.includes('marks')
            ? jsonOption('marks', 'Polly Speech Marks（例如 ["word","sentence"]，另計請求）')
            : null,
          cap.controls.includes('lexicons') ? jsonOption('lexicons', 'Polly 發音詞典名稱（最多 5 個）') : null,
          cap.controls.includes('dictionary')
            ? first.provider === 'fish'
              ? jsonOption('dictionary', 'Fish 發音詞典設定')
              : textOption('dictionary', '發音詞典 ID')
            : null,
          cap.controls.includes('dictionaries')
            ? jsonOption('dictionaries', 'Inworld 發音詞典資源名稱（最多 3 個）')
            : null,
          cap.controls.includes('pronunciations') ? jsonOption('pronunciations', 'Google Cloud 自訂發音設定') : null,
          cap.controls.includes('referencePath') ? textOption('referencePath', 'Fish 參考錄音路徑（DSH 主機）') : null,
          cap.controls.includes('referenceText') ? textOption('referenceText', 'Fish 參考錄音逐字稿') : null,
          cap.controls.includes('hotFix') ? jsonOption('hotFix', 'DashScope hot_fix 發音／替換設定') : null,
          cap.controls.includes('native') ? jsonOption('native', 'DeepInfra 原生模型參數') : null,
          cap.nativeSchema
            ? h(
                'details',
                null,
                h('summary', null, '此 DeepInfra 模型接受的原生參數'),
                h(
                  'div',
                  { className: 'dts-sub', style: { overflowWrap: 'anywhere' } },
                  Object.entries(cap.nativeSchema.properties || {})
                    .filter(([k]) => !['text', 'input'].includes(k))
                    .map(
                      ([k, v]) =>
                        k +
                        ' (' +
                        v.type +
                        (v.minimum !== undefined ? ', ≥' + v.minimum : '') +
                        (v.maximum !== undefined ? ', ≤' + v.maximum : '') +
                        ')',
                    )
                    .join('、'),
                ),
                h('div', { className: 'dts-sub' }, '於進階合成 JSON 的 deepinfra.native 設定；介面會依模型驗證。'),
              )
            : null,
          cap.ssml
            ? h(
                'details',
                null,
                h('summary', null, 'SSML 試聽'),
                h('textarea', {
                  className: 'dts-input',
                  'aria-label': 'SSML 內容',
                  value: ssml,
                  rows: 4,
                  onChange: (e) => setSsml(e.target.value),
                }),
                h(
                  'button',
                  { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run('ssml') },
                  '合成 SSML',
                ),
              )
            : null,
        )
      : h('div', { className: 'dts-sub' }, '讀取模型能力…'),
    h(
      'details',
      null,
      h('summary', null, '多角色語音工作室'),
      h(
        'div',
        { className: 'dts-sub' },
        '各角色填音色 ID；空白沿用第一列音色。自動模式在模型支援時使用原生對話，其他情況逐段合成並合併。每次合成都可能計費。',
      ),
      field(
        '多角色合成模式',
        h(
          'select',
          { className: 'dts-input', value: mode, onChange: (e) => setMode(e.target.value) },
          [
            ['auto', '自動選擇'],
            ['native', '只用原生對話'],
            ['segments', '逐段合成'],
          ].map(([v, label]) => h('option', { value: v, key: v }, label)),
        ),
      ),
      speakers.map((s, i) =>
        h(
          'div',
          { key: s.id },
          field(
            '角色 ' + s.id + ' 音色 ID',
            h('input', {
              className: 'dts-input',
              value: s.voice,
              placeholder: first.voice || '音色 ID',
              onChange: (e) =>
                setSpeakers((list) => list.map((item, n) => (n === i ? { ...item, voice: e.target.value } : item))),
            }),
          ),
          cap?.reference
            ? field(
                '角色 ' + s.id + ' 參考錄音',
                h(
                  'select',
                  {
                    className: 'dts-input',
                    'aria-label': '角色 ' + s.id + ' 參考錄音',
                    value: s.referenceAsset || '',
                    onChange: (e) =>
                      setSpeakers((list) =>
                        list.map((item, n) =>
                          n === i ? { ...item, referenceAsset: e.target.value || undefined } : item,
                        ),
                      ),
                  },
                  h('option', { value: '' }, '沿用服務／候選設定'),
                  referenceAssets.map((a) => h('option', { key: a.id, value: a.id }, a.name)),
                ),
              )
            : null,
        ),
      ),
      turns.map((turn, i) =>
        h(
          'div',
          { key: i, className: 'dts-field' },
          h(
            'select',
            {
              className: 'dts-input',
              'aria-label': '第 ' + (i + 1) + ' 段角色',
              value: turn.speaker,
              onChange: (e) =>
                setTurns((list) => list.map((item, n) => (n === i ? { ...item, speaker: e.target.value } : item))),
            },
            speakers.map((s) => h('option', { value: s.id, key: s.id }, s.id)),
          ),
          h('textarea', {
            className: 'dts-input',
            'aria-label': '第 ' + (i + 1) + ' 段台詞',
            value: turn.text,
            rows: 2,
            onChange: (e) =>
              setTurns((list) => list.map((item, n) => (n === i ? { ...item, text: e.target.value } : item))),
          }),
          h('input', {
            className: 'dts-input',
            'aria-label': '第 ' + (i + 1) + ' 段語氣',
            placeholder: '語氣提示（模型需支援）',
            value: turn.instruction,
            onChange: (e) =>
              setTurns((list) => list.map((item, n) => (n === i ? { ...item, instruction: e.target.value } : item))),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: turns.length <= 1,
              onClick: () => setTurns((list) => list.filter((_, n) => n !== i)),
            },
            '移除此段',
          ),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: turns.length >= 100,
          onClick: () => setTurns((list) => [...list, { speaker: 'A', text: '', instruction: '' }]),
        },
        '新增台詞',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: speakers.length >= 16,
          onClick: () => setSpeakers((list) => [...list, { id: String.fromCharCode(65 + list.length), voice: '' }]),
        },
        '新增角色',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run('dialogue') },
        busy ? '合成中…' : '合成並試聽對話',
      ),
      result
        ? h(
            'div',
            { className: 'dts-sub' },
            '完成：' +
              (result.dialogueMode || 'SSML') +
              (result.duration ? ' · ' + result.duration.toFixed(2) + ' 秒' : '') +
              '；可使用播放器重播與匯出。',
          )
        : null,
    ),
    ['polly', 'inworld'].includes(first.provider)
      ? h(ProviderOperationsPanel, { provider: first.provider, key: first.provider })
      : null,
    error ? h('div', { role: 'alert', className: 'dts-sub' }, error) : null,
  )
}
// ---- 24-cloud-voices.js
function CloudVoicesEditor(props) {
  const h = React.createElement
  const [voices, setVoices] = React.useState([]),
    [candidates, setCandidates] = React.useState([]),
    [services, setServices] = React.useState({})
  const [candidate, setCandidate] = React.useState(''),
    [name, setName] = React.useState(''),
    [asset, setAsset] = React.useState(''),
    [language, setLanguage] = React.useState('zh')
  const [remoteId, setRemoteId] = React.useState(''),
    [consent, setConsent] = React.useState(false),
    [mode, setMode] = React.useState('create')
  const [prefix, setPrefix] = React.useState('DshVoice'),
    [billingMode, setBillingMode] = React.useState('prepaid'),
    [slotConsent, setSlotConsent] = React.useState(false)
  const [requestId, setRequestId] = React.useState(() => crypto.randomUUID()),
    [edits, setEdits] = React.useState({}),
    [confirm, setConfirm] = React.useState({})
  const [testText, setTestText] = React.useState(() =>
    String(props.draft.language || '').startsWith('zh')
      ? '這是雲端音色試聽，請確認這句話能完整播放。'
      : 'This is a cloud voice preview. Please listen to the complete sentence.',
  )
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(''),
    [notice, setNotice] = React.useState('')
  const mounted = React.useRef(true)
  const request = async (method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/voice/cloud', {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      timeoutMs: 125000,
    })
    const d = await r.json()
    if (!r.ok || !d.ok) throw Error(d.error?.message || '雲端音色操作失敗')
    return d
  }
  const load = async () => {
    const d = await request()
    if (mounted.current) {
      setVoices(d.voices || [])
      setCandidates(d.candidates || [])
      setServices(d.services || {})
    }
  }
  React.useEffect(() => {
    mounted.current = true
    load().catch(() => {})
    return () => {
      mounted.current = false
    }
  }, [])
  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      await load().catch(() => {})
      if (mounted.current) setBusy(false)
    }
  }
  const selected = candidates.find((c) => String(c.index) === candidate)
  const unconfirmedVoice = (v) =>
    v.provider === 'minimax' && v.remoteState === 'unknown' && ['idle', 'failed', 'uncertain'].includes(v.operation)
  const act = (action, v, extra = {}) =>
    run(async () => {
      await request('POST', { action, id: v.id, ...extra })
      setNotice(
        action === 'forget'
          ? '已移除本機紀錄，遠端音色保留。'
          : action === 'delete-remote'
            ? '已刪除遠端音色，本機參考錄音保留。'
            : '操作完成；可重新查詢狀態。',
      )
    })
  const state = (v) =>
    ({
      unknown: '狀態未知',
      untrained: '尚未訓練的音色槽',
      available: '服務已建立，可試聽',
      training: '訓練／審核中',
      failed: '訓練失敗',
      blocked: '受限／已停用',
      'upgrade-required': '需升級到 ICL 2.0',
      'verification-required': '需至服務商完成聲音驗證',
      deleted: '遠端已刪除',
    })[v.remoteState] || v.remoteState
  const phase = (v) =>
    ({
      creating: '建立中',
      refreshing: '查詢中',
      renaming: '改名中',
      retraining: '重新訓練中',
      upgrading: '音色升級中',
      'deleting-upload': '刪除遠端錄音中',
      deleting: '刪除中',
      uncertain: '操作結果待確認，請查服務商控制檯',
      failed: '上次操作失敗，請重新查詢',
    })[v.operation] || ''
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-cloud-voices': '1' },
    h('div', { className: 'dts-h' }, '雲端音色與訓練管理'),
    h(
      'div',
      { className: 'dts-sub' },
      '支援 ElevenLabs、Fish Audio、Cartesia、Inworld、DashScope、MiniMax、SiliconFlow、豆包官方端點。先儲存服務列、地域／Workspace 與金鑰，再重新讀取；未完成地域設定的服務列不會列出。建立會上傳錄音，可能使用額度或訓練次數；不會自動建立、重送或試聽。',
    ),
    h(
      'button',
      { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run(load) },
      '重新讀取雲端音色／已儲存服務列',
    ),
    h(
      'details',
      null,
      h('summary', null, '建立／匯入音色'),
      h(
        'label',
        { className: 'dts-field' },
        '雲端音色服務列',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '雲端音色服務列',
            value: candidate,
            disabled: busy,
            onChange: (e) => {
              setCandidate(e.target.value)
              setConsent(false)
              setSlotConsent(false)
              setRemoteId('')
            },
          },
          h('option', { value: '' }, '選擇已儲存的服務列'),
          candidates.map((c) =>
            h(
              'option',
              { key: c.index, value: String(c.index) },
              `第 ${c.index + 1} 列 · ${c.label} · ${c.model} · ${c.credentialRef}`,
            ),
          ),
        ),
      ),
      selected
        ? h(
            'div',
            { className: 'dts-sub' },
            services[selected.provider]?.permissions,
            ' ',
            services[selected.provider]?.note,
          )
        : null,
      selected?.canCreate === false
        ? h(
            'div',
            { className: 'dts-sub' },
            '此模型尚未接入聲音建立契約；請選擇可複製聲音的模型。豆包請選 seed-icl-2.0，SiliconFlow 請選 CosyVoice2。',
          )
        : null,
      h(
        'label',
        { className: 'dts-field' },
        '雲端音色操作',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '雲端音色操作',
            value: mode,
            disabled: busy,
            onChange: (e) => setMode(e.target.value),
          },
          h('option', { value: 'create' }, '從錄音建立'),
          h('option', { value: 'import' }, '匯入已有 voice ID（不再上傳）'),
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '音色紀錄名稱',
        h('input', {
          className: 'dts-input',
          'aria-label': '音色紀錄名稱',
          value: name,
          disabled: busy,
          onChange: (e) => setName(e.target.value),
        }),
      ),
      mode === 'create'
        ? h(
            React.Fragment,
            null,
            selected && services[selected.provider]?.prefix
              ? h(
                  'label',
                  { className: 'dts-field' },
                  'DashScope 音色字首',
                  h('input', {
                    className: 'dts-input',
                    'aria-label': 'DashScope 音色字首',
                    maxLength: 10,
                    value: prefix,
                    disabled: busy,
                    onChange: (e) => setPrefix(e.target.value),
                  }),
                  h(
                    'span',
                    { className: 'dts-sub' },
                    '1–10 個英文字母／數字；服務產生完整 voice ID。此處名稱只作本機標籤。',
                  ),
                )
              : null,
            selected && services[selected.provider]?.slot
              ? h(
                  React.Fragment,
                  null,
                  h(
                    'label',
                    { className: 'dts-field' },
                    '豆包音色計費類型',
                    h(
                      'select',
                      {
                        className: 'dts-input',
                        'aria-label': '豆包音色計費類型',
                        value: billingMode,
                        disabled: busy,
                        onChange: (e) => {
                          setBillingMode(e.target.value)
                          setSlotConsent(false)
                          setRemoteId('')
                        },
                      },
                      h('option', { value: 'prepaid' }, '已購買的預付費 S_ 音色槽'),
                      h('option', { value: 'postpaid' }, '已開通的後付費自訂音色'),
                    ),
                  ),
                  h(
                    'label',
                    { className: 'dts-field' },
                    billingMode === 'prepaid' ? '已購買的 S_ 音色槽' : '後付費自訂 ID（留空自動產生）',
                    h('input', {
                      className: 'dts-input',
                      'aria-label': '豆包註冊音色 ID',
                      value: remoteId,
                      disabled: busy,
                      onChange: (e) => {
                        setRemoteId(e.target.value)
                        setSlotConsent(false)
                      },
                    }),
                  ),
                  billingMode === 'prepaid'
                    ? h(
                        'label',
                        { className: 'dts-field' },
                        h('input', {
                          type: 'checkbox',
                          'aria-label': '確認覆寫已購買的豆包音色槽',
                          checked: slotConsent,
                          disabled: busy,
                          onChange: (e) => setSlotConsent(e.target.checked),
                        }),
                        '確認使用此槽的訓練次數，並替換槽內現有音色。',
                      )
                    : null,
                )
              : null,
            selected && services[selected.provider]?.customId
              ? h(
                  'label',
                  { className: 'dts-field' },
                  '自訂新 voice ID（留空自動產生）',
                  h('input', {
                    className: 'dts-input',
                    'aria-label': '自訂新 voice ID',
                    value: remoteId,
                    disabled: busy,
                    onChange: (e) => setRemoteId(e.target.value),
                  }),
                )
              : null,
            h(
              'label',
              { className: 'dts-field' },
              '建立音色的參考錄音',
              h(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '建立音色的參考錄音',
                  value: asset,
                  disabled: busy,
                  onChange: (e) => {
                    setAsset(e.target.value)
                    setConsent(false)
                  },
                },
                h('option', { value: '' }, '選擇已驗證錄音'),
                (props.referenceAssets || []).map((a) =>
                  h('option', { key: a.id, value: a.id }, a.name + ' · ' + Number(a.duration).toFixed(1) + ' 秒'),
                ),
              ),
            ),
            h(
              'label',
              { className: 'dts-field' },
              '音色語言',
              h('input', {
                className: 'dts-input',
                'aria-label': '音色語言',
                value: language,
                disabled: busy,
                onChange: (e) => setLanguage(e.target.value),
              }),
              h(
                'span',
                { className: 'dts-sub' },
                'Cartesia 必填 zh、en 等；DashScope／豆包可填 zh、en、ja 等；Inworld 可填 zh-CN、en-US 或留空自動判斷。MiniMax 原錄音至少 10 秒；SiliconFlow 逐字稿必填且 ≤30 秒；DashScope 使用 3–30 秒；豆包使用 ≤25 秒，避免服務端截短。',
              ),
            ),
            h(
              'label',
              { className: 'dts-field' },
              h('input', {
                type: 'checkbox',
                'aria-label': '確認上傳錄音建立雲端音色',
                checked: consent,
                disabled: busy,
                onChange: (e) => setConsent(e.target.checked),
              }),
              '我有此錄音的使用授權，並確認上傳至所選服務建立音色。',
            ),
          )
        : h(
            'label',
            { className: 'dts-field' },
            '既有遠端 voice ID',
            h('input', {
              className: 'dts-input',
              'aria-label': '既有遠端 voice ID',
              value: remoteId,
              disabled: busy,
              onChange: (e) => setRemoteId(e.target.value),
            }),
          ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled:
            busy ||
            !props.writable ||
            !selected ||
            !name.trim() ||
            (mode === 'create'
              ? !asset ||
                !consent ||
                selected.canCreate === false ||
                (selected.provider === 'doubao' && billingMode === 'prepaid' && (!remoteId || !slotConsent))
              : !remoteId.trim()) ||
            voices.some((v) => v.id === requestId),
          onClick: () =>
            run(async () => {
              await request('POST', {
                action: mode,
                id: requestId,
                candidateIndex: selected.index,
                name,
                referenceAsset: asset,
                language,
                remoteId,
                prefix,
                billingMode,
                slotConfirmed: slotConsent,
                uploadConfirmed: consent,
              })
              setRequestId(crypto.randomUUID())
              setConsent(false)
              setSlotConsent(false)
              setNotice('音色紀錄已建立；請確認服務狀態後再試聽。')
            }),
        },
        mode === 'create' ? '上傳並建立音色' : '查詢並匯入既有音色',
      ),
      voices.some((v) => v.id === requestId)
        ? h(
            'div',
            { className: 'dts-sub' },
            '此請求已有紀錄，請先處理下方紀錄，避免重複建立。',
            h(
              'button',
              {
                type: 'button',
                className: 'dts-btn',
                disabled: busy,
                onClick: () => {
                  setRequestId(crypto.randomUUID())
                  setConsent(false)
                },
              },
              '開始另一筆獨立請求',
            ),
          )
        : null,
    ),
    voices.length
      ? h(
          'label',
          { className: 'dts-field' },
          '雲端音色試聽文字',
          h('textarea', {
            className: 'dts-input',
            'aria-label': '雲端音色試聽文字',
            rows: 2,
            maxLength: 1000,
            value: testText,
            onChange: (e) => setTestText(e.target.value),
          }),
        )
      : null,
    voices.map((v) =>
      h(
        'div',
        { className: 'dts-entry', key: v.id, style: { overflowWrap: 'anywhere' } },
        h(
          'div',
          { className: 'dts-sub' },
          `${v.name} · ${services[v.provider]?.label || v.provider} · ${v.model} · ${v.credentialRef}`,
        ),
        h('div', null, state(v) + '；' + (v.verifiedAt ? '曾成功合成：' + v.verifiedAt : '尚未成功合成試聽')),
        phase(v) ? h('div', { className: 'dts-sub' }, phase(v)) : null,
        v.activation
          ? h(
              'div',
              { className: 'dts-sub' },
              {
                pending: '尚未正式啟用；首次正式合成可能產生複製／音色轉正費。',
                active: '已正式啟用。',
                unlisted: '清單未列出；不能據此判定已刪除，請至服務控制檯核對。',
              }[v.activation] || v.activation,
              v.expiresAt ? ' 未啟用保留期限約至 ' + v.expiresAt : '',
            )
          : null,
        Number.isInteger(v.availableTrainingTimes)
          ? h('div', { className: 'dts-sub' }, '服務回報剩餘訓練次數：' + v.availableTrainingTimes)
          : null,
        v.activation === 'pending' || unconfirmedVoice(v)
          ? h(
              'label',
              { className: 'dts-field' },
              h('input', {
                type: 'checkbox',
                'aria-label': '確認啟用音色 ' + v.name,
                checked: confirm[v.id + ':activation'] || false,
                onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':activation']: e.target.checked })),
              }),
              unconfirmedVoice(v)
                ? '服務尚未確認此 ID 可用；仍要嘗試正式合成，成功時可能收取複製啟用費。'
                : '確認合成或套用此音色可能觸發正式啟用費。',
            )
          : null,
        h('div', { className: 'dts-sub' }, 'Voice ID：' + (v.remoteId || '尚未取得，請至服務商控制檯查詢')),
        !v.remoteId
          ? h(
              'label',
              { className: 'dts-field' },
              '補登 ' + v.name + ' 的 voice ID',
              h('input', {
                className: 'dts-input',
                value: edits[v.id + ':id'] || '',
                onChange: (e) => setEdits((p) => ({ ...p, [v.id + ':id']: e.target.value })),
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !edits[v.id + ':id'],
                  onClick: () => act('attach', v, { remoteId: edits[v.id + ':id'] }),
                },
                '查詢並補登 ID',
              ),
            )
          : null,
        v.remoteId && v.remoteState !== 'deleted'
          ? h(
              React.Fragment,
              null,
              h(
                'button',
                { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => act('refresh', v) },
                '查詢 ' + v.name + ' 狀態',
              ),
              h(
                'label',
                { className: 'dts-field' },
                (services[v.provider]?.rename === false ? '本機標籤 ' : '遠端名稱 ') + v.name,
                h('input', {
                  className: 'dts-input',
                  'aria-label': (services[v.provider]?.rename === false ? '本機標籤 ' : '遠端名稱 ') + v.name,
                  value: edits[v.id] ?? v.name,
                  onChange: (e) => setEdits((p) => ({ ...p, [v.id]: e.target.value })),
                }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !props.writable,
                  onClick: () =>
                    act(services[v.provider]?.rename === false ? 'rename-local' : 'rename', v, {
                      name: edits[v.id] ?? v.name,
                    }),
                },
                '儲存 ' + v.name + (services[v.provider]?.rename === false ? ' 本機標籤' : ' 遠端名稱'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled:
                    busy ||
                    !testText.trim() ||
                    (!unconfirmedVoice(v) && (v.remoteState !== 'available' || v.operation !== 'idle')) ||
                    ((v.activation === 'pending' || unconfirmedVoice(v)) && !confirm[v.id + ':activation']),
                  onClick: () =>
                    run(async () => {
                      stopPlayback()
                      const generation = playbackGeneration,
                        controller = new AbortController()
                      requestController = controller
                      try {
                        const r = await clientFetch('/dsh-sound-atelier/voice/cloud', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'test',
                              id: v.id,
                              text: testText,
                              activationConfirmed: confirm[v.id + ':activation'] === true,
                              unconfirmedVoiceTest: unconfirmedVoice(v),
                            }),
                            signal: controller.signal,
                            timeoutMs: 125000,
                          }),
                          d = await r.json()
                        if (!r.ok || !d.ok) throw Error(d.error?.message || '試聽失敗')
                        if (generation !== playbackGeneration || controller.signal.aborted) return
                        await claimPlayback(player.sessionId, controller.signal)
                        if (generation !== playbackGeneration || controller.signal.aborted) return
                        playAudioItem({
                          kind: 'speech',
                          text: d.text,
                          mime: d.mime,
                          audioBase64: d.audioBase64,
                          sessionId: player.sessionId,
                        })
                        setNotice('已用指定 voice ID 成功合成，試聽可能使用雲端額度。')
                      } finally {
                        if (requestController === controller) requestController = null
                      }
                    }),
                },
                '合成試聽 ' + v.name + '（使用額度）',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled:
                    busy ||
                    v.remoteState !== 'available' ||
                    v.operation !== 'idle' ||
                    (v.activation === 'pending' && !confirm[v.id + ':activation']),
                  onClick: () => {
                    const c = candidates.find((c) => c.binding === v.binding),
                      row = c && props.draft.chain?.[c.index]
                    const defaults = {
                      fish: 'FISH_AUDIO_API_KEY',
                      cartesia: 'CARTESIA_API_KEY',
                      inworld: 'INWORLD_API_KEY',
                      elevenlabs: 'ELEVENLABS_API_KEY',
                      minimax: 'MINIMAX_API_KEY',
                      dashscope: 'DASHSCOPE_API_KEY',
                      siliconflow: 'SILICONFLOW_API_KEY',
                      doubao: 'DOUBAO_API_KEY',
                    }
                    let backendMatches = true
                    if (v.provider === 'dashscope')
                      backendMatches =
                        !row?.baseUrl &&
                        v.backend ===
                          `https://${props.draft.dashscopeWorkspace || ''}.${props.draft.dashscopeRegion || 'cn-beijing'}.maas.aliyuncs.com/api/v1`
                    else if (v.provider === 'minimax' || v.provider === 'siliconflow')
                      backendMatches =
                        v.backend ===
                        (
                          row?.baseUrl ||
                          props.draft[v.provider + 'BaseUrl'] ||
                          (v.provider === 'minimax' ? 'https://api.minimax.io/v1' : 'https://api.siliconflow.cn/v1')
                        ).replace(/\/+$/, '')
                    else if (v.provider === 'doubao') {
                      const url =
                        row?.baseUrl ||
                        props.draft.doubaoBaseUrl ||
                        'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
                      backendMatches =
                        /^https:\/\/openspeech\.bytedance\.com\/api\/v3\/tts\/unidirectional(?:\/sse)?\/?$/.test(url)
                    } else backendMatches = !row?.baseUrl
                    if (
                      !row ||
                      !backendMatches ||
                      row.provider !== v.provider ||
                      (row.model && row.model !== v.model) ||
                      (row.keyEnv || props.draft[v.provider + 'KeyEnv'] || defaults[v.provider]) !== v.credentialRef
                    ) {
                      setError('請儲存服務列並重新讀取，讓音色與原服務／模型／金鑰槽／地域一致。')
                      return
                    }
                    try {
                      const options = {
                        ...JSON.parse(props.draft.providerOptions || '{}')[v.provider],
                        ...JSON.parse(row.options || '{}'),
                      }
                      if (v.provider === 'fish' && (options.referencePath || options.referenceIds)) {
                        setError('此 Fish 服務列仍指定其他參考音訊／多音色 ID，請先清除那些選項後再套用永久音色。')
                        return
                      }
                    } catch {
                      setError('請先修正合成參數 JSON。')
                      return
                    }
                    if (v.provider === 'siliconflow') props.setTop('siliconflowVoiceMode', 'preset')
                    if (v.provider === 'minimax') props.setTop('minimaxTransport', 'http')
                    props.setTop(
                      'chain',
                      props.draft.chain.map((r, i) =>
                        i === c.index ? { ...r, voice: v.remoteId, referenceAsset: '' } : r,
                      ),
                    )
                    setNotice('已填入原服務列的 voice ID；請儲存設定後使用。')
                  },
                },
                '將 ' + v.name + ' 填入服務列',
              ),
              v.provider === 'dashscope' || (v.provider === 'doubao' && v.billingMode === 'prepaid')
                ? h(
                    'details',
                    null,
                    h('summary', null, '更換 ' + v.name + ' 參考錄音／重新訓練'),
                    h(
                      'label',
                      { className: 'dts-field' },
                      '新參考錄音 ' + v.name,
                      h(
                        'select',
                        {
                          className: 'dts-input',
                          'aria-label': '新參考錄音 ' + v.name,
                          value: edits[v.id + ':asset'] || '',
                          disabled: busy,
                          onChange: (e) => {
                            setEdits((p) => ({ ...p, [v.id + ':asset']: e.target.value }))
                            setConfirm((p) => ({ ...p, [v.id + ':replace']: false }))
                          },
                        },
                        h('option', { value: '' }, '選擇已驗證錄音'),
                        (props.referenceAssets || []).map((a) => h('option', { key: a.id, value: a.id }, a.name)),
                      ),
                    ),
                    h(
                      'label',
                      null,
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認重新訓練 ' + v.name,
                        checked: confirm[v.id + ':replace'] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':replace']: e.target.checked })),
                      }),
                      '確認上傳此錄音覆寫原音色，可能使用訓練次數／額度；原合成驗證將失效。',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !edits[v.id + ':asset'] || !confirm[v.id + ':replace'],
                        onClick: () =>
                          act('replace-reference', v, {
                            referenceAsset: edits[v.id + ':asset'],
                            confirmRemoteId: v.remoteId,
                            uploadConfirmed: true,
                            language,
                          }),
                      },
                      '上傳並重新訓練 ' + v.name,
                    ),
                  )
                : null,
              services[v.provider]?.delete === false
                ? h(
                    'div',
                    { className: 'dts-sub' },
                    '此服務未接遠端改名／刪除介面；本機標籤及忘記紀錄不會改動雲端音色。',
                  )
                : h(
                    React.Fragment,
                    null,
                    h(
                      'label',
                      { className: 'dts-field' },
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認刪除遠端 ' + v.name,
                        checked: confirm[v.id] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id]: e.target.checked })),
                      }),
                      '確認永久刪除遠端音色 ' + v.remoteId,
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !confirm[v.id],
                        onClick: () => act('delete-remote', v, { confirmRemoteId: v.remoteId }),
                      },
                      '永久刪除遠端 ' + v.name,
                    ),
                  ),
              v.provider === 'doubao' && v.remoteState === 'upgrade-required'
                ? h(
                    'div',
                    null,
                    h(
                      'label',
                      null,
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認升級豆包 ' + v.name,
                        checked: confirm[v.id + ':upgrade'] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':upgrade']: e.target.checked })),
                      }),
                      '確認將此音色升級至 ICL 2.0',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !confirm[v.id + ':upgrade'],
                        onClick: () => act('upgrade', v, { confirmRemoteId: v.remoteId }),
                      },
                      '升級 ' + v.name + ' 至 ICL 2.0',
                    ),
                  )
                : null,
            )
          : null,
        v.provider === 'minimax' && v.uploadFileId
          ? h(
              'div',
              { className: 'dts-sub' },
              '遠端原始錄音 file ID：' + v.uploadFileId + '（與音色、本機錄音分開管理）',
              h(
                'label',
                null,
                h('input', {
                  type: 'checkbox',
                  'aria-label': '確認刪除上傳檔案 ' + v.name,
                  checked: confirm[v.id + ':upload'] || false,
                  onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':upload']: e.target.checked })),
                }),
                '確認刪除此遠端上傳錄音',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !props.writable || !confirm[v.id + ':upload'],
                  onClick: () => act('delete-upload', v, { confirmFileId: v.uploadFileId }),
                },
                '刪除 ' + v.name + ' 遠端上傳錄音',
              ),
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'dts-btn',
            disabled: busy,
            onClick: () => setConfirm((p) => ({ ...p, [v.id + ':forget']: !p[v.id + ':forget'] })),
          },
          '僅移除 ' + v.name + ' 本機紀錄',
        ),
        confirm[v.id + ':forget']
          ? h(
              'div',
              { className: 'dts-sub' },
              '遠端音色及參考錄音都會保留。',
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy,
                  onClick: () => act('forget', v, { confirm: true }),
                },
                '確認僅移除本機紀錄',
              ),
            )
          : null,
      ),
    ),
    busy ? h('div', { role: 'status' }, '雲端音色處理中…') : null,
    error ? h('div', { role: 'alert' }, error) : null,
    notice ? h('div', { role: 'status' }, notice) : null,
  )
}
// ---- 25-local-engines.js
function LocalStudioManager(props) {
  // 所在分頁沒有顯示時不輪詢（分頁以 hidden 切換，元件一直掛載）。
  const activeRef = React.useRef(true)
  activeRef.current = props.active !== false
  const h = React.createElement,
    d = props.draft,
    set = props.setTop
  const [models, M] = React.useState([]),
    [jobs, J] = React.useState([]),
    [report, R] = React.useState(null),
    [usage, U] = React.useState(null),
    [error, E] = React.useState(''),
    [busy, B] = React.useState(false),
    [file, F] = React.useState(null),
    [trusted, T] = React.useState(false),
    [registry, V] = React.useState(''),
    [packs, P] = React.useState([]),
    [renames, N] = React.useState({}),
    [backend, K] = React.useState('xinference'),
    [device, D] = React.useState('cu128')
  const req = async (path, method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/' + path, {
        method,
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
        timeoutMs: 600000,
      }),
      v = await r.json()
    if (!r.ok || !v.ok) throw Error(v.error?.message || '操作失敗')
    return v
  }
  const refresh = async () => {
    const [m, j] = await Promise.all([req('voice/models'), req('maintenance')])
    M(m.models)
    J(j.jobs)
  }
  React.useEffect(() => {
    let mounted = true
    const load = () => {
      if (mounted) refresh().catch(() => {})
    }
    load()
    req('usage')
      .then(U)
      .catch(() => {})
    const timer = setInterval(() => document.hidden || !activeRef.current || load(), 3000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])
  const run = async (fn) => {
    B(true)
    E('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      E(e.message)
    } finally {
      B(false)
    }
  }
  const job = (action, extra = {}) => run(() => req('maintenance', 'POST', { action, ...extra }))
  const select = (key, label, options, fallback = '') =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: d[key] ?? fallback,
          disabled: !props.writable,
          onChange: (e) => set(key, e.target.value),
        },
        options.map(([value, text]) => h('option', { key: value, value }, text)),
      ),
    )
  const field = (key, label) =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: d[key] || '',
        disabled: !props.writable,
        onChange: (e) => set(key, e.target.value),
      }),
    )
  const button = (label, fn, disabled = false) =>
    h('button', { type: 'button', className: 'dts-btn', disabled: busy || disabled, onClick: fn }, label)
  const download = async (path, name) => {
    const r = await clientFetch('/dsh-sound-atelier/' + path, { timeoutMs: 600000 })
    if (!r.ok) throw Error('匯出失敗')
    const url = URL.createObjectURL(await r.blob()),
      a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-stage3': '1' },
    h('div', { className: 'dts-h' }, '本機工作室與診斷'),
    props.boolField(
      'adaptiveChunks',
      '依合成速度調整分段大小',
      '先以短片段起播，再依實測延遲校準；不另外呼叫雲端服務。',
    ),
    select(
      'textMode',
      '朗讀文字模式',
      [
        ['clean', '整理 Markdown'],
        ['raw', '原始文字（自動朗讀／API）；畫面選取依可見文字'],
      ],
      'clean',
    ),
    props.boolField('approvalInterrupt', '收到批准要求時中斷朗讀', '關閉時排入現有語音後方。'),
    props.boolField('announceApprovalDecided', '批准決定後語音提示', '僅在播放器閒置時播報，避免打斷回覆。'),
    field('approvalDecidedText', '批准決定提示文字'),
    h(
      'details',
      null,
      h('summary', null, '第一次使用：獨立環境與連線'),
      h(
        'ol',
        null,
        h('li', null, '選環境及裝置，安裝會下載 Python 套件與必要推理資源。'),
        h('li', null, '儲存本機服務設定，啟動 Xinference，再建立本機專用帳號。'),
        h('li', null, '載入需要的模型，選參考錄音，完成真實試聽。模型和權重均與插件分開。'),
      ),
      h(
        'label',
        null,
        '環境',
        h(
          'select',
          { 'aria-label': '安裝環境', value: backend, onChange: (e) => K(e.target.value) },
          ['xinference', 'kokoro', 'dots', 'rvc', 'rvc-portable', 'index-cache'].map((v) =>
            h('option', { key: v, value: v }, v),
          ),
        ),
      ),
      h(
        'label',
        null,
        '裝置',
        h(
          'select',
          { 'aria-label': '安裝裝置', value: device, onChange: (e) => D(e.target.value) },
          h('option', { value: 'cpu' }, 'CPU'),
          h('option', { value: 'cu128' }, 'NVIDIA CUDA 12.8'),
        ),
      ),
      button('準備獨立環境（下載）', () => job('install', { backend, device })),
      button('建立／檢查本機帳號', () => job('provision')),
      h(
        'div',
        { className: 'dts-sub' },
        '帳密與音訊 API Key 由本機產生，以 Windows DPAPI 儲存；既有外部帳號不會被取代。插件開源釋出時不會包含環境、模型或憑證。',
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '原生 dots / Index 進階模式'),
      select(
        'localTtsDevice',
        '原生推理裝置',
        [
          ['cpu', 'CPU'],
          ['cuda:0', '第一張 NVIDIA GPU'],
        ],
        'cpu',
      ),
      select(
        'localTtsNativeModel',
        'dots 檢查點',
        ['base', 'soar', 'mf', 'mf-2steps', 'mf-1step', 'mf-2steps-stts'].map((v) => ['dots-studio/dots.tts-' + v, v]),
        'dots-studio/dots.tts-mf',
      ),
      field('localTtsModelPath', 'Index 模型資料夾（空白用標準快取）'),
      props.boolField('localTtsNativeTrusted', '信任 Index 模型／設定檔', '只有可信來源的模型才可載入。'),
      select('localTtsEmotionAsset', 'Index 情緒參考錄音', [
        ['', '不用獨立情緒錄音'],
        ...(props.assets || []).map((a) => [a.id, a.name]),
      ]),
      h(
        'div',
        { className: 'dts-sub' },
        '先在上方服務類型選原生模式並儲存。Index 可獨立使用聲線及情緒錄音；情緒音訊、向量與文字三擇一。dots 固定步數模型使用自己的取樣設定。GPT-SoVITS 可在進階參數 local-tts.native 調整取樣、切句、批次及快取；不支援自由文字語氣欄位。',
      ),
      button('載入原生模型', () => job('native-load')),
      button('解除安裝原生模型', () => run(() => req('local/native', 'POST', { action: 'stop' }))),
    ),
    h(
      'details',
      null,
      h('summary', null, 'RVC 聲線轉換與可攜音色包'),
      props.boolField('rvcEnabled', '合成後套用 RVC', '適用所有回傳完整音訊的 Provider；轉換後時間戳會清除。'),
      props.boolField('rvcBypassOnFailure', 'RVC 失敗時播放原始合成語音', '不重新送文字給其他服務；關閉時回報錯誤。'),
      props.boolField('rvcManaged', '由插件管理 RVC 服務', '關閉時連線外部服務，不會代為停止其程式。'),
      field('rvcBaseUrl', 'RVC 本機服務地址'),
      select(
        'rvcDevice',
        'RVC 裝置',
        [
          ['cpu', 'CPU'],
          ['cuda:0', '第一張 NVIDIA GPU'],
        ],
        'cpu',
      ),
      select('rvcModelAsset', 'RVC 模型', [
        ['', '請選擇'],
        ...models.filter((m) => m.kind === 'pth').map((m) => [m.id, m.name]),
      ]),
      select('rvcIndexAsset', 'RVC 索引', [
        ['', '不用索引'],
        ...models.filter((m) => m.kind === 'index').map((m) => [m.id, m.name]),
      ]),
      field('rvcOptions', 'RVC 參數 JSON'),
      h(
        'div',
        { className: 'dts-sub' },
        '支援變調 f0_up_key、音高演演算法 f0_method、索引混合 index_rate、音量 rms_mix_rate、保護 protect 等。無索引時自動設 index_rate=0。',
      ),
      h(
        'label',
        null,
        h('input', {
          type: 'checkbox',
          'aria-label': '信任音色模型來源',
          checked: trusted,
          onChange: (e) => T(e.target.checked),
        }),
        '我信任此音色模型來源（.pth 可能包含可執行 pickle；匯入不會立即執行）',
      ),
      h('input', {
        type: 'file',
        accept: '.pth,.index,.zip',
        'aria-label': '音色模型檔案',
        onChange: (e) => F(e.target.files[0] || null),
      }),
      button(
        '匯入模型／索引／音色包',
        () =>
          run(async () => {
            if (!file) throw Error('請選檔案')
            const kind = file.name.split('.').pop().toLowerCase()
            if (!['pth', 'index', 'zip'].includes(kind)) throw Error('不支援的檔案格式')
            const r = await clientFetch(
                '/dsh-sound-atelier/voice/models?' + new URLSearchParams({ kind, name: file.name, trusted: String(trusted) }),
                { method: 'POST', body: file, timeoutMs: 600000 },
              ),
              v = await r.json()
            if (!r.ok || !v.ok) throw Error(v.error?.message || '匯入失敗')
          }),
        !file || !trusted,
      ),
      button('啟動 RVC', () => job('rvc-start')),
      button('載入選定 RVC 模型', () => job('rvc-load')),
      button('停止插件管理的 RVC', () => run(() => req('local/rvc', 'POST', { action: 'stop' }))),
      button(
        '匯出選定音色 ZIP',
        () =>
          run(() =>
            download(
              'voice/pack?' + new URLSearchParams({ model: d.rvcModelAsset || '', index: d.rvcIndexAsset || '' }),
              'dsh-tts-voicepack.zip',
            ),
          ),
        !d.rvcModelAsset,
      ),
      button(
        '壓縮目前索引至 20000 向量',
        () => job('compact-index', { id: d.rvcIndexAsset, targetVectors: 20000 }),
        !d.rvcIndexAsset,
      ),
      models.map((m) =>
        h(
          'div',
          { className: 'dts-entry', key: m.id },
          h(
            'div',
            null,
            m.kind +
              ' · ' +
              (m.verifiedAt ? '曾成功轉換' : '尚未驗證推理') +
              ' · ' +
              Math.round(m.bytes / 1024) +
              ' KiB',
          ),
          h('input', {
            className: 'dts-input',
            'aria-label': '模型名稱 ' + m.name,
            value: renames[m.id] ?? m.name,
            onChange: (e) => N((p) => ({ ...p, [m.id]: e.target.value })),
          }),
          button('儲存 ' + m.name, () =>
            run(() => req('voice/models', 'PATCH', { id: m.id, name: renames[m.id] ?? m.name })),
          ),
          button('刪除本機 ' + m.name, () =>
            run(async () => {
              await req('voice/models', 'DELETE', { id: m.id })
              if (d.rvcModelAsset === m.id) set('rvcModelAsset', '')
              if (d.rvcIndexAsset === m.id) set('rvcIndexAsset', '')
            }),
          ),
        ),
      ),
      h(
        'label',
        null,
        '公開 Registry manifest URL',
        h('input', {
          className: 'dts-input',
          'aria-label': '音色 Registry URL',
          value: registry,
          onChange: (e) => V(e.target.value),
        }),
      ),
      button('讀取音色目錄', () => run(async () => P((await req('voice/registry', 'POST', { url: registry })).packs))),
      packs.map((p) =>
        h(
          'div',
          { className: 'dts-entry', key: p.id },
          p.name + ' · ' + p.license,
          button(
            '安裝 ' + p.name,
            () => job('install-pack', { url: registry, packId: p.id, indexId: null, trusted }),
            !trusted,
          ),
          ...(p.indexes || []).map((i) =>
            button(
              '安裝 ' + p.name + ' / ' + (i.name || i.id),
              () => job('install-pack', { url: registry, packId: p.id, indexId: i.id, trusted }),
              !trusted,
            ),
          ),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '背景工作與取消'),
      jobs.map((j) =>
        h(
          'div',
          { className: 'dts-entry', key: j.id },
          j.kind + ' · ' + j.state,
          j.error ? h('div', { role: 'alert' }, j.error) : null,
          j.result ? h('pre', { style: { whiteSpace: 'pre-wrap' } }, JSON.stringify(j.result, null, 2)) : null,
          j.lines?.length
            ? h('pre', { style: { maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap' } }, j.lines.join('\n'))
            : null,
          ['running', 'cancelling'].includes(j.state)
            ? button('取消 ' + j.kind, () => run(() => req('maintenance', 'DELETE', { id: j.id })))
            : null,
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '一鍵診斷與用量估算'),
      button('產生唯讀診斷', () => run(async () => R((await req('diagnostics')).report))),
      report
        ? h(
            'pre',
            { style: { maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' } },
            JSON.stringify(report, null, 2),
          )
        : null,
      button('下載診斷 JSON', () => run(() => download('diagnostics', 'dsh-tts-diagnostics.json'))),
      button('更新本月用量估算', () => run(async () => U(await req('usage')))),
      h(
        'div',
        { className: 'dts-sub' },
        '用量僅記錄本插件提交的字元數，快取不重算；Google 按聲音層級分類。不含其他程式用量，不能取代服務商帳單。',
      ),
      usage
        ? h(
            'pre',
            { style: { maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' } },
            JSON.stringify(usage, null, 2),
          )
        : null,
    ),
    error ? h('div', { role: 'alert' }, error) : null,
  )
}

function LocalEnginesEditor(props) {
  const activeRef = React.useRef(true)
  activeRef.current = props.active !== false
  const h = React.createElement,
    draft = props.draft || {},
    setTop = props.setTop
  const [assets, setAssets] = React.useState([]),
    [status, setStatus] = React.useState({}),
    [error, setError] = React.useState(''),
    [result, setResult] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  const [file, setFile] = React.useState(null),
    [name, setName] = React.useState(''),
    [transcript, setTranscript] = React.useState(''),
    [renames, setRenames] = React.useState({})
  const [modelName, setModelName] = React.useState('Kokoro-82M'),
    [uid, setUid] = React.useState('kokoro-local'),
    [gpus, setGpus] = React.useState(0)
  const mounted = React.useRef(true),
    fileInput = React.useRef(null)
  const request = async (path, method = 'GET', body) => {
    const r = await clientFetch(path, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      timeoutMs: 310000,
    })
    const d = await r.json()
    if (!r.ok || !d.ok) throw Error(d.error?.message || d.error || '操作失敗')
    return d
  }
  const loadAssets = async () => {
    const d = await request('/dsh-sound-atelier/voice/assets')
    if (mounted.current) {
      setAssets(d.assets || [])
      props.onAssets?.(d.assets || [])
    }
  }
  const loadStatus = async () => {
    const d = await request('/dsh-sound-atelier/local/service')
    if (mounted.current) setStatus(d.kokoro || {})
  }
  React.useEffect(() => {
    mounted.current = true
    loadAssets().catch(() => {})
    loadStatus().catch(() => {})
    const timer = setInterval(() => document.hidden || !activeRef.current || loadStatus().catch(() => {}), 5000)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [])
  const run = async (action) => {
    if (busy) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      await action()
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const upload = () =>
    run(async () => {
      if (!file || file.size > 10 * 1024 * 1024) throw Error('請選擇不超過 10 MiB 的錄音檔。')
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
      await request('/dsh-sound-atelier/voice/assets', 'POST', { name: name || file.name, transcript, sample: btoa(binary) })
      await loadAssets()
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setName('')
      setTranscript('')
      setResult('錄音已透過解碼檢查，可作為參考；尚未訓練或建立遠端聲音。')
    })
  const operate = (action, input) =>
    run(async () => {
      if (action === 'launch') {
        await request('/dsh-sound-atelier/maintenance', 'POST', { action, input })
        setResult('背景載入已開始；可在背景工作面板檢視或取消。')
        return
      }
      const d = await request('/dsh-sound-atelier/local/service', 'POST', { action, input }),
        r = d.result || {}
      if (Array.isArray(r.data))
        setResult(
          r.data.length
            ? '已載入模型：\n' + r.data.map((m) => (m.model_name || m.id) + ' · UID: ' + m.id).join('\n')
            : '目前沒有已載入模型。',
        )
      else if (r.model_uid) setResult('模型已載入：' + r.model_uid + '。請再試聽驗證合成。')
      else if (r.unloaded) setResult('模型已解除安裝，權重檔案保留。')
      else if (r.state)
        setResult(
          '狀態：' +
            ({
              unloaded: '已解除安裝',
              loaded: '模型已載入，尚未驗證合成',
              verified: '已成功合成',
              running: '服務已啟動',
              external: '偵測到既有服務，不接管其程式',
              stopped: '服務已停止',
              'auth-required': '服務已啟動，請確認帳號連線設定',
            }[r.state] || r.state),
        )
      else setResult('操作完成。')
      await loadStatus()
    })
  const input = (key, label, placeholder) =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: draft[key] || '',
        placeholder,
        disabled: !props.writable,
        onChange: (e) => setTop(key, e.target.value),
      }),
    )
  const familyOptions = [
    ['', '依模型 UID 判斷'],
    ['kokoro', 'Kokoro'],
    ['f5', 'F5-TTS'],
    ['qwen3', 'Qwen3-TTS'],
    ['index2', 'IndexTTS2'],
    ['index2.5', 'IndexTTS 2.5'],
    ['breeze', 'Breeze-TTS-2'],
    ['fish', 'Fish S2 / FishSpeech'],
    ['irodori', 'Irodori'],
    ['cosyvoice', 'CosyVoice'],
    ['generic', '基本 Speech API'],
  ]
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-local': '1' },
    h('div', { className: 'dts-h' }, '本機模型與參考音色'),
    props.boolField('streamingEnabled', props.t('streamingEnabled'), props.t('streamingEnabledHint')),
    h(
      'div',
      { className: 'dts-sub' },
      '錄音上傳、模型載入、成功產生語音是不同狀態。本機環境與 DSH 分開；雲端服務只有在明確選用該服務合成時才收到參考錄音。變更設定後先儲存。',
    ),
    h(
      'label',
      { className: 'dts-field' },
      '本機服務類型',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '本機服務類型',
          value: draft.localTtsBackend || 'xinference',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsBackend', e.target.value),
        },
        h('option', { value: 'xinference' }, 'Xinference'),
        h('option', { value: 'gpt-sovits' }, 'GPT-SoVITS 原生 API'),
        h('option', { value: 'dots-native' }, 'dots.tts 獨立原生'),
        h('option', { value: 'index-native' }, 'Index 獨立原生（完整情緒）'),
      ),
    ),
    input('localTtsBaseUrl', '本機服務地址', 'http://127.0.0.1:9997'),
    h(
      'label',
      { className: 'dts-field' },
      '閒置多久後釋放本機模型（秒）',
      h('input', {
        className: 'dts-input',
        type: 'number',
        min: 0,
        max: 86400,
        step: 30,
        'aria-label': '閒置多久後釋放本機模型（秒）',
        value: draft.localTtsIdleSeconds ?? 300,
        disabled: !props.writable,
        onChange: (e) => setTop('localTtsIdleSeconds', Math.max(0, Math.min(86400, Number(e.target.value) || 0))),
      }),
      h('span', { className: 'dts-sub' }, '由插件啟動的本機模型閒置超過這個時間就釋放記憶體，下次使用時重新載入。預設 300 秒；0 表示不自動釋放。'),
    ),
    h(
      'label',
      { className: 'dts-field' },
      '本機模型家族',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '本機模型家族',
          value: draft.localTtsFamily || '',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsFamily', e.target.value),
        },
        familyOptions.map(([id, label]) => h('option', { key: id, value: id }, label)),
      ),
    ),
    h(
      'div',
      { className: 'dts-sub' },
      '在降級鏈選「本機 TTS 服務」，模型欄填已啟動的模型 UID；UID 若是自訂名稱，請在此指定家族。各模型的進階參數放在 providerOptions 的 local-tts.native；不會把不支援的欄位偷偷忽略。',
    ),
    draft.localTtsBackend === 'gpt-sovits'
      ? h(
          React.Fragment,
          null,
          input('localTtsPromptLanguage', 'GPT-SoVITS 參考語言', 'zh'),
          input('localTtsLanguage', 'GPT-SoVITS 文字語言', 'auto'),
          h('div', { className: 'dts-sub' }, '需與 DSH 同機執行，直接使用已驗證錄音的本機路徑；參考逐字稿必填。'),
        )
      : null,
    h(
      'label',
      { className: 'dts-field' },
      '目前參考錄音',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '目前參考錄音',
          value: draft.localTtsReferenceAsset || '',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsReferenceAsset', e.target.value),
        },
        h('option', { value: '' }, '不使用參考錄音'),
        assets.map((a) =>
          h('option', { key: a.id, value: a.id }, a.name + ' · ' + Number(a.duration).toFixed(1) + ' 秒'),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '新增／管理參考錄音'),
      h(
        'div',
        {
          className: 'dts-field',
          onDragOver: (e) => e.preventDefault(),
          onDrop: (e) => {
            e.preventDefault()
            setFile(e.dataTransfer.files[0] || null)
          },
        },
        h(
          'label',
          null,
          '參考錄音檔案',
          h('input', {
            type: 'file',
            ref: fileInput,
            accept: 'audio/*',
            'aria-label': '參考錄音檔案',
            disabled: busy,
            onChange: (e) => setFile(e.target.files[0] || null),
          }),
        ),
        h(
          'span',
          { className: 'dts-sub' },
          file ? file.name : '可拖放音訊；會檢查解碼、長度及近乎靜音，不會因上傳完成就標示為已克隆。',
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '錄音名稱',
        h('input', {
          className: 'dts-input',
          'aria-label': '錄音名稱',
          value: name,
          onChange: (e) => setName(e.target.value),
        }),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '錄音逐字稿',
        h('textarea', {
          className: 'dts-input',
          'aria-label': '錄音逐字稿',
          rows: 3,
          value: transcript,
          onChange: (e) => setTranscript(e.target.value),
          placeholder: '填錄音裡實際說出的原話；F5、Qwen、Breeze 等需要。',
        }),
      ),
      h('button', { type: 'button', className: 'dts-btn', disabled: busy || !file, onClick: upload }, '上傳並驗證錄音'),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run(loadAssets) },
        '重新整理錄音與驗證紀錄',
      ),
      assets.map((a) =>
        h(
          'div',
          { className: 'dts-entry', key: a.id },
          h(
            'div',
            { className: 'dts-sub' },
            a.name +
              ' · 已驗證參考檔 · ' +
              Number(a.duration).toFixed(2) +
              ' 秒 · ' +
              (a.bindings?.length ? '已有 ' + a.bindings.length + ' 組合成成功紀錄' : '尚未以模型成功合成'),
          ),
          h('input', {
            className: 'dts-input',
            'aria-label': '重新命名 ' + a.name,
            value: renames[a.id] ?? a.name,
            onChange: (e) => setRenames((v) => ({ ...v, [a.id]: e.target.value })),
          }),
          h('textarea', {
            className: 'dts-input',
            'aria-label': '修改逐字稿 ' + a.name,
            rows: 2,
            value: renames[a.id + ':transcript'] ?? a.transcript ?? '',
            onChange: (e) => setRenames((v) => ({ ...v, [a.id + ':transcript']: e.target.value })),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  await request('/dsh-sound-atelier/voice/assets', 'PATCH', {
                    id: a.id,
                    name: renames[a.id] ?? a.name,
                    transcript: renames[a.id + ':transcript'] ?? a.transcript ?? '',
                  })
                  await loadAssets()
                }),
            },
            '儲存名稱／逐字稿',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  const r = await clientFetch('/dsh-sound-atelier/voice/reference?id=' + encodeURIComponent(a.id))
                  if (!r.ok) throw Error('無法讀取參考音訊')
                  const b = new Uint8Array(await r.arrayBuffer())
                  let text = ''
                  for (let i = 0; i < b.length; i += 32768) text += String.fromCharCode(...b.subarray(i, i + 32768))
                  playAudioItem({
                    kind: 'speech',
                    text: a.name,
                    audioBase64: btoa(text),
                    mime: 'audio/wav',
                    sessionId: player.sessionId,
                  })
                }),
            },
            '播放原始參考',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  await request('/dsh-sound-atelier/voice/assets', 'DELETE', { id: a.id })
                  if (draft.localTtsReferenceAsset === a.id) setTop('localTtsReferenceAsset', '')
                  await loadAssets()
                }),
            },
            '刪除本機錄音',
          ),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, 'Kokoro 獨立 CPU runtime'),
      h(
        'div',
        { className: 'dts-sub' },
        '狀態：' +
          ({
            unloaded: '未載入',
            loading: '載入中',
            loaded: '模型已載入，尚未驗證合成',
            verified: '本次程式已成功合成',
            failed: '失敗',
          }[status.state] || '尚未取得') +
          '；套件：' +
          (status.packageInstalled ? '已安裝' : '未安裝') +
          '。此輕量 runtime 僅英文；中文可使用 Xinference 的中文模型。閒置五分鐘解除安裝，取消正在進行的推理會停止 worker。',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('kokoro-load') },
        '載入 Kokoro（首次下載模型）',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: busy,
          onClick: () =>
            run(async () => {
              await previewSpeech(
                'kokoro',
                '',
                'af_heart',
                'This is a complete local speech test. The final sentence should finish clearly.',
              )
              await loadStatus()
            }),
        },
        'Kokoro 真實合成試聽',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('kokoro-unload') },
        '解除安裝 Kokoro 記憶體',
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, 'Xinference 模型載入／解除安裝'),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('start-service') },
        '啟動本機 Xinference',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('stop-service') },
        '停止由插件啟動的 Xinference',
      ),
      h(
        'div',
        { className: 'dts-sub' },
        '需先準備獨立 Xinference 環境。查詢／合成可用 API Key；模型管理需帳號登入權杖，本機代管連線會分開處理。載入可能下載大型模型，不會自動下載所有模型。清單存在或服務可連線不代表推理已驗證。解除安裝只釋放模型，不刪除權重。',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('list') },
        '查詢已載入模型',
      ),
      h(
        'label',
        { className: 'dts-field' },
        '模型登入名稱',
        h('input', {
          className: 'dts-input',
          'aria-label': '模型登入名稱',
          value: modelName,
          onChange: (e) => setModelName(e.target.value),
        }),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '模型 UID',
        h('input', {
          className: 'dts-input',
          'aria-label': '本機模型 UID',
          value: uid,
          onChange: (e) => setUid(e.target.value),
        }),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '執行裝置',
        h(
          'select',
          { className: 'dts-input', value: gpus, onChange: (e) => setGpus(Number(e.target.value)) },
          h('option', { value: 0 }, 'CPU'),
          h('option', { value: 1 }, '單張 GPU（模型需相容）'),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: busy,
          onClick: () => operate('launch', { name: modelName, uid, gpus }),
        },
        '載入指定模型（可能下載）',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('unload', { uid }) },
        '解除安裝指定模型',
      ),
    ),
    h(LocalStudioManager, { active: props.active, draft, setTop, writable: props.writable, boolField: props.boolField, assets }),
    busy ? h('div', { className: 'dts-sub' }, '處理中…') : null,
    error ? h('div', { role: 'alert' }, error) : null,
    result
      ? h(
          'pre',
          { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 240, overflow: 'auto' } },
          result,
        )
      : null,
  )
}
// ---- 26-pronunciation.js
const CLIENT_IT_TERMS = [
  { from: 'API', to: 'A P I', whole: true, lang: '' },
  { from: 'CLI', to: 'C L I', whole: true, lang: '' },
  { from: 'CPU', to: 'C P U', whole: true, lang: '' },
  { from: 'GPU', to: 'G P U', whole: true, lang: '' },
  { from: 'RAM', to: 'ram', whole: true, lang: '' },
  { from: 'SQL', to: 'sequel', whole: true, lang: '' },
  { from: 'UI', to: 'U I', whole: true, lang: '' },
  { from: 'URL', to: 'U R L', whole: true, lang: '' },
  { from: 'UUID', to: 'U U I D', whole: true, lang: '' },
  { from: 'JSON', to: 'j-son', whole: true, lang: '' },
  { from: 'YAML', to: 'yam-el', whole: true, lang: '' },
  { from: 'HTML', to: 'H T M L', whole: true, lang: '' },
  { from: 'CSS', to: 'C S S', whole: true, lang: '' },
  { from: 'SSH', to: 'S S H', whole: true, lang: '' },
  { from: 'DNS', to: 'D N S', whole: true, lang: '' },
  { from: 'IP', to: 'I P', whole: true, lang: '' },
]

// Pronunciation dictionary editor: rules apply top-down.
function PronEditor(props) {
  const t = props.t || ((key) => key)
  const rows = Array.isArray(props.value) ? props.value : []
  const fileInputRef = React.useRef(null)

  const change = (i, patch) => {
    props.onChange(rows.map((r, k) => (k === i ? Object.assign({}, r, patch) : r)))
  }
  const remove = (i) => props.onChange(rows.filter((_, k) => k !== i))
  const add = () => props.onChange(rows.concat([{ from: '', to: '', whole: false, lang: '' }]))
  const loadIt = () => {
    const existing = new Set(rows.map((r) => String(r.from).toLowerCase()))
    const toAdd = CLIENT_IT_TERMS.filter((r) => !existing.has(String(r.from).toLowerCase()))
    props.onChange(rows.concat(toAdd))
  }

  const exportJson = () => {
    const data = JSON.stringify(rows, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pronunciation-dictionary.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch (alreadyRevoked) {
        /* already revoked */
      }
    }, 1000)
  }

  const triggerImport = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (!Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.alert) window.alert(t('invalidJsonFormat'))
          return
        }
        const importedRules = parsed
          .map((item) => ({
            from: String(item.from || ''),
            to: String(item.to || ''),
            whole: !!item.whole,
            lang: String(item.lang || ''),
          }))
          .filter((r) => r.from || r.to)

        const existingKeys = new Set(rows.map((r) => String(r.from).toLowerCase()))
        const newItems = importedRules.filter((r) => !existingKeys.has(String(r.from).toLowerCase()))
        props.onChange(rows.concat(newItems))
      } catch (err) {
        if (typeof window !== 'undefined' && window.alert) window.alert(t('invalidJsonFormat'))
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return React.createElement(
    'div',
    { className: 'dts-wrap-in' },
    React.createElement('input', {
      type: 'file',
      ref: fileInputRef,
      accept: '.json',
      style: { display: 'none' },
      onChange: handleImportFile,
    }),
    rows.map((rule, i) =>
      React.createElement(
        'div',
        { className: 'dts-row', key: i },
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('pronFrom'),
          value: rule.from || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { from: e.target.value }),
        }),
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('pronTo'),
          value: rule.to || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { to: e.target.value }),
        }),
        React.createElement(
          'label',
          { className: 'dts-sub', title: t('pronWhole') },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!rule.whole,
            disabled: !props.writable,
            onChange: (e) => change(i, { whole: e.target.checked }),
          }),
        ),
        React.createElement('input', {
          className: 'dts-input',
          style: { maxWidth: '70px' },
          placeholder: t('pronLang'),
          value: rule.lang || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { lang: e.target.value }),
        }),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-mini',
            title: t('previewRule'),
            disabled: !props.writable,
            onClick: () => {
              if (props.onPreviewPhrase) props.onPreviewPhrase(rule.to || rule.from)
            },
          },
          '\u25b6',
        ),
        React.createElement(
          'button',
          { type: 'button', className: 'dts-mini', disabled: !props.writable, onClick: () => remove(i) },
          '\u00d7',
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement(
        'button',
        { type: 'button', className: 'dts-mini', disabled: !props.writable, onClick: add },
        '+',
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: loadIt },
        t('loadItDictionary'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: exportJson },
        t('exportJson'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: triggerImport },
        t('importJson'),
      ),
      React.createElement('span', { className: 'dts-sub' }, t('pronHint')),
    ),
  )
}
// ---- 27-roles.js
function RolesEditor(props) {
  const t = props.t || ((key) => key)
  const value = props.value || {}
  const [newRole, setNewRole] = React.useState('')
  const set = (r, patch) => props.onChange(Object.assign({}, value, { [r]: Object.assign({}, value[r] || {}, patch) }))
  const removeRole = (r) => {
    const next = Object.assign({}, value)
    delete next[r]
    props.onChange(next)
  }

  const standardKeys = ['reply', 'approval', 'error']
  const customKeys = Object.keys(value).filter((k) => !standardKeys.includes(k))
  const allKeys = [...standardKeys, ...customKeys]

  const addCustom = () => {
    const name = newRole.trim().toLowerCase()
    if (!name || value[name]) return
    set(name, { provider: '', model: '', voice: '', chime: '', ssmlStyle: '' })
    setNewRole('')
  }

  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement('span', { className: 'dts-sub' }, t('rolesHint')),
    allKeys.map((r) =>
      React.createElement(
        'details',
        { className: 'dts-entry', key: r },
        React.createElement(
          'summary',
          { className: 'dts-h', style: { cursor: 'pointer' } },
          t('role_' + r) !== 'role_' + r ? t('role_' + r) : `👤 ${r}`,
        ),
        React.createElement(
          'select',
          {
            className: 'dts-input',
            value: (value[r] && value[r].provider) || '',
            disabled: !props.writable,
            onChange: (e) => set(r, { provider: e.target.value, model: '', voice: '', style: '' }),
          },
          React.createElement('option', { value: '' }, '—'),
          PROVIDERS.map((p) => React.createElement('option', { key: p, value: p }, providerLabel(t, p))),
        ),
        React.createElement(CatalogPicker, {
          autoSelect: !!value[r]?.provider,
          style: value[r]?.style,
          t,
          provider: value[r]?.provider || props.defaultProvider,
          model: value[r]?.model || '',
          voice: value[r]?.voice || '',
          writable: props.writable,
          catalogEpoch: props.catalogEpoch,
          onChange: (patch) => set(r, patch),
        }),
        React.createElement(
          'label',
          { className: 'dts-row' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!value[r]?.tuningEnabled,
            disabled: !props.writable,
            onChange: (e) =>
              set(r, Object.assign({}, e.target.checked ? props.tuning : {}, { tuningEnabled: e.target.checked })),
          }),
          t('tuneOwn'),
        ),
        React.createElement(TuningBar, {
          t,
          provider: value[r]?.provider || props.defaultProvider,
          model: value[r]?.model || props.defaultModel,
          cosyvoiceMode: props.cosyvoiceMode,
          value: value[r]?.tuningEnabled ? value[r] : props.tuning,
          writable: props.writable && !!value[r]?.tuningEnabled,
          onChange: (patch) => set(r, patch),
          onPreview: (text, tuning) =>
            props.onPreview(
              value[r]?.provider || props.defaultProvider,
              value[r]?.model || (!value[r]?.provider ? props.defaultModel : ''),
              value[r]?.voice || (!value[r]?.provider ? props.defaultVoice : ''),
              text,
              { ...tuning, style: value[r]?.style || props.defaultStyle },
            ),
        }),
        React.createElement('input', {
          className: 'dts-input',
          style: { maxWidth: '90px' },
          placeholder: t('chime'),
          value: (value[r] && value[r].chime) || '',
          disabled: !props.writable,
          onChange: (e) => set(r, { chime: e.target.value }),
        }),
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('ssmlStyle') || 'ssml',
          title: t('ssmlStyleHint') || 'SSML tone style',
          value: (value[r] && value[r].ssmlStyle) || '',
          disabled: !props.writable,
          onChange: (e) => set(r, { ssmlStyle: e.target.value }),
        }),
        !standardKeys.includes(r)
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dts-mini',
                title: t('remove'),
                disabled: !props.writable,
                onClick: () => removeRole(r),
              },
              '\u00d7',
            )
          : null,
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement('input', {
        className: 'dts-input',
        style: { maxWidth: '180px' },
        placeholder: t('newSubagentRole'),
        value: newRole,
        disabled: !props.writable,
        onChange: (e) => setNewRole(e.target.value),
        onKeyDown: (e) => {
          if (e.key === 'Enter') addCustom()
        },
      }),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-save', disabled: !props.writable || !newRole.trim(), onClick: addCustom },
        t('addSubagentRole'),
      ),
    ),
  )
}
// ---- 28-updater.js
function PluginUpdaterBlock(props) {
  const t = props.t || ((key) => key)
  const [status, setStatus] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)
  const [msg, setMsg] = React.useState(null)

  const checkUpdate = React.useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await clientFetch('/api/dsh-sound-atelier/update', {
        headers: { 'x-dsh-plugin-update': '1' },
        timeoutMs: 10000,
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      setMsg({ ok: false, text: (t('updaterFailed') || 'Update check failed: ') + ((e && e.message) || String(e)) })
    } finally {
      setLoading(false)
    }
  }, [t])

  const onUpdateNow = async () => {
    setUpdating(true)
    setMsg(null)
    try {
      const res = await clientFetch('/api/dsh-sound-atelier/update', {
        method: 'POST',
        headers: {
          'x-dsh-plugin-update': '1',
          'content-type': 'application/json',
        },
        timeoutMs: 60000,
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data && (data.error || data.message)) || 'HTTP ' + res.status)
      setStatus(data)
      setMsg({ ok: true, text: t('updaterSuccess') || 'Plugin updated successfully! Please restart DSH service.' })
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || String(e) })
    } finally {
      setUpdating(false)
    }
  }

  React.useEffect(() => {
    checkUpdate()
  }, [checkUpdate])

  const currentVer = (status && status.currentVersion) || '0.4.23'
  const latestVer = status && status.latestVersion
  const updateAvailable = Boolean(status && status.updateAvailable && latestVer && latestVer !== currentVer)
  // 從來源資料夾安裝的版本不提供一鍵更新，只顯示已發布的版本供參考。
  const localFork = Boolean(status && status.localFork)

  return React.createElement(
    'div',
    { className: 'dts-block', style: { gap: '10px' } },
    React.createElement(
      'div',
      {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('span', { className: 'dts-title' }, '🔄 ' + t('updaterTitle')),
        React.createElement(
          'span',
          { className: 'dts-badge ' + (updateAvailable ? 'dts-badge-warn' : 'dts-badge-on') },
          updateAvailable
            ? 'v' + latestVer + ' ' + (t('available') || 'available')
            : 'v' + currentVer + ' (' + t('updaterUpToDate') + ')',
        ),
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '8px' } },
        updateAvailable
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dts-btn',
                style: {
                  borderColor: 'var(--dsw-alias-state-warn-primary)',
                  color: 'var(--dsw-alias-state-warn-primary)',
                },
                onClick: onUpdateNow,
                disabled: updating || loading,
              },
              updating
                ? t('updaterUpdating') || 'Updating…'
                : (t('updaterUpdateNow') || 'Update to v{version}').replace('{version}', latestVer),
            )
          : null,
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-btn',
            onClick: checkUpdate,
            disabled: loading || updating,
          },
          loading ? t('updaterChecking') || 'Checking…' : t('updaterCheck') || 'Check updates',
        ),
      ),
    ),
    localFork
      ? React.createElement(
          'div',
          { className: 'dts-sub' },
          '這是從資料夾安裝的版本，沒有一鍵更新' + (latestVer ? '（已發布的最新版是 v' + latestVer + '）' : '') + '。要更新的話，換上新版資料夾後照安裝說明重新安裝一次。',
        )
      : null,
    msg
      ? React.createElement(
          'div',
          { className: msg.ok ? 'dts-alert dts-alert-ok' : 'dts-alert dts-alert-err' },
          msg.text,
        )
      : null,
  )
}
// ---- 29-packs-chimes-stats.js
function VoicePacksGrid(props) {
  const t = props.t || ((key) => key)
  // 預設依目前主要音色或語言選擇口音。
  const guess = /zh-CN|cmn-CN|zh-Hans/i.test(String(props.currentVoice || '') + ' ' + String(props.language || ''))
    ? 'zh-CN'
    : 'zh-TW'
  const [region, setRegion] = React.useState(guess)
  const onSelect = (pack) => {
    if (!props.writable) return
    props.onApply({
      entry: { provider: pack.provider, model: '', voice: pack.voices[region] },
      rate: pack.rate,
      chime: pack.chime,
      language: region,
    })
  }
  return React.createElement(
    'div',
    { className: 'dts-block', 'data-dsh-tts-packs': '1' },
    React.createElement('div', { className: 'dts-h' }, t('voicePacksTitle')),
    React.createElement(
      'div',
      { className: 'dts-sub' },
      t('voicePacksHint'),
      ' 皆為免金鑰的 Edge 中文音色。套用後只更換主要服務的音色、語速與提示音，備援順序保留；按「' +
        t('save') +
        '」才生效。',
    ),
    React.createElement(
      'div',
      { className: 'dts-row', role: 'group', 'aria-label': '音色口音' },
      VOICE_PACK_REGIONS.map(([id, label]) =>
        React.createElement(
          'button',
          {
            key: id,
            type: 'button',
            className: 'dts-btn',
            'aria-pressed': region === id,
            onClick: () => setRegion(id),
          },
          label,
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row', style: { flexWrap: 'wrap', gap: '8px', marginTop: '6px' } },
      VOICE_PACKS.map((pack) =>
        React.createElement(
          'button',
          {
            key: pack.id,
            type: 'button',
            className: 'dts-btn',
            'aria-pressed': props.currentVoice === pack.voices[region] && Number(props.currentRate) === pack.rate,
            disabled: !props.writable,
            onClick: () => onSelect(pack),
            title: pack.voices[region] + ' (' + pack.provider + ')',
          },
          t('pack_' + pack.id) !== 'pack_' + pack.id ? t('pack_' + pack.id) : pack.name,
        ),
      ),
    ),
  )
}

function EventChimesEditor(props) {
  const t = props.t || ((key) => key)
  const value = props.value || {}
  const setChime = (event, chime) => {
    props.onChange(Object.assign({}, value, { [event]: chime }))
  }
  const events = ['onTurnComplete', 'onApprovalRequired', 'onError', 'onSubagentStart', 'onSubagentDone']
  const chimes = ['ding', 'beep', 'pop', 'subtle', 'none']
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement('div', { className: 'dts-h' }, t('eventChimesTitle')),
    React.createElement('div', { className: 'dts-sub' }, t('eventChimesHint')),
    events.map((ev) =>
      React.createElement(
        'div',
        { className: 'dts-row', key: ev, style: { justifyContent: 'space-between', margin: '4px 0' } },
        React.createElement('span', { style: { fontSize: '13px' } }, t(ev) || ev),
        React.createElement(
          'select',
          {
            className: 'dts-input',
            style: { width: '120px' },
            value:
              value[ev] ||
              (ev === 'onError' || ev === 'onSubagentStart' ? 'none' : ev === 'onApprovalRequired' ? 'pop' : 'ding'),
            disabled: !props.writable,
            onChange: (e) => setChime(ev, e.target.value),
          },
          chimes.map((c) => React.createElement('option', { key: c, value: c }, c)),
        ),
      ),
    ),
  )
}

// Synthesis stats panel: live host counters.
function StatsPanel(props) {
  const t = props.t || ((key) => key)
  const [data, setData] = React.useState(null)
  const loadStats = () => {
    clientFetch('/dsh-sound-atelier/stats', { cache: 'no-store', timeoutMs: 8000 })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.warn('[dsh-tts] loadStats failed:', err))
  }
  React.useEffect(() => {
    loadStats()
  }, [])
  const reset = () => {
    clientFetch('/dsh-sound-atelier/stats', { method: 'DELETE', timeoutMs: 8000 })
      .then(loadStats)
      .catch((err) => console.warn('[dsh-tts] resetStats failed:', err))
  }
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement(
      'span',
      { className: 'dts-sub' },
      data
        ? t('statTotal') +
            ': ' +
            data.total +
            ' · ' +
            t('statHits') +
            ': ' +
            data.cacheHits +
            ' · ' +
            t('statErrors') +
            ': ' +
            data.errors
        : t('loading'),
    ),
    data &&
      Object.keys(data.providers || {}).map((p) =>
        React.createElement(
          'span',
          { className: 'dts-sub', key: p },
          p + ': ' + data.providers[p].n + ' / ' + data.providers[p].ms + 'ms',
        ),
      ),
    React.createElement('button', { type: 'button', className: 'dts-link', onClick: reset }, t('statReset')),
  )
}

// Plugin-settings tab card follows the shared card pattern: li in the core list,
// theme-reset header, body with a divider. Chevron is ours; core does not provide it.
// ---- 30-voice-profile.js
const PROFILE_CONFIG_FIELDS = [
  'rate',
  'pitch',
  'volume',
  'speechInstruction',
  'voaiPitch',
  'doubaoPitch',
  'styleWeight',
  'breathPause',
  'spokenLanguage',
  'translationModel',
  'translationGlossary',
  'translationMaxTokens',
  'localTtsBackend',
  'localTtsFamily',
  'localTtsReferenceAsset',
  'localTtsEmotionAsset',
  'localTtsPromptLanguage',
  'localTtsLanguage',
  'localTtsDevice',
  'localTtsModelPath',
  'localTtsNativeModel',
  'localTtsNativeTrusted',
  'rvcEnabled',
  'rvcManaged',
  'rvcBaseUrl',
  'rvcDevice',
  'rvcModelAsset',
  'rvcIndexAsset',
  'rvcOptions',
  'providerOptions',
  'localTtsBaseUrl',
  'localTtsIdleSeconds',
  'language',
  'mimoInstruction',
  'doubaoInstruction',
  'mimoVoiceDesign',
  'mimoReferencePath',
  'deepinfraVoiceDesign',
  'siliconflowVoiceMode',
  'siliconflowReferencePath',
  'siliconflowReferenceText',
  'cosyvoiceUrl',
  'cosyvoiceApiMode',
  'cosyvoiceMode',
  'cosyvoiceReferencePath',
  'cosyvoiceReferenceText',
  'cosyvoiceSampleRate',
  'minimaxTransport',
  'piperModel',
  'piperBin',
  'espeakBin',
  'edgeBin',
  'rvcBypassOnFailure',
]
function VoiceProfilePanel({ draft, writable, setTop }) {
  const h = React.createElement,
    [data, D] = React.useState(null),
    [error, E] = React.useState(''),
    [busy, B] = React.useState(false),
    [name, N] = React.useState(''),
    [selected, S] = React.useState(''),
    [scope, C] = React.useState('persona'),
    [key, K] = React.useState('')
  const request = async (method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/voice/profiles', {
        method,
        cache: 'no-store',
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
      }),
      v = await r.json()
    if (!r.ok || !v.ok) throw Error(v.error?.message || '無法讀取音色方案')
    return v
  }
  const load = async () => D(await request())
  React.useEffect(() => {
    load().catch((e) => E(e.message))
  }, [])
  const run = async (body) => {
    B(true)
    E('')
    try {
      const v = await request('POST', { ...body, revision: data.revision })
      if (v.profile) S(v.profile.id)
      await load()
    } catch (e) {
      E(e.message)
    } finally {
      B(false)
    }
  }
  const fields = PROFILE_CONFIG_FIELDS,
    profiles = data?.profiles || [],
    items = scope === 'persona' ? data?.personas : scope === 'workspace' ? data?.workspaces : data?.sessions,
    disabled = !writable || busy || !data
  const label = (p) => p?.name || p?.title || p?.id || '未知專案',
    profileLabel = (id) => {
      const p = profiles.find((p) => p.id === id)
      return p ? p.name + ' · ' + p.chain[0]?.provider + ' / ' + (p.chain[0]?.voice || '預設音色') : '方案已不存在'
    }
  return h(
    'div',
    { className: 'dts-profile-panel' },
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '配音語言'),
      h('p', { className: 'dts-sub' }, '聊天正文保持原樣；可讓語音以自然日文朗讀。翻譯可能增加模型用量與等待時間。'),
      h(
        'label',
        { className: 'dts-field' },
        '配音模式',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '配音模式',
            value: draft.spokenLanguage || 'original',
            disabled: !writable,
            onChange: (e) => setTop('spokenLanguage', e.target.value),
          },
          h('option', { value: 'original' }, '原文配音'),
          h('option', { value: 'ja' }, '日文配音・保留中文正文'),
        ),
      ),
      draft.spokenLanguage === 'ja'
        ? h(
            React.Fragment,
            null,
            h(
              'label',
              { className: 'dts-field' },
              '翻譯模型（可留空）',
              h('input', {
                className: 'dts-input',
                value: draft.translationModel || '',
                placeholder: 'provider/model',
                disabled: !writable,
                onChange: (e) => setTop('translationModel', e.target.value),
              }),
            ),
            h(
              'label',
              { className: 'dts-field' },
              '專名與人稱用語表（JSON）',
              h('textarea', {
                className: 'dts-input',
                value: draft.translationGlossary || '{}',
                disabled: !writable,
                onChange: (e) => setTop('translationGlossary', e.target.value),
              }),
            ),
            h(
              'p',
              { className: 'dts-sub' },
              '請選擇支援日文的模型與音色，例如 Edge 日文音色或 Irodori。翻譯失敗會回報錯誤，不會默默改讀中文。日文的時間軸對應日文配音。',
            ),
          )
        : null,
    ),
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '人格與音色方案'),
      h(
        'p',
        { className: 'dts-sub' },
        '優先順序：單次指定 → 會話 → 工作區 → 人格 → 全域。先在語音來源設定好聲音，再建立方案；憑證只保留安全槽名稱。方案立即儲存，與下方全域設定分開。',
      ),
      h(
        'div',
        { className: 'dts-row' },
        h('input', {
          className: 'dts-input',
          'aria-label': '音色方案名稱',
          placeholder: '例如：小葵・日文',
          value: name,
          disabled,
          onChange: (e) => N(e.target.value),
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'dts-save',
            disabled: disabled || !name.trim(),
            onClick: () =>
              run({
                action: 'save',
                profile: {
                  name,
                  chain: draft.chain,
                  config: Object.fromEntries(fields.filter((k) => draft[k] !== undefined).map((k) => [k, draft[k]])),
                },
              }),
          },
          '以目前設定建立方案',
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '選擇音色方案',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '選擇音色方案',
            value: selected,
            disabled,
            onChange: (e) => S(e.target.value),
          },
          h('option', { value: '' }, '繼承全域／上層設定'),
          profiles.map((p) => h('option', { key: p.id, value: p.id }, profileLabel(p.id))),
        ),
      ),
      selected
        ? h(
            'div',
            { className: 'dts-row' },
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  const p = profiles.find((p) => p.id === selected)
                  if (p) {
                    setTop('chain', structuredClone(p.chain))
                    for (const [k, v] of Object.entries(p.config)) setTop(k, v)
                  }
                },
              },
              '載入至編輯器',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  if (
                    window.confirm(
                      '以目前編輯器的聲音與語言設定更新這個方案？套用該方案的會話會在下一次合成使用新設定。',
                    )
                  )
                    run({
                      action: 'save',
                      profile: {
                        id: selected,
                        name: name.trim() || profiles.find((p) => p.id === selected)?.name,
                        chain: draft.chain,
                        config: Object.fromEntries(
                          fields.filter((k) => draft[k] !== undefined).map((k) => [k, draft[k]]),
                        ),
                      },
                    })
                },
              },
              '以目前設定更新方案',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  if (window.confirm('刪除這個本機音色方案及其綁定？不會刪除錄音、模型或雲端音色。'))
                    run({ action: 'remove', id: selected }).then(() => S(''))
                },
              },
              '刪除本機方案',
            ),
          )
        : null,
      h(
        'div',
        { className: 'dts-row' },
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '綁定範圍',
            value: scope,
            disabled,
            onChange: (e) => {
              C(e.target.value)
              K('')
            },
          },
          [
            ['persona', '人格'],
            ['workspace', '工作區'],
            ['session', '會話'],
          ].map(([id, n]) => h('option', { key: id, value: id }, n)),
        ),
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '綁定對象',
            value: key,
            disabled,
            onChange: (e) => K(e.target.value),
          },
          h('option', { value: '' }, '選擇綁定對象'),
          (items || []).map((p) => h('option', { key: p.id, value: p.id }, label(p))),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'dts-save',
            disabled: disabled || !key,
            onClick: () => run({ action: 'bind', scope, key, profileId: selected || null }),
          },
          selected ? '套用綁定' : '移除綁定',
        ),
      ),
      (data?.personaAdapters || []).length
        ? h(
            'label',
            { className: 'dts-field' },
            '人格資料來源',
            h(
              'select',
              {
                className: 'dts-input',
                'aria-label': '人格資料來源',
                value: draft.personaAdapter || 'auto',
                disabled: !writable,
                onChange: (e) => setTop('personaAdapter', e.target.value),
              },
              h('option', { value: 'auto' }, '自動（使用所有已連線的人格插件）'),
              data.personaAdapters.map((a) => h('option', { key: a.id, value: a.id }, a.name + (a.available ? '' : '（未連線）'))),
            ),
            h('span', { className: 'dts-sub' }, '有多個人格插件時，可指定只從其中一個讀取人格清單。這是全域設定，要按下方的儲存才生效。'),
          )
        : null,
      h(
        'button',
        { type: 'button', className: 'dts-link', disabled: busy, onClick: () => load().catch((e) => E(e.message)) },
        '重新整理人格與會話',
      ),
      data?.personaAdapters
        ?.filter((a) => !a.available)
        .map((a) => h('p', { className: 'dts-sub', key: a.id }, a.name + ' 尚未連線；仍可綁定工作區或會話。')),
      h(
        'div',
        { className: 'dts-bindings' },
        (data?.bindings || []).length
          ? h(
              'table',
              null,
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  ['範圍', '人格／工作區／會話', '使用音色'].map((n) => h('th', { key: n }, n)),
                ),
              ),
              h(
                'tbody',
                null,
                data.bindings.map((b) =>
                  h(
                    'tr',
                    { key: b.scope + ':' + b.key },
                    h('td', null, { persona: '人格', workspace: '工作區', session: '會話' }[b.scope]),
                    h(
                      'td',
                      null,
                      label(
                        (b.scope === 'persona'
                          ? data.personas
                          : b.scope === 'workspace'
                            ? data.workspaces
                            : data.sessions
                        ).find((p) => p.id === b.key),
                      ) === '未知專案'
                        ? b.key
                        : label(
                            (b.scope === 'persona'
                              ? data.personas
                              : b.scope === 'workspace'
                                ? data.workspaces
                                : data.sessions
                            ).find((p) => p.id === b.key),
                          ),
                    ),
                    h('td', null, profileLabel(b.profileId)),
                  ),
                ),
              ),
            )
          : h('p', { className: 'dts-sub' }, '目前沒有綁定，所有會話繼承全域音色。'),
      ),
      error ? h('p', { className: 'dts-bad', role: 'alert' }, error) : null,
    ),
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '在聊天軟體中使用語音'),
      h('p', { className: 'dts-sub' }, '這裡將文字轉成聲音，再由通訊插件送到目前的對話。已接上的方式如下：'),
      h(
        'ul',
        { className: 'dts-sub' },
        h('li', null, 'Discord：可在已設定的語音房播放，也可回覆可點擊播放的語音訊息。'),
        h('li', null, 'OneBot／QQBot：啟用「語音交付橋接」並設定對應通訊插件後，可在該對話要求語音回覆。'),
        h('li', null, 'dsh-im：啟用語音擴充後，支援的平台可顯示語音泡泡；不支援的通道則以音訊附件呈現。'),
      ),
      h(
        'p',
        { className: 'dts-sub' },
        '安裝 TTS 不會自動讓所有回覆變成語音，仍需在通訊插件啟用所需功能。可切換到上方「語音交付」，查看通道限制與傳送結果；「已排程」代表正在等候，尚未確認送達。',
      ),
    ),
  )
}
// ---- 31-studio-extras.js
// 聲音工坊的輔助元件：音色試聽牆、本月用量、設定搜尋。

// 音色試聽牆：列出目前服務在所選語言的所有聲音，每個都能試聽與選用。
// 只在使用者展開時才向後端要清單；試聽會實際合成一句話（Edge 免費，其他服務可能計費）。
function VoiceWall({ provider, model, voice, language, writable, onPick, onPreview }) {
  const h = React.createElement
  const [open, setOpen] = React.useState(false)
  const [voices, setVoices] = React.useState(null)
  const [error, setError] = React.useState('')
  const [lang, setLang] = React.useState('')
  const [busy, setBusy] = React.useState('')
  const free = provider === 'edge'
  React.useEffect(() => {
    if (!open || !provider) return undefined
    const controller = new AbortController()
    setVoices(null)
    setError('')
    clientFetch(
      '/dsh-sound-atelier/catalog?provider=' + encodeURIComponent(provider) + '&model=' + encodeURIComponent(model || ''),
      { signal: controller.signal, timeoutMs: 14000, cache: 'no-store' },
    )
      .then((r) => r.json())
      .then((d) => {
        if (controller.signal.aborted) return
        if (!d.ok) throw Error('catalog')
        setVoices(d.voices || [])
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setVoices([])
          setError('讀取聲音清單失敗，請稍後再試。')
        }
      })
    return () => controller.abort()
  }, [open, provider, model])
  const languages = [...new Set((voices || []).map((v) => v.language).filter(Boolean))].sort()
  // 預設顯示與目前設定語言相符的聲音（例如 zh-TW）；沒有相符的就顯示全部。
  const wanted = String(language || 'zh-TW').toLowerCase()
  const guess =
    languages.find((l) => l.toLowerCase() === wanted) ||
    languages.find((l) => l.toLowerCase().startsWith(wanted.slice(0, 2))) ||
    ''
  const active = lang === '*' ? '' : lang || guess
  const shown = (voices || []).filter((v) => !active || v.language === active).slice(0, 60)
  const sample = /^ja/i.test(active) ? 'こんにちは、これは音声のサンプルです。' : /^en/i.test(active) ? 'Hello, this is a voice sample.' : '你好，這是這個聲音的試聽。'
  const preview = async (v) => {
    if (busy) return
    setBusy(v.id)
    setError('')
    try {
      await onPreview(v.id, sample)
    } catch (e) {
      setError('試聽失敗：' + String(e?.message || e))
    } finally {
      setBusy('')
    }
  }
  return h(
    'details',
    { className: 'dts-block', 'data-dsh-tts-voice-wall': '1', onToggle: (e) => setOpen(e.currentTarget.open) },
    h('summary', null, h('strong', null, '音色試聽牆'), '　展開後可以逐一試聽、選用這個服務的聲音'),
    h(
      'div',
      { className: 'dts-sub' },
      free
        ? '列出這個服務的所有聲音，可以一個一個試聽再選用。Edge 是免金鑰的線上語音，試聽不收費。'
        : '列出這個服務的所有聲音，可以一個一個試聽再選用。每次試聽都會實際合成一句話，可能使用額度。',
    ),
    !open
      ? null
      : voices === null
        ? h('div', { className: 'dts-sub', role: 'status' }, '讀取聲音清單…')
        : h(
            React.Fragment,
            null,
            languages.length > 1
              ? h(
                  'label',
                  { className: 'dts-field' },
                  '語言',
                  h(
                    'select',
                    { className: 'dts-input', 'aria-label': '試聽牆語言', value: active || '*', onChange: (e) => setLang(e.target.value) },
                    h('option', { value: '*' }, '全部語言'),
                    languages.map((l) => h('option', { key: l, value: l }, l)),
                  ),
                )
              : null,
            shown.length
              ? h(
                  'div',
                  { className: 'dts-voice-wall' },
                  shown.map((v) =>
                    h(
                      'div',
                      { className: 'dts-voice-card', key: v.id, 'data-selected': v.id === voice ? 'true' : 'false' },
                      h(
                        'div',
                        { className: 'dts-voice-name', title: v.id },
                        v.name || v.id,
                        h('small', null, [v.language, v.gender].filter(Boolean).join(' · ')),
                      ),
                      h(
                        'button',
                        { type: 'button', className: 'dts-btn', disabled: !!busy, 'aria-label': '試聽 ' + (v.name || v.id), onClick: () => preview(v) },
                        busy === v.id ? '合成中…' : '▶ 試聽',
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dts-btn',
                          disabled: !writable || v.id === voice,
                          'aria-label': '選用 ' + (v.name || v.id),
                          onClick: () => onPick(v.id),
                        },
                        v.id === voice ? '使用中' : '選用',
                      ),
                    ),
                  ),
                )
              : h('div', { className: 'dts-sub' }, error || '這個服務沒有提供聲音清單，請在上方直接填入聲音名稱。'),
            (voices || []).filter((v) => !active || v.language === active).length > shown.length
              ? h('div', { className: 'dts-sub' }, '只顯示前 60 個；請用語言篩選縮小範圍。')
              : null,
          ),
    error && voices?.length ? h('div', { className: 'dts-sub dts-bad', role: 'alert' }, error) : null,
  )
}

// 本月用量：各服務送出的字元數。這是本插件自己的統計，不是服務商帳單，也不是金額。
function UsagePanel() {
  const h = React.createElement
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState('')
  const load = () => {
    setError('')
    clientFetch('/dsh-sound-atelier/usage', { cache: 'no-store', timeoutMs: 8000 })
      .then((r) => r.json())
      .then((d) => {
        if (!d || d.ok === false) throw Error(d?.error?.message || '讀取失敗')
        setData(d)
      })
      .catch((e) => setError(String(e?.message || e)))
  }
  React.useEffect(load, [])
  const rows = Object.values((data?.months || {})[data?.month] || {}).sort((a, b) => b.submittedCharacters - a.submittedCharacters)
  const number = (n) => Number(n || 0).toLocaleString('zh-TW')
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-usage': '1' },
    h('div', { className: 'dts-h' }, '本月用量估算' + (data?.month ? '（' + data.month + '）' : '')),
    h(
      'div',
      { className: 'dts-sub' },
      '各服務這個月送出合成的字元數。只統計這個插件送出的請求，快取命中不計；這不是金額，也不能取代服務商帳單。實際費用請用字元數對照服務商的價目表。',
    ),
    error
      ? h('div', { className: 'dts-sub dts-bad', role: 'alert' }, '讀取用量失敗：' + error)
      : data === null
        ? h('div', { className: 'dts-sub', role: 'status' }, '讀取中…')
        : rows.length
          ? h(
              'table',
              { className: 'dts-usage-table' },
              h('thead', null, h('tr', null, ['服務', '送出字元', '成功字元', '請求數'].map((n) => h('th', { key: n }, n)))),
              h(
                'tbody',
                null,
                rows.map((row) =>
                  h(
                    'tr',
                    { key: row.provider + ':' + row.tier },
                    h('td', null, row.provider + (row.tier && row.tier !== 'all' ? '（' + row.tier + '）' : '')),
                    h('td', null, number(row.submittedCharacters)),
                    h('td', null, number(row.successfulCharacters)),
                    h('td', null, number(row.requests)),
                  ),
                ),
              ),
            )
          : h('div', { className: 'dts-sub' }, '這個月還沒有送出合成請求。'),
    h('button', { type: 'button', className: 'dts-link', onClick: load }, '重新整理用量'),
  )
}

// 設定搜尋：在四個分頁的欄位標題中找關鍵字，點結果會切到該分頁、展開所在區塊並捲到欄位。
// rootRef 指向整個設定區；pages 是 [[id, 名稱]]。
function SettingsSearch({ rootRef, pages, onGo }) {
  const h = React.createElement
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  React.useEffect(() => {
    const needle = query.trim().toLowerCase()
    const root = rootRef.current
    if (!needle || !root || typeof root.querySelectorAll !== 'function') {
      setResults([])
      return
    }
    const names = new Map(pages)
    const seen = new Set()
    const found = []
    for (const el of root.querySelectorAll(
      '[data-dts-page] label.dts-field, [data-dts-page] label.dts-catalog-field, [data-dts-page] label.dts-block, [data-dts-page] .dts-toggle-row, [data-dts-page] .dts-h, [data-dts-page] summary',
    )) {
      // 只取元素自己的標題文字（第一段），不含底下整塊說明。
      const own = [...el.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim())
      const label = String(own ? own.textContent : el.querySelector('strong')?.textContent || el.textContent || '')
        .trim()
        .slice(0, 60)
      const full = String(el.textContent || '').toLowerCase()
      if (!label || !full.includes(needle)) continue
      const page = el.closest('[data-dts-page]')?.getAttribute('data-dts-page')
      const key = page + ':' + label
      if (seen.has(key)) continue
      seen.add(key)
      found.push({ key, label, page, pageName: names.get(page) || page, el })
      if (found.length >= 12) break
    }
    setResults(found)
  }, [query])
  const go = (row) => {
    onGo(row.page)
    // 等分頁切換完成後再展開與捲動。
    setTimeout(() => {
      for (let node = row.el; node; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true
      row.el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      row.el.classList?.add('dts-search-hit')
      setTimeout(() => row.el.classList?.remove('dts-search-hit'), 2200)
    }, 60)
  }
  return h(
    'div',
    { className: 'dts-search', 'data-dsh-tts-search': '1' },
    h('input', {
      type: 'search',
      className: 'dts-input',
      'aria-label': '搜尋設定',
      placeholder: '搜尋設定（例如：快取、語速、提示音）',
      value: query,
      onChange: (e) => setQuery(e.target.value),
    }),
    query.trim()
      ? results.length
        ? h(
            'div',
            { className: 'dts-search-results', role: 'list' },
            results.map((row) =>
              h(
                'button',
                { key: row.key, type: 'button', className: 'dts-btn', role: 'listitem', onClick: () => go(row) },
                row.label,
                h('small', null, row.pageName),
              ),
            ),
          )
        : h('div', { className: 'dts-sub', role: 'status' }, '找不到符合的設定，請換個關鍵字。')
      : null,
  )
}
// ---- 32-discord-link.js
// 「語音交付」頁的 Discord 賽博群友連線卡。
//
// 只讀取 Discord 賽博群友自己公開的狀態接口來顯示，聲音工坊的後端不需要知道它的存在。
// 沒有安裝該插件時接口不存在，卡片顯示「沒有偵測到」。
function DiscordLinkCard({ active }) {
  const h = React.createElement
  const [state, setState] = React.useState({ kind: 'loading' })
  const alive = React.useRef(true)
  const load = React.useCallback(async () => {
    setState((previous) => ({ ...previous, kind: 'loading' }))
    try {
      // 先用目前的路徑；找不到時再試改名前的路徑（舊版 Discord 賽博群友）。
      let response = await clientFetch('/api/discord-cyberfriend/voice', { cache: 'no-store', timeoutMs: 8000, credentials: 'same-origin' })
      if (response.status === 404)
        response = await clientFetch('/api/discord-pyself-lab/voice', { cache: 'no-store', timeoutMs: 8000, credentials: 'same-origin' })
      if (response.status === 404) {
        if (alive.current) setState({ kind: 'absent' })
        return
      }
      const data = await response.json()
      if (!response.ok || !data || data.ok === false) throw Error(data?.error || 'HTTP ' + response.status)
      if (alive.current) setState({ kind: 'ready', data })
    } catch (error) {
      if (alive.current) setState({ kind: 'error', error: String(error?.message || error) })
    }
  }, [])
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  // 切到「語音交付」頁時才讀取，不在背景輪詢。
  React.useEffect(() => {
    if (active) load()
  }, [active, load])

  const row = (label, value, tone) =>
    h(
      'div',
      { className: 'dts-link-row' },
      h('span', { className: 'dts-link-label' }, label),
      h('span', { className: 'dts-badge' + (tone === 'ok' ? ' dts-badge-on' : tone === 'warn' ? ' dts-badge-warn' : tone === 'bad' ? ' dts-badge-bad' : '') }, value),
    )
  const here = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  const portOf = (origin) => {
    try {
      const url = new URL(origin)
      return url.port || (url.protocol === 'https:' ? '443' : '80')
    } catch {
      return ''
    }
  }
  let body
  if (state.kind === 'loading' && !state.data) body = h('div', { className: 'dts-sub', role: 'status' }, '正在偵測 Discord 賽博群友…')
  else if (state.kind === 'absent')
    body = h(
      'div',
      { className: 'dts-sub', 'data-discord-link': 'absent' },
      '沒有偵測到 Discord 賽博群友。它是聲音工坊的姊妹插件（套件名稱 dsh-discord-cyberfriend）；裝好並啟用後，會自動用這裡的聲音在 Discord 語音房說話、或回覆語音訊息。',
    )
  else if (state.kind === 'error')
    body = h('div', { className: 'dts-sub dts-bad', role: 'alert', 'data-discord-link': 'error' }, '讀取 Discord 賽博群友的狀態失敗：' + state.error)
  else {
    const data = state.data || {}
    const tts = data.tts || null
    const link = tts?.link || null
    const usesStudio = tts?.serviceId === 'dshTts' || /dsh-tts/.test(String(tts?.provider || ''))
    const rooms = Array.isArray(data.sessions) ? data.sessions.filter((s) => s && s.connected !== false).length : 0
    const rows = [row('偵測結果', '已偵測到 Discord 賽博群友', 'ok')]
    if (!tts) rows.push(row('使用的語音服務', '尚未偵測到語音服務，請到 Discord 賽博群友按「檢查語音環境」', 'warn'))
    else {
      rows.push(
        row(
          '使用的語音服務',
          usesStudio ? 'DSH 聲音工坊（就是這裡）' : (tts.name || tts.provider || '其他語音服務') + '（不是聲音工坊）',
          usesStudio ? 'ok' : 'warn',
        ),
      )
      if (link?.mode === 'service') rows.push(row('連線方式', '直接使用 DSH 內的服務，不經過網路連接埠', 'ok'))
      else if (link?.mode === 'http') {
        const same = Boolean(link.origin && here && link.origin === here)
        rows.push(
          row(
            '連線方式',
            link.origin ? 'HTTP：' + link.origin + '（連接埠 ' + portOf(link.origin) + '）' : 'HTTP：尚未連上任何位址',
            link.origin ? (same ? 'ok' : 'warn') : 'bad',
          ),
        )
        if (link.origin)
          rows.push(
            row(
              '連接埠是否對上',
              same ? '對上了：與目前 DSH 的位址相同（連接埠 ' + portOf(here) + '）' : '沒有對上：目前 DSH 在 ' + here,
              same ? 'ok' : 'bad',
            ),
          )
      }
      rows.push(row('語音服務狀態', tts.ready ? '可以合成' : tts.unavailableReason || '尚未就緒', tts.ready ? 'ok' : 'bad'))
    }
    rows.push(row('Discord 語音輸出', data.enabled ? '已開啟' : '未開啟（在 Discord 賽博群友的「語音」頁開啟）', data.enabled ? 'ok' : ''))
    rows.push(row('目前連線的語音房', rooms ? rooms + ' 個' : '沒有', rooms ? 'ok' : ''))
    body = h(
      'div',
      { 'data-discord-link': tts?.ready && usesStudio ? 'ok' : 'attention' },
      rows,
      tts && link?.mode === 'http' && link.origin && here && link.origin !== here
        ? h(
            'div',
            { className: 'dts-sub dts-bad', role: 'alert' },
            'Discord 賽博群友設定的語音 API 位址與目前的 DSH 不同。DSH 每次啟動連接埠可能改變；請到 Discord 賽博群友的「語音」頁把「TTS API 位址」清空，讓它自動使用目前的位址。',
          )
        : null,
      tts && !usesStudio
        ? h(
            'div',
            { className: 'dts-sub' },
            '想改用聲音工坊：到 Discord 賽博群友的「語音」頁，把「使用哪套語音服務」改成「DSH 聲音工坊」。',
          )
        : null,
    )
  }
  return h(
    'section',
    { className: 'dts-block', 'aria-label': 'Discord 賽博群友連線狀態', 'data-dsh-tts-discord-link': state.kind },
    h(
      'div',
      { className: 'dts-row', style: { justifyContent: 'space-between' } },
      h('div', { className: 'dts-h' }, 'Discord 賽博群友'),
      h('button', { type: 'button', className: 'dts-btn', disabled: state.kind === 'loading', onClick: load }, state.kind === 'loading' ? '偵測中…' : '重新偵測'),
    ),
    h('div', { className: 'dts-sub' }, '確認 Discord 賽博群友有沒有接上這個聲音工坊，以及兩邊的連線位址是否一致。'),
    body,
  )
}
// ---- 33-speech-delivery.js
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
// ---- 40-tts-section.js
// 模組層級的翻譯函式：內容不依賴元件狀態，放在元件外才不會每次重繪都換一個新函式
//（子元件以它作為 effect 依賴，例如更新檢查）。
const sectionText = (key) => zh[key] ?? key

function TtsSection(props) {
  const t = sectionText
  const [page, setPage] = React.useState('source')
  const [sourceMode, setSourceMode] = React.useState(null)
  const [draft, setDraft] = React.useState(null)
  const [credentials, setCredentials] = React.useState({})
  const [keyDrafts, setKeyDrafts] = React.useState({})
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [catalogEpoch, setCatalogEpoch] = React.useState(0)
  const [referenceAssets, setReferenceAssets] = React.useState([])
  const [err, setErr] = React.useState('')
  // 快速開始的試聽狀態：idle | busy | done
  const [startState, setStartState] = React.useState('idle')
  // 上次載入或儲存成功時的設定內容，用來判斷是否有尚未儲存的變更。
  const savedSnapshot = React.useRef('')
  // 狀態徽章只在「進階設定」顯示，因此只在該分頁時輪詢。
  const pageRef = React.useRef(page)
  pageRef.current = page
  const [telemetry, setTelemetry] = React.useState({
    online: true,
    cacheHits: 0,
    sseOk: true,
    total: 0,
    sseClients: 0,
    breaker: [],
    provider: '',
    queue: 0,
  })
  const [advancedOpen, setAdvancedOpen] = React.useState(() => {
    try {
      return localStorage.getItem('dsh-tts/advancedOpen') === '1'
    } catch {
      /* localStorage unavailable */ return false
    }
  })
  const autoplay = useAutoplayGate()
  const rootRef = React.useRef(null)

  const ctx = props && props.ctx
  const scope = React.useMemo(() => {
    const s = (ctx && ctx.get && ctx.get('lanSettings')) || (ctx && ctx.configForms)
    if (!s || !s.get) return null
    try {
      return s.get(NS)
    } catch (_) {
      /* settings scope binding failed */
      return null
    }
  }, [ctx])

  const subscribe = React.useMemo(() => {
    return (cb) => {
      if (!scope || !scope.subscribe) return () => {}
      try {
        return scope.subscribe(cb) || (() => {})
      } catch (_) {
        /* settings scope binding failed */
        return () => {}
      }
    }
  }, [scope])

  const getSnapshot = React.useCallback(() => {
    if (!scope || !scope.getSnapshot) return SNAPSHOT_LOADING
    try {
      return scope.getSnapshot() || SNAPSHOT_LOADING
    } catch (_) {
      /* settings scope binding failed */
      return SNAPSHOT_LOADING
    }
  }, [scope])

  const snap =
    (React.useSyncExternalStore
      ? React.useSyncExternalStore(
          subscribe,
          getSnapshot,
          React.useCallback(() => SNAPSHOT_LOADING, []),
        )
      : null) || (scope && scope.getSnapshot ? scope.getSnapshot() : SNAPSHOT_LOADING)

  // Snapshot status matters more than the value:
  //   loading     — host has not answered yet;
  //   unavailable — host answered but the settings namespace is not ready;
  //   ready       — values are present.
  // On unavailable, writable defaults true; without a status check the card
  // looks like a working empty form.
  // Snapshot status contract (#163):
  // Without valid scope, or when loading/unavailable, editing is disabled.
  const [revision, setRevision] = React.useState(null)
  const ready = !!scope && !!snap && snap.status === 'ready'
  const writable = ready && snap.writable !== false && !saving

  const applyPayload = (data) => {
    const cfg = data && data.config ? data.config : {}
    setDraft(JSON.parse(JSON.stringify(cfg)))
    savedSnapshot.current = JSON.stringify(cfg)
    setSourceMode(
      ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice'].includes(cfg.chain?.[0]?.provider)
        ? 'local'
        : 'online',
    )
    setCredentials(data && data.credentials ? data.credentials : {})
    if (data && data.revision !== undefined) setRevision(data.revision)
    player.enabled = !!cfg.speakReplies
    statusKnown = true
    refreshStatusSoon()
  }

  React.useEffect(() => {
    let alive = true
    clientFetch('/dsh-sound-atelier/config', { cache: 'no-store', timeoutMs: 8000 })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        applyPayload(data)
      })
      .catch((e) => {
        if (alive) setErr(String(e && e.message ? e.message : e))
      })

    const loadTelemetry = () => {
      clientFetch('/dsh-sound-atelier/stats', { cache: 'no-store', timeoutMs: 8000 })
        .then((res) => res.json())
        .then((st) => {
          if (!alive || !st) return
          setTelemetry((prev) =>
            Object.assign({}, prev, {
              cacheHits: st.cacheHits || 0,
              total: st.total || 0,
              online: true,
              breaker: st.breaker || prev.breaker || [],
            }),
          )
        })
        .catch(() => {
          if (alive) setTelemetry((prev) => Object.assign({}, prev, { online: false }))
        })
      clientFetch('/dsh-sound-atelier/status', { cache: 'no-store', timeoutMs: 8000 })
        .then((res) => res.json())
        .then((st) => {
          if (!alive || !st) return
          setTelemetry((prev) =>
            Object.assign({}, prev, {
              sseClients: st.sseClients || 0,
              sseOk: (st.sseClients || 0) >= 0,
              provider: (player.audio && player.provider) || (player.queue[0] && player.queue[0].provider) || '',
              queue: player.queue.length,
            }),
          )
        })
        .catch(() => {})
    }
    loadTelemetry()
    const telTimer = setInterval(() => {
      if (pageRef.current === 'advanced' && !document.hidden) loadTelemetry()
    }, 3000)
    // interval cleaned by effect return below

    return () => {
      alive = false
      clearInterval(telTimer)
    }
  }, [])

  if (err && !draft) {
    return React.createElement(
      'div',
      { className: 'dts-wrap dts-warn' },
      React.createElement('span', null, (t('errorLoading') || 'Error loading settings: ') + err),
    )
  }
  if (!draft)
    return React.createElement(
      'div',
      { className: 'dts-wrap' },
      React.createElement(
        'div',
        { className: 'dts-state', role: 'status' },
        React.createElement('span', { className: 'dts-spinner', 'aria-hidden': true }),
        t('loading'),
      ),
    )

  const setTop = (key, v) => setDraft((d) => Object.assign({}, d || {}, { [key]: v }))
  const hasUnsaved =
    JSON.stringify(draft) !== savedSnapshot.current ||
    Object.values(keyDrafts || {}).some((value) => String(value || '').trim())
  const setDraftKey = (provider, value) => setKeyDrafts((d) => Object.assign({}, d, { [provider]: value }))

  const commitKey = async (provider, raw) => {
    const value = String(raw != null ? raw : (keyDrafts && keyDrafts[provider]) || '').trim()
    if (!value) return
    setErr('')
    const res = await clientFetch('/dsh-sound-atelier/credential', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: provider, value: value }),
      timeoutMs: 10000,
    })
    const data = await res.json().catch(() => ({/* parse error */}))
    if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
    if (data && data.credentials) setCredentials(data.credentials)
    setKeyDrafts((d) => Object.assign({}, d, { [provider]: '' }))
    setCatalogEpoch((v) => v + 1)
  }

  const clearKey = async (provider) => {
    setErr('')
    try {
      const res = await clientFetch('/dsh-sound-atelier/credential', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider }),
        timeoutMs: 10000,
      })
      const data = await res.json().catch(() => ({/* parse error */}))
      if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
      if (data && data.credentials) setCredentials(data.credentials)
      setKeyDrafts((d) => Object.assign({}, d, { [provider]: '' }))
      setCatalogEpoch((v) => v + 1)
    } catch (e) {
      setErr(String(e && e.message ? e.message : e))
    }
  }

  // extra：這次儲存要一併寫入的值（例如一鍵開啟自動朗讀）；一般按鈕呼叫時不帶。
  const save = async (extra) => {
    const override = extra && typeof extra === 'object' && !('target' in extra) ? extra : null
    setErr('')
    setSaved(false)
    if (!draft || saving) return
    setSaving(true)
    try {
      const keys = {}
      Object.keys(keyDrafts || {}).forEach((p) => {
        const v = String(keyDrafts[p] || '').trim()
        if (v) keys[p] = v
      })
      const bodyPayload = Object.assign({}, draft, override, { keys: keys })
      if (revision !== null && revision !== undefined) {
        bodyPayload.revision = revision
      }
      const res = await clientFetch('/dsh-sound-atelier/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        timeoutMs: 10000,
      })
      const data = await res.json().catch(() => ({/* parse error */}))
      if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
      applyPayload(data)
      setKeyDrafts({})
      setCatalogEpoch((v) => v + 1)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(String(e && e.message ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const onCommitKey = (provider, raw) => {
    commitKey(provider, raw).catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const clearCacheNow = async () => {
    setErr('')
    const res = await clientFetch('/dsh-sound-atelier/cache', { method: 'DELETE', timeoutMs: 10000 })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const onClearCache = () => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(t('confirmClearCache'))) return
    }
    clearCacheNow().catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const onPreview = (provider, model, voice, text, tuning) => {
    return previewSpeech(
      provider,
      model,
      voice,
      text,
      Object.assign(
        {
          rate: draft.rate,
          pitch: draft.pitch,
          volume: draft.volume,
          instruction:
            provider === 'doubao'
              ? draft.doubaoInstruction
              : provider === 'mimo'
                ? draft.mimoInstruction
                : draft.speechInstruction,
          voiceDesign: provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign,
          voaiPitch: draft.voaiPitch,
          doubaoPitch: draft.doubaoPitch,
          styleWeight: draft.styleWeight,
          breathPause: draft.breathPause,
        },
        tuning,
      ),
    ).catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const onPreviewPhrase = (phrase) => {
    if (!phrase) return
    const first = draft && draft.chain && draft.chain[0]
    onPreview((first && first.provider) || 'kokoro', (first && first.model) || '', (first && first.voice) || '', phrase)
  }

  const boolField = (key, label, hint, disabled = false) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        type: 'checkbox',
        checked: !!(draft && draft[key]),
        disabled: !writable || !!disabled,
        onChange: (e) => setTop(key, e.target.checked),
      }),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  const numberField = (key, label, hint, step) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        type: 'number',
        step: step || 1,
        className: 'dts-input',
        value: draft && draft[key] !== undefined ? draft[key] : '',
        disabled: !writable,
        onChange: (e) => setTop(key, Number(e.target.value)),
      }),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  // suggestions：可從清單挑選，也可自行輸入清單以外的值。
  const textField = (key, label, hint, suggestions) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        className: 'dts-input',
        value: draft && draft[key] !== undefined ? draft[key] : '',
        disabled: !writable,
        list: suggestions ? 'dts-suggest-' + key : undefined,
        onChange: (e) => setTop(key, e.target.value),
      }),
      suggestions
        ? React.createElement(
            'datalist',
            { id: 'dts-suggest-' + key },
            suggestions.map((item) => React.createElement('option', { key: item, value: item })),
          )
        : null,
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  const selectField = (key, label, options, fallback, hint) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: draft[key] || fallback,
          disabled: !writable,
          onChange: (e) => setTop(key, e.target.value),
        },
        options.map(([id, name]) => React.createElement('option', { key: id, value: id }, name)),
      ),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )
  let synthesisOptions = {},
    optionsValid = true
  try {
    synthesisOptions = JSON.parse(draft.providerOptions || '{}')
    if (!synthesisOptions || Array.isArray(synthesisOptions) || typeof synthesisOptions !== 'object') throw Error()
  } catch {
    optionsValid = false
    synthesisOptions = {}
  }
  const setProviderOption = (provider, key, value) => {
    if (
      !optionsValid ||
      (synthesisOptions[provider] &&
        (Array.isArray(synthesisOptions[provider]) || typeof synthesisOptions[provider] !== 'object'))
    ) {
      setErr('請先修正進階合成設定的 JSON 格式。')
      return
    }
    const options = { ...synthesisOptions[provider] }
    if (value === '') delete options[key]
    else options[key] = value
    setTop('providerOptions', JSON.stringify({ ...synthesisOptions, [provider]: options }))
  }

  const autoplayBanner = autoplay.blocked
    ? React.createElement(
        'div',
        { className: 'dts-unlock' },
        React.createElement('span', null, t('autoplayBlocked')),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-unlock-btn',
            onClick: () => player.unlockAudio && player.unlockAudio(),
          },
          t('enableSound'),
        ),
      )
    : null
  const breakerBadges = (telemetry.breaker || [])
    .filter((b) => b && b.open)
    .slice(0, 2)
    .map((b) =>
      React.createElement('span', { key: b.id, className: 'dts-badge dts-badge-bad' }, t('breakerOpen') + ': ' + b.id),
    )
  const telemetryBadges = React.createElement(
    'div',
    { className: 'dts-row', style: { marginBottom: '8px' }, 'data-dsh-tts-telemetry': '1' },
    React.createElement(
      'span',
      {
        className: 'dts-badge ' + (telemetry.online ? 'dts-badge-on' : 'dts-badge-bad'),
      },
      telemetry.online ? t('statusOnline') : t('statusOffline'),
    ),
    React.createElement(
      'span',
      {
        className: 'dts-badge ' + (telemetry.sseClients > 0 ? 'dts-badge-on' : ''),
      },
      t('sseState') + ': ' + (telemetry.sseClients || 0),
    ),
    React.createElement(
      'span',
      { className: 'dts-badge' },
      t('queueLen') + ': ' + (telemetry.queue || player.queue.length || 0),
    ),
    telemetry.provider
      ? React.createElement('span', { className: 'dts-badge' }, t('activeProvider') + ': ' + telemetry.provider)
      : null,
    React.createElement(
      'span',
      { className: 'dts-badge' },
      t('cacheStats') + ': ' + telemetry.cacheHits + ' / ' + telemetry.total,
    ),
    ...breakerBadges,
  )
  const titleLine =
    props && props.compact
      ? null
      : React.createElement(
          'div',
          { className: 'dts-header dts-studio-head' },
          React.createElement('div', { className: 'dts-page-sub' }, t('studioSubtitle')),
          React.createElement(
            'div',
            { className: 'dts-studio-status' },
            '目前聲音：',
            draft.chain?.[0]?.provider ? providerLabel(t, draft.chain[0].provider) : '—',
            ' · ',
            draft.chain?.[0]?.voice || t('catalogDefault'),
          ),
        )
  return React.createElement(
    'div',
    { className: 'dts-wrap', ref: rootRef },
    autoplayBanner,
    React.createElement(
      'div',
      { className: 'dts-block' },
      titleLine,
      draft.speakReplies
        ? null
        : React.createElement(
            'div',
            { className: 'dts-start', role: 'group', 'aria-label': '快速開始', 'data-dsh-tts-start': '1' },
            React.createElement('strong', null, '快速開始'),
            React.createElement(
              'ol',
              { className: 'dts-start-steps' },
              React.createElement(
                'li',
                { 'data-done': startState === 'done' ? 'true' : 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '先聽聽看'),
                  React.createElement(
                    'span',
                    null,
                    '用目前的聲音唸一句話。預設是免金鑰的 Edge 線上語音，不需要任何設定。',
                  ),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-btn',
                    disabled: startState === 'busy',
                    onClick: () => {
                      const first = draft.chain?.[0] || {}
                      setStartState('busy')
                      setErr('')
                      previewSpeech(
                        first.provider || 'edge',
                        first.model || '',
                        first.voice || '',
                        '你好，這是目前選擇的聲音。',
                        {
                          rate: draft.rate,
                          pitch: draft.pitch,
                          volume: draft.volume,
                        },
                      ).then(
                        () => setStartState('done'),
                        (e) => {
                          setStartState('idle')
                          setErr('試聽失敗：' + String(e && e.message ? e.message : e))
                        },
                      )
                    },
                  },
                  startState === 'busy' ? '合成中…' : startState === 'done' ? '再試聽一次' : '試聽一句',
                ),
              ),
              React.createElement(
                'li',
                { 'data-done': 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '或者一次完成'),
                  React.createElement('span', null, '先試聽一句；聽得到聲音就直接開啟自動朗讀並儲存，不必再按下方的儲存。'),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-save',
                    'data-dsh-tts-oneclick': '1',
                    disabled: !writable || startState === 'busy',
                    onClick: () => {
                      const first = draft.chain?.[0] || {}
                      setStartState('busy')
                      setErr('')
                      previewSpeech(first.provider || 'edge', first.model || '', first.voice || '', '你好，之後我會把回覆唸給你聽。', {
                        rate: draft.rate,
                        pitch: draft.pitch,
                        volume: draft.volume,
                      }).then(
                        () => {
                          setStartState('done')
                          return save({ speakReplies: true })
                        },
                        (e) => {
                          setStartState('idle')
                          setErr('試聽失敗，沒有開啟自動朗讀：' + String(e && e.message ? e.message : e))
                        },
                      )
                    },
                  },
                  startState === 'busy' ? '合成中…' : '試聽並開啟自動朗讀',
                ),
              ),
              React.createElement(
                'li',
                { 'data-done': 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '開啟自動朗讀'),
                  React.createElement(
                    'span',
                    null,
                    '開啟後按頁面下方的「' + t('save') + '」，之後 AI 的每則回覆都會自動唸出來。',
                  ),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-btn',
                    disabled: !writable,
                    onClick: () => setTop('speakReplies', true),
                  },
                  '開啟自動朗讀',
                ),
              ),
            ),
          ),
      React.createElement(
        'div',
        { className: 'dts-toggle-list' },
        [
          [
            'speakReplies',
            'studioAuto',
            'AI 回覆完成後自動唸出來。語音在本機服務合成、在這個瀏覽器播放，不會回傳給模型。',
          ],
          ['speakAsItGoes', 'studioStream', '回覆還在產生時就開始唸，等待時間較短。'],
          ['announceApproval', 'studioAlerts', '需要你批准操作時，用語音提醒。'],
        ].map(([key, label, hint]) =>
          React.createElement(
            'div',
            { key, className: 'dts-toggle-row' },
            React.createElement(
              'div',
              null,
              React.createElement('strong', null, t(label)),
              React.createElement('small', null, hint),
            ),
            React.createElement('button', {
              type: 'button',
              role: 'switch',
              className: 'dts-switch',
              'aria-checked': !!draft[key],
              'aria-label': t(label),
              disabled: !writable,
              onClick: () => setTop(key, !draft[key]),
            }),
          ),
        ),
      ),
    ),
    React.createElement(SettingsSearch, {
      rootRef,
      pages: [
        ['source', '語音來源'],
        ['voices', '聲音管理'],
        ['persona', '人格與語言'],
        ['advanced', '進階設定'],
      ],
      onGo: (id) => {
        setPage(id)
        if (id === 'advanced') setAdvancedOpen(true)
      },
    }),
    React.createElement(
      'nav',
      { className: 'dts-studio-nav', 'aria-label': '語音設定分頁' },
      [
        ['source', '語音來源'],
        ['voices', '聲音管理'],
        ['persona', '人格與語言'],
        ['advanced', '進階設定'],
      ].map(([id, label]) =>
        React.createElement(
          'button',
          { key: id, type: 'button', 'aria-current': page === id ? 'page' : undefined, onClick: () => setPage(id) },
          label,
        ),
      ),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'persona', 'data-dts-page': 'persona' },
      React.createElement(VoiceProfilePanel, { draft, writable, setTop }),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'source', className: 'dts-studio-page', 'data-dts-page': 'source' },
      React.createElement(
        'div',
        { className: 'dts-source-choices' },
        [
          ['online', '線上語音服務', '免安裝模型，依服務商收費；Edge 可免金鑰。'],
          ['local', '本機部署', '模型由本機或區域網路服務執行，需準備運算資源。'],
        ].map(([id, title, hint]) =>
          React.createElement(
            'button',
            {
              type: 'button',
              key: id,
              'aria-pressed': sourceMode === id,
              disabled: !writable,
              onClick: () => {
                setSourceMode(id)
                const local = ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice']
                if (local.includes(draft.chain?.[0]?.provider) !== (id === 'local'))
                  setTop('chain', [
                    {
                      provider: id === 'local' ? 'local-tts' : 'edge',
                      voice: id === 'local' ? '' : 'zh-TW-HsiaoChenNeural',
                      model: '',
                    },
                    ...(draft.chain || []).slice(1),
                  ])
              },
            },
            React.createElement('strong', null, title),
            React.createElement('span', null, hint),
          ),
        ),
      ),
      sourceMode === 'local'
        ? React.createElement(
            'p',
            { className: 'dts-sub' },
            '先到「聲音管理」安裝或連線推理服務，再回這裡選模型、參考錄音與試聽。切換分類只替換主要服務列；降級列可混用線上與本機。',
          )
        : null,
      React.createElement(
        'div',
        { className: 'dts-block' },
        React.createElement('div', { className: 'dts-h' }, '服務順序與備援'),
        React.createElement('div', { className: 'dts-sub' }, t('catalogHint')),
        React.createElement(ChainEditor, {
          sourceMode,
          referenceAssets,
          catalogEpoch,
          breaker: telemetry.breaker,
          t: t,
          value: draft && draft.chain ? draft.chain : [],
          writable: writable,
          credentials: credentials,
          keyDrafts: keyDrafts,
          onChange: (v) => setTop('chain', v),
          onDraft: setDraftKey,
          onCommitKey: onCommitKey,
          onClearKey: clearKey,
          onPreview: onPreview,
        }),
      ),
      draft.chain?.[0]?.provider
        ? React.createElement(VoiceWall, {
            key: 'wall-' + draft.chain[0].provider,
            provider: draft.chain[0].provider,
            model: draft.chain[0].model || '',
            voice: draft.chain[0].voice || '',
            language: draft.language,
            writable,
            onPick: (id) => setTop('chain', [{ ...draft.chain[0], voice: id, style: '' }, ...draft.chain.slice(1)]),
            onPreview: (id, text) =>
              previewSpeech(draft.chain[0].provider, draft.chain[0].model || '', id, text, {
                rate: draft.rate,
                pitch: draft.pitch,
                volume: draft.volume,
                baseUrl: draft.chain[0].baseUrl,
                keyEnv: draft.chain[0].keyEnv,
                options: draft.chain[0].options,
              }),
          })
        : null,
      React.createElement(TuningBar, {
        t,
        provider: draft.chain?.[0]?.provider || '',
        model: draft.chain?.[0]?.model || '',
        cosyvoiceMode: draft.cosyvoiceMode || 'sft',
        value: {
          rate: draft.rate ?? 1,
          pitch: draft.pitch ?? 0,
          volume: draft.volume ?? 1,
          instruction:
            (draft.chain?.[0]?.provider === 'doubao'
              ? draft.doubaoInstruction
              : draft.chain?.[0]?.provider === 'mimo'
                ? draft.mimoInstruction
                : draft.speechInstruction) || '',
          voiceDesign:
            (draft.chain?.[0]?.provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign) || '',
          voaiPitch: draft.voaiPitch ?? 0,
          doubaoPitch: draft.doubaoPitch ?? 0,
          styleWeight: draft.styleWeight ?? 0.5,
          breathPause: draft.breathPause ?? 0,
        },
        writable,
        onChange: (patch) =>
          setDraft((d) => {
            const next = { ...patch }
            if ('instruction' in next) {
              next[
                d.chain?.[0]?.provider === 'doubao'
                  ? 'doubaoInstruction'
                  : d.chain?.[0]?.provider === 'mimo'
                    ? 'mimoInstruction'
                    : 'speechInstruction'
              ] = next.instruction
              delete next.instruction
            }
            if ('voiceDesign' in next) {
              next[d.chain?.[0]?.provider === 'deepinfra' ? 'deepinfraVoiceDesign' : 'mimoVoiceDesign'] =
                next.voiceDesign
              delete next.voiceDesign
            }
            return Object.assign({}, d, next)
          }),
        onPreview: (text, tuning) =>
          previewSpeech(
            draft.chain?.[0]?.provider || '',
            draft.chain?.[0]?.model || '',
            draft.chain?.[0]?.voice || '',
            text,
            {
              ...tuning,
              style: draft.chain?.[0]?.style,
              baseUrl: draft.chain?.[0]?.baseUrl,
              keyEnv: draft.chain?.[0]?.keyEnv,
              options: draft.chain?.[0]?.options,
              referenceAsset: draft.chain?.[0]?.referenceAsset,
            },
          ),
      }),
      React.createElement(ProviderCapabilitiesPanel, { draft, setTop, writable, referenceAssets }),
      draft.chain?.[0]?.provider === 'openai' && /^gpt-realtime(?:-|$)/.test(draft.chain?.[0]?.model || '')
        ? React.createElement(
            'div',
            { className: 'dts-sub' },
            'Realtime 使用獨立 WebSocket 合成，回傳 WAV；會核對逐字稿，若改寫或漏讀便拒絕音訊。合成輸出格式請留空或選 wav，速度請用語氣提示或播放速度。',
          )
        : null,
      draft.chain?.some((row) => row.provider === 'dashscope')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'DashScope 百煉設定'),
            selectField(
              'dashscopeRegion',
              'DashScope 地域',
              [
                ['cn-beijing', '北京'],
                ['ap-southeast-1', '新加坡'],
              ],
              'cn-beijing',
              'API Key 與業務空間 ID 必須屬於同一地域；儲存後再試聽。',
            ),
            textField(
              'dashscopeWorkspace',
              'DashScope 業務空間 ID',
              '填入百煉控制檯的業務空間 ID，不是 API Key。此接入使用工作區專屬原生 HTTP TTS。',
            ),
          )
        : null,
      draft.chain?.[0]?.provider === 'doubao' && draft.chain[0].model !== 'seed-tts-1.0'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, '豆包 2.0 串流設定'),
            React.createElement(
              'label',
              { className: 'dts-field' },
              '豆包傳輸方式',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '豆包傳輸方式',
                  value: synthesisOptions.doubao?.transport || 'http',
                  disabled: !writable || !optionsValid,
                  onChange: (e) => setProviderOption('doubao', 'transport', e.target.value),
                },
                React.createElement('option', { value: 'http' }, 'HTTP 單向串流'),
                React.createElement('option', { value: 'websocket' }, 'WebSocket 雙向串流'),
              ),
            ),
            React.createElement(
              'label',
              { className: 'dts-row' },
              React.createElement('input', {
                type: 'checkbox',
                style: { width: 'auto', flex: '0 0 auto' },
                'aria-label': '豆包字詞時間戳',
                checked: !!synthesisOptions.doubao?.timestamps,
                disabled: !writable || !optionsValid,
                onChange: (e) => setProviderOption('doubao', 'timestamps', e.target.checked),
              }),
              '回傳字詞時間戳',
            ),
            React.createElement(
              'div',
              { className: 'dts-sub' },
              '開啟邊生成邊朗讀並選 WebSocket，宿主後續文字會送進同一條合成連線；聊天播放器仍等待這次合成完成再播放。外部整合可透過 /live 讀取即時 PCM。完整匯出會合併可用時間戳；目前反白仍以句子為主，服務未回傳時不推測。',
            ),
          )
        : null,
      draft.chain?.some((row) => row.provider === 'polly')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'Amazon Polly 設定'),
            textField(
              'pollyRegion',
              'Polly AWS Region',
              '例如 us-east-1 或 ap-northeast-1。使用上方 AWS 憑證 JSON 欄位，請勿把 secretAccessKey 填在一般設定。儲存後重新偵測音色。',
            ),
          )
        : null,
      ['fish', 'cartesia', 'dashscope', 'polly', 'inworld', 'google-cloud'].includes(draft.chain?.[0]?.provider)
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, '服務補充設定'),
            draft.chain[0].provider === 'fish'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '可選既有聲音模型 ID，或在上方填參考錄音與逐字稿。參考錄音會隨合成傳送，不會建立永久音色。S2 使用方括號語氣提示。',
                )
              : null,
            draft.chain[0].provider === 'cartesia'
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'label',
                    { className: 'dts-field' },
                    'Cartesia 合成語言',
                    React.createElement('input', {
                      className: 'dts-input',
                      'aria-label': 'Cartesia 合成語言',
                      placeholder: '留空依文字語言；英文填 en',
                      value: synthesisOptions.cartesia?.language || '',
                      disabled: !writable || !optionsValid,
                      onChange: (e) => setProviderOption('cartesia', 'language', e.target.value),
                    }),
                  ),
                  React.createElement(
                    'label',
                    { className: 'dts-field' },
                    'Cartesia 情感（僅英文）',
                    React.createElement(
                      'select',
                      {
                        className: 'dts-input',
                        'aria-label': 'Cartesia 情感（僅英文）',
                        value: synthesisOptions.cartesia?.emotion || '',
                        disabled: !writable || !optionsValid,
                        onChange: (e) => setProviderOption('cartesia', 'emotion', e.target.value),
                      },
                      [
                        ['', '依正文判斷'],
                        ['happy', '開心'],
                        ['excited', '亢奮'],
                        ['calm', '平靜'],
                        ['sad', '傷心'],
                        ['angry', '生氣'],
                        ['scared', '害怕'],
                      ].map(([id, name]) => React.createElement('option', { key: id, value: id }, name)),
                    ),
                  ),
                )
              : null,
            draft.chain[0].provider === 'google-cloud'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '一般模型由音色 ID 決定；Gemini TTS 請另選模型與預建音色。Chirp 3 HD／Gemini 可選串流；SSML、mark、ADC、自訂發音與雙人對話見上方模型進階能力。',
                )
              : null,
            draft.chain[0].provider === 'polly'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '模型欄位代表合成引擎；請確認音色支援該引擎。支援明確 SSML、詞典與 Speech Marks；generative 可使用雙向串流，不支援 Speech Marks。',
                )
              : null,
          )
        : null,
      draft.chain?.[0]?.provider === 'mimo' && draft.chain?.[0]?.model === 'mimo-v2.5-tts-voiceclone'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'MiMo 參考聲音'),
            textField(
              'mimoReferencePath',
              'MiMo 參考錄音路徑',
              '本機 WAV／MP3 絕對路徑；含 Base64 字首後不超過 10 MB，約為 7.5 MB 原始音訊。合成時上傳至設定的 MiMo 服務，儲存後再試聽。',
            ),
          )
        : null,
      draft.chain?.some((row) => row.provider === 'siliconflow')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'SiliconFlow 參考聲音'),
            selectField(
              'siliconflowVoiceMode',
              'SiliconFlow 聲線來源',
              [
                ['preset', '選擇的音色／既有音色 ID'],
                ['reference', '本機參考錄音'],
              ],
              'preset',
              '參考錄音模式目前支援 CosyVoice2，會取代音色選單的選擇。儲存後再試聽。',
            ),
            draft.siliconflowVoiceMode === 'reference'
              ? React.createElement(
                  React.Fragment,
                  null,
                  textField(
                    'siliconflowReferencePath',
                    'SiliconFlow 參考 WAV 路徑',
                    '本機 PCM WAV 絕對路徑，少於 30 秒；建議 8–10 秒清楚的單人錄音。合成時錄音與逐字稿會傳至 SiliconFlow；本插件限制編碼後 10 MB。',
                  ),
                  textField(
                    'siliconflowReferenceText',
                    'SiliconFlow 參考逐字稿',
                    '逐字填入參考錄音說出的內容，最多 2000 字。',
                  ),
                )
              : null,
          )
        : null,
      draft.chain?.[0]?.provider === 'minimax'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'MiniMax 合成設定'),
            selectField(
              'minimaxTransport',
              'MiniMax 連線方式',
              [
                ['auto', '自動：有 API Key 用 HTTP，否則用 CLI'],
                ['http', '原生 HTTP API'],
                ['cli', '既有 mmx CLI'],
              ],
              'auto',
              'HTTP 失敗不會自動改用 CLI，避免重複合成。儲存後再試聽。',
            ),
            React.createElement(
              'label',
              { className: 'dts-field' },
              'MiniMax 情緒',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': 'MiniMax 情緒',
                  disabled: !writable || !optionsValid,
                  value: synthesisOptions.minimax?.emotion || '',
                  onChange: (e) => setProviderOption('minimax', 'emotion', e.target.value),
                },
                [
                  ['', '依文字自動判斷'],
                  ['happy', '開心'],
                  ['sad', '傷心'],
                  ['angry', '生氣'],
                  ['fearful', '害怕'],
                  ['disgusted', '厭惡'],
                  ['surprised', '驚訝'],
                  ['calm', '平靜'],
                  ['fluent', '流暢（僅 2.6）'],
                  ['whisper', '耳語（僅 2.6）'],
                ].map(([id, label]) => React.createElement('option', { key: id, value: id }, label)),
              ),
              React.createElement(
                'span',
                { className: 'dts-sub' },
                '情緒與進階合成參數需要 HTTP 模式；2.8 不支援耳語。',
              ),
            ),
          )
        : null,
      draft.chain?.[0]?.provider === 'cosyvoice'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'CosyVoice 服務設定'),
            textField('cosyvoiceUrl', 'CosyVoice 服務網址', '需要已啟動的外部推理服務。儲存後再試聽。'),
            selectField(
              'cosyvoiceApiMode',
              'CosyVoice API',
              [
                ['auto', '自動辨識官方服務／相容橋接'],
                ['official', '官方 FastAPI'],
                ['bridge', 'JSON /tts 橋接'],
              ],
              'auto',
              '只有官方 SFT 端點不存在時才嘗試橋接。',
            ),
            selectField(
              'cosyvoiceMode',
              'CosyVoice 合成模式',
              [
                ['sft', '內建音色 SFT'],
                ['instruct', '音色＋語氣指令'],
                ['instruct2', '參考聲音＋語氣指令（2／3）'],
                ['zero-shot', '參考聲音＋逐字稿'],
                ['cross-lingual', '跨語言參考聲音'],
              ],
              'sft',
              '可用模式取決於服務載入的模型；不會自動下載大型模型。',
            ),
            numberField(
              'cosyvoiceSampleRate',
              'CosyVoice 輸出取樣率',
              '必須與服務模型的實際 PCM 輸出一致，常見為 24000 Hz。',
              1000,
            ),
            ['instruct2', 'zero-shot', 'cross-lingual'].includes(draft.cosyvoiceMode)
              ? textField(
                  'cosyvoiceReferencePath',
                  'CosyVoice 參考 WAV 路徑',
                  '本機絕對路徑，10 MiB 以下的 PCM WAV；合成時傳給指定服務。',
                )
              : null,
            draft.cosyvoiceMode === 'zero-shot'
              ? textField('cosyvoiceReferenceText', 'CosyVoice 參考逐字稿', '逐字填入參考錄音說出的內容。')
              : null,
          )
        : null,
      React.createElement('div', { className: 'dts-sub' }, t('catalogSavedEndpoint')),
      ...['openaiBaseUrl', 'customBaseUrl', 'voaiBaseUrl', 'azureRegion']
        .filter(
          (key) =>
            ({ openaiBaseUrl: 'openai', customBaseUrl: 'custom', voaiBaseUrl: 'voai', azureRegion: 'azure' })[key] &&
            draft.chain?.some(
              (row) =>
                row.provider ===
                { openaiBaseUrl: 'openai', customBaseUrl: 'custom', voaiBaseUrl: 'voai', azureRegion: 'azure' }[key],
            ),
        )
        .map((key) =>
          React.createElement(
            'div',
            { key },
            textField(key, t(key), t(key === 'azureRegion' ? 'azureHint' : key + 'Hint')),
          ),
        ),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'voices', className: 'dts-studio-page', 'data-dts-page': 'voices' },
      React.createElement(LocalEnginesEditor, {
        active: page === 'voices',
        onAssets: setReferenceAssets,
        t: t,
        writable: writable,
        draft: draft,
        boolField: boolField,
        setTop: setTop,
      }),
      React.createElement(CloudVoicesEditor, { draft, writable, referenceAssets, setTop }),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'advanced', className: 'dts-studio-page', 'data-dts-page': 'advanced' },
      telemetryBadges,
      React.createElement(
        'details',
        { className: 'dts-block dts-extras' },
        React.createElement('summary', { className: 'dts-h' }, t('catalogExtras')),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('pronTitle')),
          boolField('enableItDictionary', t('enableItDictionary'), t('enableItDictionaryHint')),
          React.createElement(PronEditor, {
            t: t,
            writable: writable,
            value: draft && draft.pronunciation ? draft.pronunciation : [],
            onChange: (v) => setTop('pronunciation', v),
            onPreviewPhrase: onPreviewPhrase,
          }),
        ),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('rolesTitle')),
          boolField('autoDetectSubagent', t('autoDetectSubagent'), '子代理有設定專屬聲音時，自動改用該聲音朗讀它的回覆。'),
          React.createElement(RolesEditor, {
            cosyvoiceMode: draft.cosyvoiceMode || 'sft',
            catalogEpoch,
            defaultProvider: draft?.chain?.[0]?.provider || '',
            defaultModel: draft?.chain?.[0]?.model || '',
            defaultVoice: draft?.chain?.[0]?.voice || '',
            defaultStyle: draft?.chain?.[0]?.style || '',
            tuning: {
              rate: draft.rate ?? 1,
              pitch: draft.pitch ?? 0,
              volume: draft.volume ?? 1,
              instruction:
                (draft.chain?.[0]?.provider === 'doubao'
                  ? draft.doubaoInstruction
                  : draft.chain?.[0]?.provider === 'mimo'
                    ? draft.mimoInstruction
                    : draft.speechInstruction) || '',
              voiceDesign:
                (draft.chain?.[0]?.provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign) || '',
              voaiPitch: draft.voaiPitch ?? 0,
              doubaoPitch: draft.doubaoPitch ?? 0,
              styleWeight: draft.styleWeight ?? 0.5,
              breathPause: draft.breathPause ?? 0,
            },
            t: t,
            writable: writable,
            onPreview: onPreview,
            value: draft && draft.roles ? draft.roles : {},
            onChange: (v) => setTop('roles', v),
          }),
        ),
        React.createElement(EventChimesEditor, {
          t: t,
          writable: writable,
          value: draft && draft.eventChimes ? draft.eventChimes : {},
          onChange: (v) => setTop('eventChimes', v),
        }),
        React.createElement(VoicePacksGrid, {
          t: t,
          writable: writable,
          currentVoice: draft.chain?.[0]?.voice,
          currentRate: draft.rate,
          language: draft.language,
          // 只更換主要服務，保留其後的備援順序。
          onApply: (patch) => {
            if (patch.entry) setTop('chain', [patch.entry, ...(draft.chain || []).slice(1)])
            if (patch.rate) setTop('rate', patch.rate)
            if (patch.chime) setTop('chime', patch.chime)
            if (patch.language) setTop('language', patch.language)
          },
        }),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('statsTitle')),
          React.createElement(StatsPanel, { t: t }),
          React.createElement(UsagePanel),
        ),
        React.createElement(PluginUpdaterBlock, { t: t }),
      ),
      React.createElement(
        'details',
        { className: 'dts-block dts-extras' },
        React.createElement('summary', { className: 'dts-h' }, t('general')),
        React.createElement('div', { className: 'dts-group-title' }, '播放與打斷'),
        boolField('bargeIn', t('bargeIn'), t('bargeInHint')),
        boolField('vadBargeIn', t('vadBargeIn'), t('vadBargeInHint') + '（需先開啟上方的打斷功能）'),
        React.createElement(
          'label',
          { className: 'dts-field' },
          t('duckOnTyping'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: (draft && draft.duckOnTyping) || 'duck',
              disabled: !writable,
              onChange: (e) => setTop('duckOnTyping', e.target.value),
            },
            ['duck', 'pause', 'stop', 'off'].map((mode) =>
              React.createElement(
                'option',
                { key: mode, value: mode },
                t('duckOnTyping' + mode.charAt(0).toUpperCase() + mode.slice(1)) || mode,
              ),
            ),
          ),
          React.createElement('span', { className: 'dts-sub' }, t('duckOnTypingHint')),
        ),
        React.createElement('div', { className: 'dts-group-title' }, '朗讀內容過濾'),
        boolField('skipCode', t('skipCode'), t('skipCodeHint')),
        boolField('skipTables', t('skipTables'), t('skipTablesHint')),
        boolField('cleanUrls', t('cleanUrls'), t('cleanUrlsHint')),
        boolField('keepInlineCode', t('keepInlineCode'), t('keepInlineCodeHint')),
        boolField('adaptiveRate', t('adaptiveRate'), t('adaptiveRateHint')),
        boolField('tldrDefault', t('tldrDefault'), t('tldrDefaultHint')),
        React.createElement('div', { className: 'dts-group-title' }, '快取'),
        boolField('cache', t('cache'), t('cacheHint')),
        numberField('cacheMaxMb', t('cacheMaxMb'), t('cacheMaxMbHint'), 10),
        React.createElement(
          'label',
          { className: 'dts-field' },
          t('longReply'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: (draft && draft.longReply) || 'truncate',
              disabled: !writable,
              onChange: (e) => setTop('longReply', e.target.value),
            },
            ['truncate', 'summarize', 'full'].map((mode) =>
              React.createElement(
                'option',
                { key: mode, value: mode },
                t('longReply' + mode.charAt(0).toUpperCase() + mode.slice(1)) || mode,
              ),
            ),
          ),
          React.createElement('span', { className: 'dts-sub' }, t('longReplyHint')),
        ),
        React.createElement('div', { className: 'dts-group-title' }, '摘要與旁白'),
        textField('summaryModel', t('summaryModel'), t('summaryModelHint')),
        numberField('summarySentences', t('summarySentences'), t('summarySentencesHint'), 1),
        boolField('autoDetect', t('autoDetect'), t('autoDetectHint')),
        boolField('narrateQuotesOnly', t('narrateQuotesOnly'), t('narrateQuotesHint')),
        boolField('skipActions', t('skipActions'), t('skipActionsHint')),
        textField('removeRegex', t('removeRegex'), t('removeRegexHint')),
        React.createElement('div', { className: 'dts-group-title' }, '提醒用語與語言'),
        textField('approvalText', t('approvalText'), t('approvalHint')),
        textField('questionText', t('questionText'), t('questionHint')),
        selectField(
          'chime',
          t('chime'),
          [
            ['ding', 'ding（叮）'],
            ['beep', 'beep（嗶嗶）'],
            ['pop', 'pop（短促）'],
            ['subtle', 'subtle（輕柔）'],
            ['none', '無'],
          ],
          'ding',
          '朗讀提醒前播放的短音。',
        ),
        textField('language', t('language'), t('languageHint'), ['zh-TW', 'zh-CN', 'en', 'ja', 'ko']),
        React.createElement('div', { className: 'dts-group-title' }, '路徑與執行檔（一般不需要修改）'),
        textField('customKeyEnv', t('customKeyEnv'), t('customKeyEnvHint')),
        textField('piperModel', t('piperModel'), t('piperModelHint')),
        textField('piperBin', t('piperBin'), t('binHint')),
        textField('espeakBin', t('espeakBin'), t('espeakHint')),
        textField('edgeBin', t('edgeBin'), t('edgeHint')),
      ),
      React.createElement(
        'div',
        { className: 'dts-block' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-head',
            'aria-expanded': advancedOpen,
            onClick: () => {
              setAdvancedOpen((v) => {
                const next = !v
                try {
                  localStorage.setItem('dsh-tts/advancedOpen', next ? '1' : '0')
                } catch {
                  /* private mode */
                }
                return next
              })
            },
          },
          React.createElement(
            'div',
            { className: 'dts-headText' },
            React.createElement('div', { className: 'dts-title' }, t('advancedTitle')),
            React.createElement('div', { className: 'dts-sub' }, t('advancedHint')),
          ),
        ),
        advancedOpen
          ? React.createElement(
              'div',
              { className: 'dts-body' },
              numberField('maxChars', t('maxChars'), t('maxCharsHint'), 100),
              numberField('sentenceChars', t('sentenceChars'), t('sentenceCharsHint'), 20),
              numberField('timeoutMs', t('timeoutMs'), t('timeoutMsHint'), 1000),
              numberField('maxQueue', t('maxQueue'), t('maxQueueHint'), 1),
              textField(
                'deepinfraBaseUrl',
                'DeepInfra API 網址',
                '預設 https://api.deepinfra.com/v1/openai；Qwen 模型會使用對應原生 inference 路徑。',
              ),
              textField('mimoBaseUrl', t('mimoBaseUrl'), t('mimoBaseUrlHint')),
              textField('mimoFormat', t('mimoFormat'), t('mimoFormatHint'), ['mp3', 'wav']),
              textField('minimaxBaseUrl', 'MiniMax API 網址', '預設 https://api.minimax.io/v1；按帳號所屬區域設定。'),
              textField('minimaxBin', t('minimaxBin'), t('minimaxBinHint')),
              textField(
                'providerOptions',
                '進階合成設定（JSON）',
                '只填合成參數。例如 {"deepgram":{"expressivity":1,"speed":1.05},"elevenlabs":{"stability":0.5}}。與播放速度分開；留 {} 沿用服務商預設。',
              ),
              textField('doubaoAppId', t('doubaoAppId'), t('doubaoAppIdHint')),
              textField('doubaoCluster', t('doubaoCluster'), t('doubaoClusterHint')),
              textField('doubaoBaseUrl', t('doubaoBaseUrl'), t('doubaoAutoEndpoint')),
              textField('deepseekWebBaseUrl', t('deepseekWebBaseUrl'), t('deepseekWebBaseUrlHint')),
            )
          : null,
      ),
    ),
    React.createElement(
      'div',
      // 只有在有未儲存的變更時才固定在底部，平常留在頁面最下方，不遮住內容。
      { className: 'dts-foot', 'data-dirty': hasUnsaved ? 'true' : 'false' },
      hasUnsaved
        ? React.createElement('span', { className: 'dts-foot-note', role: 'status' }, '有尚未儲存的變更')
        : null,
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !writable, onClick: onClearCache },
        t('clearCache'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-save', disabled: !writable, onClick: save },
        t(saving ? 'catalogSaving' : 'save'),
      ),
      saved ? React.createElement('span', { className: 'dts-ok', role: 'status' }, t('catalogSaved')) : null,
      err ? React.createElement('span', { className: 'dts-bad', role: 'alert' }, err) : null,
    ),
  )
}
// ---- 41-tts-card.js
function TtsCard(props) {
  useUiLanguage()
  const t = (props && props.t) || ((key) => key)
  const [open, setOpen] = React.useState(false)
  return React.createElement(
    'li',
    { className: 'dts-card' },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'dts-head',
        onClick: () => setOpen(!open),
        'aria-expanded': open,
      },
      React.createElement(
        'div',
        { className: 'dts-headText' },
        React.createElement('div', { className: 'dts-title' }, t('title')),
        React.createElement('div', { className: 'dts-sub' }, t('cardHint')),
      ),
      ChevronIcon
        ? React.createElement(ChevronIcon, { className: 'dts-chev' + (open ? ' dts-chevOpen' : '') })
        : React.createElement(
            'svg',
            {
              className: 'dts-chev' + (open ? ' dts-chevOpen' : ''),
              width: 14,
              height: 14,
              viewBox: '0 0 16 16',
              fill: 'none',
            },
            React.createElement('path', {
              d: 'M4 6l4 4 4-4',
              stroke: 'currentColor',
              'stroke-width': 1.5,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            }),
          ),
    ),
    open
      ? React.createElement(
          'div',
          { className: 'dts-body' },
          React.createElement(
            ErrorBoundary,
            null,
            React.createElement(TtsSection, Object.assign({}, props, { compact: true, ctx: props && props.ctx })),
          ),
        )
      : null,
  )
}

// Per-message speak button in the reply action strip (left of the feedback
// thumbs). The slot only hands over the durable message id, so the reply
// text is read back from the rendered turn: the same prose blocks the
// built-in copy button copies.
// ---- 50-message-action.js
function replyTextFromTurn(el) {
  try {
    const tail = el && el.closest ? el.closest('[data-turn-tail]') : null
    if (!tail) return ''
    const turn = tail.getAttribute('data-turn-tail')
    // The tail sits in its own flow item, so climb until an ancestor also
    // holds rendered reply blocks, then keep only this turn's ones.
    let scope = tail.parentElement
    for (let hops = 0; scope && hops < 8; hops++) {
      if (scope.querySelector('[data-chat-flow-kind="assistant-step"]')) break
      scope = scope.parentElement
    }
    if (!scope) return ''
    const collect = (inProcess) => {
      const parts = []
      for (const node of scope.querySelectorAll('[data-chat-flow-kind="assistant-step"]')) {
        if (turn !== null && node.getAttribute('data-chat-turn') !== turn) continue
        if (node.querySelector('[data-turn-tail]')) continue
        const nestedProcess = !!node.closest('[data-turn-process-hidden]')
        if (nestedProcess !== inProcess) continue
        const text = String(node.innerText || node.textContent || '').trim()
        if (text) parts.push(text)
      }
      return parts
    }
    // Prose first; fall back to the compacted process answers only when the
    // turn kept the reply inside the process accordion.
    let parts = collect(false)
    if (!parts.length) parts = collect(true)
    return parts.join('\n\n').trim()
  } catch (unreadable) {
    return ''
  }
}

/** Rounded-square speaker chip, styled after the reference design. */
function speakGlyph() {
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
    React.createElement('path', {
      d: 'M11 5.6 6.7 9H3.6v6h3.1L11 18.4z',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    React.createElement('path', {
      'data-wave': '1',
      d: 'M14.7 9.3a3.8 3.8 0 0 1 0 5.4',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
    }),
    React.createElement('path', {
      'data-wave': '2',
      d: 'M17.8 6.5a8.2 8.2 0 0 1 0 11',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
    }),
  )
}

// Transport glyphs for the in-row playback cluster.
function transportIcon(name) {
  const stroke = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const kids = []
  if (name === 'pause') {
    kids.push(
      React.createElement('rect', { key: 'l', x: 7, y: 5, width: 3.2, height: 14, rx: 1, fill: 'currentColor' }),
    )
    kids.push(
      React.createElement('rect', { key: 'r', x: 13.8, y: 5, width: 3.2, height: 14, rx: 1, fill: 'currentColor' }),
    )
  } else if (name === 'play') {
    kids.push(React.createElement('path', { key: 'p', d: 'M8 5.6 19 12 8 18.4z', fill: 'currentColor' }))
  } else if (name === 'stop') {
    kids.push(
      React.createElement('rect', { key: 's', x: 6.5, y: 6.5, width: 11, height: 11, rx: 2, fill: 'currentColor' }),
    )
  } else if (name === 'skip') {
    kids.push(React.createElement('path', { key: 't', d: 'M6.5 5.8 14 12l-7.5 6.2z', fill: 'currentColor' }))
    kids.push(
      React.createElement('rect', { key: 'b', x: 15.6, y: 5.8, width: 2.4, height: 12.4, rx: 1, fill: 'currentColor' }),
    )
  } else {
    kids.push(React.createElement('path', { key: 'a', d: 'M12 4.5v9.4', ...stroke }))
    kids.push(React.createElement('path', { key: 'b', d: 'm8.4 10.4 3.6 3.6 3.6-3.6', ...stroke }))
    kids.push(React.createElement('path', { key: 'c', d: 'M5.5 17.6h13', ...stroke }))
  }
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
    kids,
  )
}

/** Does this reply own the transport cluster right now? */
function ownsTransport(tail) {
  if (!tail) return false
  if (activeTailEl && activeTailEl.isConnected) return tail === activeTailEl || tail.contains(activeTailEl)
  // Auto-speech has no explicit owner: the newest reply carries the controls.
  const all = document.querySelectorAll('[data-turn-tail]')
  return all.length > 0 && all[all.length - 1] === tail
}

function MessageSpeakAction(props) {
  useUiLanguage()
  const sessionId = useSessionIdentity(props) || player.sessionId
  const t = (props && props.t) || ((key) => key)
  const p = usePlayer()
  const btnRef = React.useRef(null)
  const menuRef = React.useRef(null)
  const textRef = React.useRef('')
  const seqRef = React.useRef(0)
  const [busy, setBusy] = React.useState(false)
  const [warn, setWarn] = React.useState(false)
  const [menu, setMenu] = React.useState(null)
  const active = !busy && !!p.audio && textRef.current !== '' && p.lastText === textRef.current

  React.useEffect(() => {
    if (!busy) return undefined
    const guard = setTimeout(() => {
      seqRef.current += 1
      stopPlayback()
      setBusy(false)
    }, 600000)
    return () => clearTimeout(guard)
  }, [busy])

  // Close the context menu on an outside press, Esc, or any scroll.
  React.useEffect(() => {
    if (!menu) return undefined
    const onDown = (event) => {
      if (menuRef.current && menuRef.current.contains(event.target)) return
      if (btnRef.current && btnRef.current.contains(event.target)) return
      setMenu(null)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenu(null)
    }
    // Scrolling inside the menu (its recent list) must not dismiss it.
    const onScroll = (event) => {
      if (event && menuRef.current && event.target && menuRef.current.contains(event.target)) return
      setMenu(null)
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [menu])

  // Keep the whole menu on screen: shift it up when it would run past the fold.
  React.useEffect(() => {
    if (!menu || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const overflow = rect.bottom - (window.innerHeight - 8)
    if (overflow > 0) {
      setMenu((current) => (current ? { x: current.x, y: Math.max(8, current.y - overflow) } : current))
    }
  }, [menu])

  const tailOf = () => (btnRef.current && btnRef.current.closest ? btnRef.current.closest('[data-turn-tail]') : null)

  const speak = (text, seq, tailEl, overrides = {}) => {
    return requestSpeech(text, overrides, sessionId)
      .then((item) => {
        if (seqRef.current !== seq || !item) return false
        playAudioItem(item)
        activeTailEl = tailEl
        return true
      })
      .catch((e) => {
        if (e.name !== 'AbortError') reportPlaybackError(e)
        return false
      })
  }

  const onClick = () => {
    if (menu) {
      setMenu(null)
      return
    }
    if (busy) {
      seqRef.current += 1
      stopPlayback()
      setBusy(false)
      return
    }
    if (active) {
      stopPlayback()
      return
    }
    const tailEl = tailOf()
    const text = replyTextFromTurn(btnRef.current)
    if (!text) {
      setWarn(true)
      setTimeout(() => setWarn(false), 1600)
      return
    }
    // Already synthesised this clip? Play it from memory instead of the network.
    const last = player.lastItem
    if (last && last.audioBase64 && last.text === text) {
      textRef.current = text
      replayRetained(last, tailEl)
      return
    }
    const seq = seqRef.current + 1
    seqRef.current = seq
    textRef.current = text
    setWarn(false)
    setBusy(true)
    speak(text, seq, tailEl).then((ok) => {
      if (seqRef.current !== seq) return
      setBusy(false)
      if (!ok) {
        setWarn(true)
        setTimeout(() => setWarn(false), 1600)
      }
    })
  }

  const openMenu = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const box = btnRef.current ? btnRef.current.getBoundingClientRect() : { left: event.clientX, bottom: event.clientY }
    const x = Math.max(8, Math.min(Math.round(box.left) - 8, window.innerWidth - 312))
    // Open just under the button; the measuring effect above shifts the menu
    // up if the (now scrollable, possibly tall) list would run past the fold.
    const y = Math.max(8, Math.min(Math.round(box.bottom) + 6, window.innerHeight - 120))
    setMenu({ x, y })
  }

  const run = (fn) => () => {
    setMenu(null)
    fn()
  }

  const label = active ? t('speakMessageStop') : t('speakMessage')
  const title = warn ? t('speakMessageEmpty') : label
  const button = React.createElement(
    'button',
    {
      ref: btnRef,
      type: 'button',
      className: 'dts-act',
      title,
      'aria-label': title,
      'aria-pressed': active || undefined,
      'data-active': active || undefined,
      'data-busy': busy || undefined,
      onClick,
      onContextMenu: openMenu,
    },
    speakGlyph(),
  )

  // Playback transport lives at the end of the same row, after the clock.
  const tail = tailOf()
  const speaking = isSpeakingNow()
  const transport =
    speaking && ownsTransport(tail)
      ? React.createElement(
          'div',
          { className: 'dts-transport' },
          React.createElement('input', {
            type: 'range',
            min: 0,
            max: Number.isFinite(p.audio?.duration) ? p.audio.duration : 0,
            step: 0.1,
            value: Number.isFinite(p.audio?.currentTime) ? p.audio.currentTime : 0,
            'aria-label': '語音播放進度',
            style: { width: 90 },
            onChange: (e) => {
              if (p.audio) p.audio.currentTime = Number(e.target.value)
            },
          }),
          React.createElement(
            'span',
            { title: p.playbackMode || 'HTMLAudio' },
            '第 ' + ((p.segmentIndex || 0) + 1) + ' / ' + (p.segmentTotal || '?') + ' 段',
          ),
          React.createElement(
            'select',
            {
              'aria-label': '播放速度',
              value: p.audio?.playbackRate || 1,
              onChange: (e) => {
                if (p.audio) p.audio.playbackRate = Number(e.target.value)
                playerChanged()
              },
            },
            [0.75, 1, 1.25, 1.5, 2].map((r) => React.createElement('option', { key: r, value: r }, r + '×')),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-tbtn',
              title: p.paused ? t('dockResume') : t('dockPause'),
              'aria-label': p.paused ? t('dockResume') : t('dockPause'),
              onClick: () => togglePause(),
            },
            transportIcon(p.paused ? 'play' : 'pause'),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-tbtn',
              title: t('dockStop'),
              'aria-label': t('dockStop'),
              onClick: () => stopPlayback(),
            },
            transportIcon('stop'),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-tbtn',
              title: t('dockSkip'),
              'aria-label': t('dockSkip'),
              onClick: () => skipCurrent(),
            },
            transportIcon('skip'),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-tbtn',
              title: t('exportAudio'),
              'aria-label': t('exportAudio'),
              onClick: () => exportAudioClip(),
            },
            transportIcon('export'),
          ),
        )
      : null

  if (!menu) return React.createElement(React.Fragment, null, button, transport)

  // Recents only, all of them: the menu scrolls when the list is longer than
  // the popup. Playback controls stay in the reply row, right of the clock.
  const history = recent.list().items || []

  const row = (text, index) =>
    React.createElement(
      'button',
      {
        key: `recent-${index}`,
        type: 'button',
        className: 'dts-menu-text',
        title: text,
        onClick: run(() => playStandalone(text)),
      },
      text.slice(0, 80),
    )

  const tldrButton = React.createElement(
    'button',
    {
      type: 'button',
      className: 'dts-menu-item',
      style: {
        width: '100%',
        textAlign: 'left',
        borderBottom: '1px solid var(--dsh-border, rgba(128,128,128,0.2))',
        paddingBottom: '6px',
        marginBottom: '4px',
      },
      onClick: run(() => {
        const tailEl = tailOf()
        const text = replyTextFromTurn(btnRef.current)
        if (!text) return
        const seq = seqRef.current + 1
        seqRef.current = seq
        textRef.current = text
        setBusy(true)
        speak(text, seq, tailEl, { tldr: true }).finally(() => {
          if (seqRef.current === seq) setBusy(false)
        })
      }),
    },
    React.createElement('span', null, t('speakMessageTldr')),
  )

  const menuEl = React.createElement(
    'div',
    {
      ref: menuRef,
      className: 'dts-menu',
      role: 'menu',
      style: { left: `${menu.x}px`, top: `${menu.y}px` },
      onContextMenu: (event) => {
        event.preventDefault()
        event.stopPropagation()
      },
    },
    tldrButton,
    history.length
      ? React.createElement(
          'div',
          {
            className: 'dts-menu-list',
            // Wheel over the list scrolls the list, not the conversation.
            onWheel: (event) => event.stopPropagation(),
          },
          history.map((text, index) => row(text, index)),
        )
      : React.createElement(
          'div',
          { className: 'dts-menu-item', style: { opacity: 0.45, cursor: 'default' } },
          React.createElement('span', null, t('recentEmpty')),
        ),
  )

  return React.createElement(React.Fragment, null, button, transport, menuEl)
}

function registerMessageAction(ctx) {
  try {
    ctx.slots.inject('conversation.chat.assistant-actions', () =>
      ctx.slots.register(
        {
          name: 'conversation.chat.assistant-actions',
          id: 'dsh-tts-speak',
          // 10 is the feedback thumbs; a lower order keeps us to their left.
          order: 5,
          locale: NS,
        },
        MessageSpeakAction,
      ),
    )
  } catch (seatUnavailable) {
    console.warn('[dsh-tts] reply action seat not available:', seatUnavailable && seatUnavailable.message)
  }
}

// The dock keeps only the "sound is blocked" hint now: the transport moved
// into the reply row, to the right of the message clock.
// ---- 51-speaker.js
function SpeakerControl(props) {
  useUiLanguage()
  const sessionId = useSessionIdentity(props)
  React.useEffect(() => {
    bindSession(sessionId)
    return () => bindSession(null)
  }, [sessionId])
  const t = (props && props.t) || fallbackDockText
  const p = usePlayer()
  const [saving, setSaving] = React.useState(false)
  const toggleAuto = async () => {
    if (saving) return
    setSaving(true)
    try {
      const r = await clientFetch('/dsh-sound-atelier/config'),
        d = await r.json()
      if (!r.ok || !d.ok) throw Error('無法讀取設定')
      const enabled = !d.config.speakReplies,
        next = await clientFetch('/dsh-sound-atelier/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d.config, speakReplies: enabled, revision: d.revision }),
        }),
        data = await next.json()
      if (!next.ok || !data.ok) throw Error(data.error?.message || '設定儲存失敗')
      p.enabled = enabled
      refreshStatusSoon()
      playerChanged()
    } catch (e) {
      reportPlaybackError(e)
    } finally {
      setSaving(false)
    }
  }
  return React.createElement(
    'div',
    { style: { position: 'relative', display: 'inline-flex', gap: '4px', alignItems: 'center' } },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'dts-link',
        'aria-label': '自動朗讀',
        'aria-pressed': !!p.enabled,
        title: p.enabled ? '關閉自動朗讀' : '開啟自動朗讀',
        disabled: saving,
        onClick: toggleAuto,
      },
      p.enabled ? '🔊' : '🔈',
    ),
    p.error
      ? React.createElement(
          'span',
          {
            role: 'alert',
            className: 'dts-sub dts-bad',
            onClick: () => {
              p.error = ''
              playerChanged()
            },
          },
          p.error,
        )
      : null,
    p.blocked
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-link dts-warn',
            title: t('unlockAudio') || 'Click to unlock audio',
            onClick: unlockAudio,
          },
          '🔔',
        )
      : null,
  )
}

/**
 * Fallback translator for the dock.
 *
 * Bound at registration for the page lifetime. The core draws the slot label;
 * props.t never reaches it, so the binder is the only way to give it a language.
 */
let fallbackDockText = (key) => key

function registerSpeaker(ctx) {
  // `locale` in the slot descriptor is how core injects translations into props.
  // Without it the dock would show raw keys only.
  fallbackDockText = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.dock',
        id: 'dsh-sound-atelier',
        locale: NS,
        order: 5,
        label: () => fallbackDockText('dockLabel'),
      },
      SpeakerControl,
    ),
  )
}

/**
 * Plugins page row seat (`plugins.row.config`, current core).
 *
 * The host page draws the title, icon and crumb and provides the content
 * padding, so the page view renders the settings form bare: our own card
 * chrome would double the border and shift the form out of the content
 * area. The summary view feeds the one-liner under the row title.
 */
// ---- 60-settings-page.js
function speechUiRegistry() {
  const key = Symbol.for('dsh.voice.settings.ui.v1')
  if (!window[key])
    window[key] = {
      reading: null,
      delivery: null,
      listeners: new Set(),
      notify() {
        for (const listener of [...this.listeners]) listener()
      },
    }
  return window[key]
}
function SpeechSettingsPage(props) {
  useUiLanguage()
  const registry = speechUiRegistry()
  const [, redraw] = React.useState(0)
  const [tab, setTab] = React.useState('reading')
  React.useEffect(() => {
    const listener = () => redraw((n) => n + 1)
    registry.listeners.add(listener)
    return () => registry.listeners.delete(listener)
  }, [registry])
  const Delivery = registry.delivery?.component
  return React.createElement(
    'div',
    { className: 'dts-page', 'aria-label': '語音設定' },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(UiLanguagePicker),
    ),
    React.createElement('h2', { style: { margin: '0 0 8px' } }, 'DSH 聲音工坊'),
    React.createElement('p', { className: 'dts-sub' }, '設定朗讀來源與角色聲音，查看通訊通道的語音能力及交付結果。'),
    React.createElement(
      'div',
      {
        role: 'tablist',
        'aria-label': '語音設定頁籤',
        style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' },
      },
      [
        ['reading', '朗讀與聲音'],
        ['delivery', '語音交付'],
      ].map(([id, title]) =>
        React.createElement(
          'button',
          {
            key: id,
            id: 'dsh-voice-tab-' + id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab === id,
            'aria-controls': 'dsh-voice-pane-' + id,
            className: 'dts-btn',
            onClick: () => setTab(id),
            onKeyDown: (event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'reading'
                    : event.key === 'End'
                      ? 'delivery'
                      : id === 'reading'
                        ? 'delivery'
                        : 'reading'
                setTab(next)
                document.getElementById('dsh-voice-tab-' + next)?.focus()
              }
            },
            tabIndex: tab === id ? 0 : -1,
          },
          title,
        ),
      ),
    ),
    React.createElement(
      'div',
      {
        id: 'dsh-voice-pane-reading',
        role: 'tabpanel',
        'aria-labelledby': 'dsh-voice-tab-reading',
        hidden: tab !== 'reading',
      },
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(TtsSection, Object.assign({}, props, { ctx: props && props.ctx })),
      ),
    ),
    React.createElement(
      'div',
      {
        id: 'dsh-voice-pane-delivery',
        role: 'tabpanel',
        'aria-labelledby': 'dsh-voice-tab-delivery',
        hidden: tab !== 'delivery',
      },
      React.createElement(ErrorBoundary, null, React.createElement(DiscordLinkCard, { active: tab === 'delivery' })),
      // 語音交付已內建；電腦上另外裝了舊的獨立橋接時，沿用它註冊的面板（狀態在它那邊）。
      React.createElement(
        ErrorBoundary,
        null,
        Delivery ? React.createElement(Delivery) : React.createElement(SpeechDeliveryPanel, { active: tab === 'delivery' }),
      ),
    ),
  )
}
exports.SpeechSettingsPage = SpeechSettingsPage

function TtsRowConfig(props) {
  useUiLanguage()
  const t = (props && props.t) || ((key) => key)
  if (props && props.view === 'summary') {
    return React.createElement('div', { className: 'dts-sub' }, t('subtitle'))
  }
  return React.createElement(SpeechSettingsPage, props)
}

function registerSettings(ctx) {
  ctx.effect(() => {
    const registry = speechUiRegistry(),
      token = {}
    registry.reading = token
    registry.notify()
    return () => {
      if (registry.reading === token) {
        registry.reading = null
        registry.notify()
      }
    }
  }, 'dsh-tts: unified voice settings owner')
  // Dictionary packages may also register languages for other namespaces.
  // Core throws on duplicate namespace+language; an unguarded call used to
  // take down the whole plugin ("Failed to load plugins"). Register each
  // language separately: skip if taken; English still lands.
  const addLocale = (locale, dictionary) => {
    try {
      return ctx.locale.register(NS, locale, dictionary)
    } catch (alreadyTaken) {
      return () => {}
    }
  }
  ctx.effect(() => {
    const undo = [addLocale('en', zh), addLocale('zh', zh), addLocale('zh-TW', zh)]
    return () => {
      for (const off of undo) off()
    }
  }, 'dsh-tts: locales')
  // The sidebar draws the section label, not our component: props.t never
  // reaches it, so bind the translator to the namespace ourselves.
  const t = (key) => zh[key] ?? key
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: NS,
        order: 55,
        label: () => 'DSH 聲音工坊',
        locale: NS,
        inject: () => ({ ctx, t }),
      },
      TtsRowConfig,
    ),
  )
  // Current core: settings live on the plugin's own row on the Plugins page
  // (`plugins.row.config`). Key = '<package name>#<row id>'; the row gains a
  // configure control that asks for view:'summary' and view:'page'.
  try {
    ctx.slots.inject('plugins.row.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.row.config',
          key: ROW_CONFIG_KEY,
          locale: NS,
          inject: () => ({ ctx: ctx }),
        },
        TtsRowConfig,
      ),
    )
  } catch (rowSeatUnavailable) {
    console.warn(
      '[dsh-tts] row seat plugins.row.config not available:',
      rowSeatUnavailable && rowSeatUnavailable.message,
    )
  }
  // Plugin-list seat (`plugins.item`): the seat the current core (0.1.6-alpha.2)
  // renders as the plugin's own page with its configuration. The label is a static
  // string on purpose — it is resolved while the page renders, and a locale lookup
  // there would take the whole client batch down with it.
  try {
    ctx.slots.inject('plugins.item', () =>
      ctx.slots.register(
        {
          name: 'plugins.item',
          id: ROW_ID,
          order: 60,
          label: () => fallbackDockText('title') || 'DSH-sound-atelier',
          locale: NS,
          inject: () => ({ ctx: ctx }),
        },
        TtsRowConfig,
      ),
    )
  } catch (itemSeatUnavailable) {
    console.warn('[dsh-tts] list seat plugins.item not available:', itemSeatUnavailable && itemSeatUnavailable.message)
  }
  // Fallback for hosts that render the older plugin-settings tab card. The tab
  // looks up a slot by entryKey equal to the namespace name: key must equal NS
  // or the card never appears, with no log error.
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: NS,
        locale: NS,
        inject: () => ({ ctx: ctx }),
      },
      TtsCard,
    ),
  )
}

exports.inject = ['slots', 'configForms', 'locale']
// ---- 70-overlay.js
let duckTimer = null
let preDuckVolume = 1
function handleTypingActivity() {
  if (!isSpeakingNow()) return
  const mode = player.duckOnTyping || 'duck'
  if (mode === 'off') return
  if (mode === 'stop') {
    stopPlayback()
    return
  }
  if (mode === 'pause') {
    if (!player.paused) togglePause()
    clearTimeout(duckTimer)
    duckTimer = setTimeout(() => {
      if (player.paused && player.busy) togglePause()
    }, 5000)
    return
  }
  if (mode === 'duck') {
    if (player.audio && !player.isDucked) {
      preDuckVolume = player.audio.volume || 1
      player.audio.volume = Math.max(0.1, preDuckVolume * 0.2)
      player.isDucked = true
    }
    clearTimeout(duckTimer)
    duckTimer = setTimeout(() => {
      if (player.audio && player.isDucked) {
        player.audio.volume = preDuckVolume
        player.isDucked = false
      }
    }, 3500)
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener(
    'input',
    (e) => {
      const tag = e.target && e.target.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
        handleTypingActivity()
      }
    },
    true,
  )
}

function ArchiveWatcher({ useWorkspaces }) {
  const ids = useWorkspaces((s) => s?.archivedSessionIds || null)
  React.useEffect(() => {
    if (!Array.isArray(ids)) return
    archivedSessions.clear()
    for (const id of ids) archivedSessions.add(id)
    if (archivedSessions.has(player.sessionId)) stopPlayback()
  }, [ids])
  return null
}
function PlaybackOverlay(props) {
  useUiLanguage()
  const p = usePlayer()
  React.useEffect(() => {
    if (!p.error) return
    const timer = setTimeout(() => {
      player.error = ''
      playerChanged()
    }, 10000)
    return () => clearTimeout(timer)
  }, [p.error])
  return React.createElement(
    React.Fragment,
    null,
    typeof props?.useWorkspaces === 'function'
      ? React.createElement(ArchiveWatcher, { useWorkspaces: props.useWorkspaces })
      : null,
    p.error
      ? React.createElement(
          'div',
          {
            className: 'dts-alert dts-alert-err',
            role: 'alert',
            style: { position: 'fixed', bottom: 24, left: 20, maxWidth: 'calc(100vw - 40px)', zIndex: 99999 },
          },
          p.error,
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              'aria-label': '關閉語音錯誤',
              onClick: () => {
                player.error = ''
                playerChanged()
              },
            },
            '×',
          ),
        )
      : null,
  )
}
exports.apply = function apply(ctx) {
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', key: 'dsh-tts-playback-guard', id: 'dsh-tts-playback-guard' },
      PlaybackOverlay,
    ),
  )
  registerSettings(ctx)
  registerSpeaker(ctx)
  registerMessageAction(ctx)
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'dts-btn'
    button.textContent = '朗讀選取文字'
    button.setAttribute('aria-label', '朗讀選取文字')
    button.style.cssText =
      'position:fixed;z-index:9999;display:none;max-width:calc(100vw - 16px);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#182236);border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;padding:7px 12px;box-shadow:0 3px 12px #0002'
    let selected = ''
    const hide = () => {
      button.style.display = 'none'
      selected = ''
    }
    const element = (n) => (n?.nodeType === 1 ? n : n?.parentElement)
    const update = () => {
      const selection = window.getSelection?.()
      if (!selection || selection.isCollapsed || !selection.rangeCount || !player.sessionId) return hide()
      const a = element(selection.anchorNode),
        b = element(selection.focusNode),
        start = a?.closest('[data-chat-flow-kind="assistant-step"]'),
        end = b?.closest('[data-chat-flow-kind="assistant-step"]')
      if (
        !start ||
        !end ||
        a.closest('input,textarea,[contenteditable="true"]') ||
        b.closest('input,textarea,[contenteditable="true"]')
      )
        return hide()
      if (
        start !== end &&
        (!start.getAttribute('data-chat-flow-turn') ||
          start.getAttribute('data-chat-flow-turn') !== end.getAttribute('data-chat-flow-turn'))
      )
        return hide()
      selected = selection.toString().trim()
      if (!selected || selected.length > 100000) return hide()
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      button.style.left = Math.max(8, Math.min(innerWidth - 170, rect.left)) + 'px'
      button.style.top = Math.max(8, Math.min(innerHeight - 44, rect.top - 40)) + 'px'
      button.style.display = 'block'
    }
    button.onpointerdown = (e) => e.preventDefault()
    button.onclick = () => {
      const text = selected,
        sid = player.sessionId
      hide()
      if (!text || !sid) return
      requestSpeech(text, {}, sid)
        .then((item) => {
          if (item) playAudioItem(item)
        })
        .catch(reportPlaybackError)
    }
    const key = (e) => {
      if (e.key === 'Escape') hide()
    }
    document.body.appendChild(button)
    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('keydown', key)
    return () => {
      button.remove()
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('keydown', key)
    }
  }, 'dsh-tts: selected reply text')
  ctx.effect(() => listenForVoice(), 'dsh-tts: barge-in on user speech')
  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {}
    const onKey = (e) => {
      // Shift+Space: stop while speaking, otherwise replay the last clip
      // (memory first, then the host cache) so a finished reply is one key away.
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault()
        if (e.repeat) return
        if (isSpeakingNow()) stopPlayback()
        else replayLast()
        return
      }
      if (e.ctrlKey && e.key === 'Escape') {
        togglePause()
        e.preventDefault()
      } else if (e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
        stopPlayback()
        e.preventDefault()
      } else if (e.altKey && e.key === 'ArrowRight') {
        skipCurrent()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, 'dsh-tts: hotkeys')
  ctx.effect(
    () => () => {
      if (streamCleanup) streamCleanup()
      stopPlayback()
      releaseSession(player.sessionId)
      ownershipChannel?.close()
    },
    'dsh-tts: scoped audio cleanup',
  )
  ctx.effect(() => {
    const release = () => {
      stopPlayback()
      releaseSession(player.sessionId)
    }
    window.addEventListener('pagehide', release)
    return () => window.removeEventListener('pagehide', release)
  }, 'dsh-tts: release playback on close')
  ctx.effect(() => {
    const timer = setInterval(() => {
      if (!player.owner || Date.now() < leaseUntil) return
      player.owner = false
      stopPlayback(false)
      if (requestController) requestController.abort()
      if (streamCleanup) {
        streamCleanup()
        streamCleanup = null
      }
    }, 250)
    return () => clearInterval(timer)
  }, 'dsh-tts: stop when playback lease expires')
  ctx.effect(() => {
    // Prime the status flag right away: autoplay used to wait out the first
    // interval tick, which dropped early stream items on a fresh start.
    pollPending()
    const timer = setInterval(pollPending, 1000)
    return () => clearInterval(timer)
  }, 'dsh-tts: poll pending audio')
}

    return module.exports
  },
})
