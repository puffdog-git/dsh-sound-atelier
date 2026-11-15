// Callback-to-iterator bridge: one packet in flight, producer waits for consumer.
export async function* pcmSource(run,signal){
 const controller=new AbortController(),combined=AbortSignal.any([controller.signal,...(signal?[signal]:[])]);let packet,done=false,failure,wake=()=>{},rejectPacket;
 const notify=()=>wake(),abort=()=>{failure=combined.reason||Error('語音串流已取消');rejectPacket?.(failure);notify()};combined.addEventListener('abort',abort,{once:true});if(combined.aborted)abort()
 const producer=Promise.resolve().then(()=>{combined.throwIfAborted();return run(combined,bytes=>new Promise((resolve,reject)=>{combined.throwIfAborted();if(!bytes?.length||bytes.length>1024*1024||bytes.length%2||packet)throw Error('PCM 串流封包無效或超過緩衝上限');packet={bytes:Buffer.from(bytes),resolve,reject};rejectPacket=reject;notify()}))}).then(()=>{done=true;notify()},e=>{failure=e;done=true;notify()})
 try{while(true){combined.throwIfAborted();if(failure)throw failure;if(packet){const p=packet;packet=null;yield p.bytes;p.resolve();rejectPacket=null;continue}if(done)break;await new Promise(r=>wake=r)}}finally{controller.abort();combined.removeEventListener('abort',abort);packet?.reject(Error('串流接收端已結束'));rejectPacket?.(Error('串流接收端已結束'));void producer}
}
