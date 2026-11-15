// 狀態端點只給本機介面讀取：連線來源必須是本機，而且 Host 標頭本身也要是本機位址。
// 後者擋住 DNS rebinding（瀏覽器從 127.0.0.1 連入，但 Host 是外部網域）。
const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1', '::ffff:127.0.0.1']
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]']

export function isLocalRequest(req) {
  if (!LOOPBACK_ADDRESSES.includes(req?.socket?.remoteAddress || '')) return false
  const host = req.headers?.host
  if (host === undefined || host === '') return true
  if (typeof host !== 'string') return false
  const value = host.trim().toLowerCase()
  const name = value.startsWith('[') ? value.slice(0, value.indexOf(']') + 1) : value.replace(/:\d+$/, '')
  return LOOPBACK_HOSTS.includes(name)
}
