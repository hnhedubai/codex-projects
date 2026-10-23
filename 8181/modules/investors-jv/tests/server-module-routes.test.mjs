import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('investors-jv relative data imports are served by the local server',async()=>{
 const source=await readFile(new URL('../data/source.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../../../server.mjs',import.meta.url),'utf8');
 const imports=[...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)].map(match=>match[1]);
 for(const relative of imports){
  const file=relative.replace(/^\.\//,'');
  assert.match(server,new RegExp(`/modules/investors-jv/data/${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`),`Missing server route for ${file}`);
 }
});
