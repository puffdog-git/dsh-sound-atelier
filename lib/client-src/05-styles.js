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
