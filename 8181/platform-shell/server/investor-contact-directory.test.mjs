import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {InvestorContactDirectory} from './investor-contact-directory.mjs';

test('live source helper edits, company additions and contacts are refreshed without restart; bad edits retain last snapshot',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'8181-directory-test-'));
 try{
  const data=path.join(root,'modules/investors-jv/data');await mkdir(data,{recursive:true});
  await writeFile(path.join(root,'package.json'),'{"type":"module"}');
  await writeFile(path.join(data,'source.js'),"export {partnerRecords,partnerContacts} from './helper.js';");
  await writeFile(path.join(data,'helper.js'),"export const partnerRecords=[{id:'a',company:'First'}];export const partnerContacts={a:[{name:'CEO'}]};");
  const directory=new InvestorContactDirectory(root),first=await directory.read();assert.equal(first.companies.length,1);assert.equal(first.stale,false);
  const same=await directory.read();assert.equal(same.companies,first.companies,'unchanged graph is cached');
  await writeFile(path.join(data,'helper.js'),"export const partnerRecords=[{id:'a',company:'First'},{id:'b',company:'New'}];export const partnerContacts={a:[{name:'CEO'},{name:'New Director'}],b:[]};");
  const next=await directory.read();assert.equal(next.companies.length,2);assert.equal(next.companies[0].contacts.length,2);assert.notEqual(next.revision,first.revision);
  await writeFile(path.join(data,'helper.js'),'not valid javascript !!!');
  const stale=await directory.read();assert.equal(stale.stale,true);assert.equal(stale.companies,next.companies);assert.match(stale.error,/last successful/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('unavailable initial source reports safely, without printing source contents',async()=>{
 const directory=new InvestorContactDirectory(path.join(tmpdir(),'does-not-exist-8181-directory'));
 await assert.rejects(directory.read(),/temporarily unavailable/);
});
test('directory API is read-only, same-origin, and reads public saved Reoon results only',async()=>{
 const source=await readFile(new URL('../../server.mjs',import.meta.url),'utf8');
 const block=source.slice(source.indexOf("if(url.pathname==='/api/investors-jv/contact-directory')"),source.indexOf('if(jevRoutes.matches'));
 assert.match(block,/trustedLocalRequest/);assert.match(block,/req.method!=='GET'/);assert.match(block,/results:reoon.results\(\)/);assert.doesNotMatch(block,/reoon.verify|process.env|raw|send\(/);
});
