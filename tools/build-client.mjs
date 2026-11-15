// 由 lib/client-src/ 產生 lib/client.js。
//
//   node tools/build-client.mjs          重新產生 lib/client.js
//   node tools/build-client.mjs --check  只檢查產物是否與來源一致（不寫檔）
//
// lib/client-src/ 內的檔案依檔名排序後串接在同一個 factory 閉包內，彼此直接共用宣告，
// 因此不需要 import／export，也不需要打包工具。樣式寫在 lib/client-src/styles.css，
// 建置時嵌入為 SET_CSS 字串。請修改 lib/client-src/，不要直接修改 lib/client.js。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'lib', 'client-src')
const target = path.join(root, 'lib', 'client.js')

const HEAD = `// 建置產物：由 tools/build-client.mjs 從 lib/client-src/ 產生；請修改來源後重新建置。
window.__ModuleLoader__.load({
  id: 'dsh-sound-atelier',
  factory: (require) => {
`
const TAIL = `
    return module.exports
  },
})
`

const files = fs.readdirSync(srcDir).filter((name) => name.endsWith('.js')).sort()
const cssPath = path.join(srcDir, 'styles.css')
let body = ''
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n')
  body += `// ---- styles.css\nconst SET_CSS = ${JSON.stringify(css)};\n`
}
for (const name of files) {
  body += `// ---- ${name}\n${fs.readFileSync(path.join(srcDir, name), 'utf8').replace(/\r\n/g, '\n').trimEnd()}\n`
}
const output = HEAD + body + TAIL

if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : ''
  if (current !== output) {
    console.error('lib/client.js 與 lib/client-src/ 不一致；請執行 node tools/build-client.mjs')
    process.exit(1)
  }
  console.log('lib/client.js 與 lib/client-src/ 一致')
} else {
  fs.writeFileSync(target, output)
  console.log(`lib/client.js 已產生（${files.length} 個來源檔，${output.length} 字元）`)
}
