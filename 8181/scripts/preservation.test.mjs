import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createCheckpoint,verifyCheckpoint} from './checkpoint.mjs';

test('new browser sessions retain project selection, linked offer, editor and previous draft versions',async()=>{
 const source=await readFile(new URL('../platform-shell/shared/js/navigation.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('export class NavigationDrafts'),source.indexOf('/** Single shell'));
 const context=vm.createContext({});vm.runInContext(code.replace('export class','class')+';globalThis.Drafts=NavigationDrafts;',context);
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const route={path:'/investors-jv',id:'fixture',tab:'outreach'};
 const entry={projectPicker:{selectedIds:['project-a']},offerContext:{projectIds:['project-a'],draft:'current'},fields:{'outreach-draft':{value:'current'}},pitchVersions:[{text:'previous'}]};
 assert.equal(new context.Drafts(storage).write(route,entry),true);
 assert.equal(JSON.stringify(new context.Drafts(storage).read(route)),JSON.stringify(entry));
});
test('production server keeps mandatory Reoon gate and two-column readable project styles',async()=>{
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');assert.match(server,/verifyRecipients:createReoonSendGate\(reoon,contactCatalog\)/);
 const settings=await readFile(new URL('../modules/investors-jv/outreach-settings.js',import.meta.url),'utf8');assert.match(settings,/OUTREACH_PROJECT_PICKER\s*=\s*true/);
 const css=await readFile(new URL('../modules/investors-jv/project-picker.css',import.meta.url),'utf8');assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/font-size:16px/);assert.match(css,/font-size:14px;color:#465e56/);
});
test('checkpoint preserves runtime records, excludes credentials, and detects later edits without restoring anything',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'8181-preservation-'));
 try{
  await mkdir(path.join(root,'platform-shell','data'),{recursive:true});await writeFile(path.join(root,'platform-shell','data','history.json'),'saved history');
  await writeFile(path.join(root,'server.mjs'),'original');await writeFile(path.join(root,'.env.local'),'private');
  const checkpoint=await createCheckpoint(root);assert.equal(checkpoint.checked,2);assert.equal(checkpoint.changed.length,0);
  await writeFile(path.join(root,'server.mjs'),'changed');const result=await verifyCheckpoint(root,checkpoint.destination);assert.deepEqual(result.changed,['server.mjs']);assert.equal(result.backupDamaged.length,0);
  assert.equal(await readFile(path.join(root,'server.mjs'),'utf8'),'changed');
 }finally{await rm(root,{recursive:true,force:true});}
});
