// SSML is an explicit manual input mode. Never auto-interpret chat prose as XML.
export function validateSsml(text) {
 if(typeof text!=='string'||!/^\s*<speak(?:\s[^>]*)?>[\s\S]*<\/speak>\s*$/.test(text)||/<!DOCTYPE|<!ENTITY|<\?/i.test(text)||Buffer.byteLength(text)>256*1024)throw Error('Provide an explicit <speak> SSML document without DTD/entities')
 return text
}
