import http from 'node:http'
import https from 'node:https'
import {Readable} from 'node:stream'
// Model downloads can exceed Node fetch's five-minute headers timeout. Keep
// caller-controlled deadlines and cancellation, but only on loopback services.
export async function localManagementFetch(url,options={}){
 const u=new URL(url)
 if(!['http:','https:'].includes(u.protocol)||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.hash)throw Error('Local management transport requires a loopback URL')
 if(options.body!==undefined&&typeof options.body!=='string'&&!Buffer.isBuffer(options.body))throw Error('Local management expects a JSON/string request body')
 options.signal?.throwIfAborted()
 return new Promise((resolve,reject)=>{
  const headers={...options.headers};if(options.body!==undefined)headers['content-length']=Buffer.byteLength(options.body)
  const req=(u.protocol==='https:'?https:http).request(u,{method:options.method||'GET',headers,agent:false,signal:options.signal},res=>{
   if(res.statusCode>=300&&res.statusCode<400){res.destroy();reject(Error('Local management redirects are not permitted'));return}
   if([204,205,304].includes(res.statusCode)){res.resume();resolve(new Response(null,{status:res.statusCode,headers:res.headers}));return}
   resolve(new Response(Readable.toWeb(res),{status:res.statusCode,headers:res.headers}))
  })
  req.setTimeout(30*60000,()=>req.destroy(Error('Local management operation timed out')))
  req.on('error',()=>reject(Error(options.signal?.aborted?'Local management cancelled':'Local management connection failed')))
  req.end(options.body)
 })
}
