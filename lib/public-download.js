import https from 'node:https'
import dns from 'node:dns/promises'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import {Transform} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {createHash} from 'node:crypto'
export function publicAddress(ip){
 if(ip.includes(':')){const s=ip.toLowerCase();if(s.startsWith('::ffff:'))return publicAddress(s.slice(7));return /^[23][0-9a-f]{0,3}:/.test(s)&&!s.startsWith('2001:db8:')}
 const n=ip.split('.').map(Number);if(n.length!==4||n.some(v=>!Number.isInteger(v)||v<0||v>255))return false
 const[a,b]=n;return a>0&&a<224&&![10,127].includes(a)&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&[0,168].includes(b))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&[18,19].includes(b))
}
async function open(url,signal,redirects=0){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')throw Error('Registry downloads require a public HTTPS URL without credentials')
 const addresses=await dns.lookup(u.hostname,{all:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Private/network-local registry destinations are not allowed')
 signal?.throwIfAborted()
 const response=await new Promise((resolve,reject)=>{const target=addresses[0],request=https.get(u,{agent:false,lookup:(_host,options,callback)=>options.all?callback(null,[target]):callback(null,target.address,target.family),signal,timeout:30000},resolve);request.on('error',()=>reject(Error('Registry connection failed')));request.on('timeout',()=>request.destroy(Error('Registry download timed out')))})
 if([301,302,303,307,308].includes(response.statusCode)){response.resume();if(redirects>=4||!response.headers.location)throw Error('Registry redirect limit exceeded');return open(new URL(response.headers.location,u).href,signal,redirects+1)}
 if(response.statusCode!==200){response.resume();throw Error('Registry download HTTP '+response.statusCode)}return response
}
export async function publicJson(url,{signal,maxBytes=2*1024*1024}={}){const response=await open(url,signal),parts=[];let count=0;try{for await(const b of response){count+=b.length;if(count>maxBytes)throw Error('Registry manifest exceeds size limit');parts.push(b)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}finally{response.destroy()}}
export async function publicFile(url,file,{signal,maxBytes,sha256}={}){
 if(!/^[a-f0-9]{64}$/i.test(sha256||''))throw Error('A SHA256-pinned registry artifact is required')
 const response=await open(url,signal),hash=createHash('sha256');let bytes=0
 const meter=new Transform({transform(b,_e,done){bytes+=b.length;if(bytes>maxBytes)return done(Error('Registry artifact exceeds size limit'));hash.update(b);done(null,b)}})
 try{await pipeline(response,meter,fs.createWriteStream(file,{flags:'wx',mode:0o600}),{signal});if(hash.digest('hex')!==sha256.toLowerCase())throw Error('Registry artifact SHA256 mismatch');return {bytes,sha256:sha256.toLowerCase()}}
 catch(e){await fsp.rm(file,{force:true}).catch(()=>{});throw e}finally{response.destroy()}
}
