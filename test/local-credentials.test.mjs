import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {saveLocalCredentials,readLocalCredentials,localServiceKey,localManagementToken} from '../lib/local-credentials.js'
test('managed credentials are encrypted for the current Windows user and bound to one loopback origin',{skip:process.platform!=='win32'},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-dpapi-'))
 try{
  const record={origin:'http://127.0.0.1:9997',password:'fixture-password-only',apiKey:'fixture-api-key-only',clientUsername:'fixture-client',clientPassword:'fixture-client-password'}
  const stored=await saveLocalCredentials(record,{root}),bytes=await fs.readFile(stored.path)
  assert.equal(bytes.includes(Buffer.from(record.password)),false)
  assert.equal((await readLocalCredentials({localTtsBaseUrl:record.origin},{root})).apiKey,record.apiKey)
  assert.equal(await readLocalCredentials({localTtsBaseUrl:'http://127.0.0.1:9998'},{root}),null)
  await assert.rejects(readLocalCredentials({localTtsBaseUrl:'https://example.com'},{root}),/loopback/)
  let logins=0
  const options={root,fetchImpl:async(url,init)=>{logins++;assert.equal(url,record.origin+'/token');assert.equal(JSON.parse(init.body).username,'fixture-client');return Response.json({access_token:'fixture-management-token'})}}
  assert.equal(await localManagementToken({localTtsBaseUrl:record.origin},null,options),'fixture-management-token')
  await localManagementToken({localTtsBaseUrl:record.origin},null,options);assert.equal(logins,1)
  assert.equal(await localServiceKey({localTtsBaseUrl:record.origin},null,{root}),record.apiKey)
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
