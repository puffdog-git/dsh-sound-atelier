import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.match(pkg.version,/^[0-9]+[.][0-9]+[.][0-9]+$/,'版本號格式'); assert.notEqual(pkg.private,true,'private 會擋住 npm 發布');assert.ok(pkg.keywords?.includes('dsh-plugin'),'keywords 需要 dsh-plugin');assert.ok(pkg.dsh?.bundle?.patch,'市集要求 dsh.bundle'); assert.equal(pkg.author.name,'puffdog-git');
for(const name of ['LICENSE','README.md','INSTALL.md','SECURITY.md','RELEASE.md','THIRD-PARTY-NOTICES.md']) assert.ok(fs.existsSync(path.join(root,name)),name);
const lockPath=path.join(root,'package-lock.json');
if(fs.existsSync(lockPath)){const lock=JSON.parse(fs.readFileSync(lockPath,'utf8')); for(const key of ['name','version']){assert.equal(lock[key],pkg[key]);assert.equal(lock.packages[''][key],pkg[key]);} assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);}
const source=pkg.name.includes('discord')?'client-src':'lib/client-src';
assert.ok(fs.existsSync(path.join(root,source,'styles.css')));
for(const value of Object.values(pkg.exports)) assert.ok(fs.existsSync(path.join(root,value)),value);
console.log(JSON.stringify({ok:true,name:pkg.name,version:pkg.version}));
