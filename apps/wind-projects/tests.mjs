import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from './server.mjs';
import {projects,diligence} from './dist/data.js';
import {normalizeWidths} from './dist/column-widths.js';
test('column widths restore safely and clamp to usable limits',()=>{
 assert.deepEqual(normalizeWidths([240,20,900,null,'200',NaN], [150,150,150,150,150,150]), [240,90,800,150,150,150]);
 assert.deepEqual(normalizeWidths(null,[160,200]),[160,200]);
 assert.deepEqual(normalizeWidths([215.6],[160,200]),[216,200]);
});
test('33 unique project records with standard research structure',()=>{
 assert.equal(projects.length,33);assert.equal(new Set(projects.map(p=>p.id)).size,33);
 for(const p of projects){for(const k of ['name','country','developer','capacity','signal','summary','stage','partnership'])assert.equal(typeof p[k],'string',`${p.id}.${k}`);assert.ok(p.gaps.length);assert.ok(p.sources.length);for(const s of p.sources)assert.equal(new URL(s.url).protocol,'https:');for(const c of p.contacts){assert.ok(c.name&&c.title&&c.role);if(c.linkedin)assert.equal(new URL(c.linkedin).protocol,'https:');}}
});
test('verification caveats preserved, expanded dossiers have history and contacts',()=>{assert.ok(projects.find(p=>p.id==='theodore').contacts.every(c=>c.status==='User-reported invalid'));assert.ok(projects.find(p=>p.id==='eskom').contacts.every(c=>c.status.includes('Unknown')));for(const id of ['berwick-b','nose-hill']){const p=projects.find(p=>p.id===id);assert.ok(p.history.length>=3);assert.ok(p.contacts.length>=3);assert.ok(p.financials.length>=3);}assert.equal(diligence.length,10);});
test('local server serves only allowlisted assets and read methods',async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const base=`http://127.0.0.1:${server.address().port}`;for(const path of ['/wind-projects','/wind-projects/','/wind-projects/app.js','/wind-projects/data.js','/wind-projects/styles.css'])assert.equal((await fetch(base+path)).status,200);assert.equal((await fetch(base+'/wind-projects',{method:'POST'})).status,405);assert.equal((await fetch(base+'/server.mjs')).status,404);assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/wind-projects/%2e%2e/server.mjs')).status,404);assert.equal(await(await fetch(base+'/wind-projects',{method:'HEAD'})).text(),'');assert.ok((await fetch(base+'/wind-projects')).headers.get('content-security-policy'));}finally{await new Promise(r=>server.close(r));}});
