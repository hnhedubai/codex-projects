import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const excluded=name=>['.git','node_modules','backups','exports','.cache'].includes(name)||/^\.env(?:\.|$)/i.test(name)||/\.(?:pem|key|pfx|log|tmp)$/i.test(name);
async function files(root,relative=''){
 const output=[];
 for(const item of await readdir(path.join(root,relative),{withFileTypes:true})){
  if(excluded(item.name)||item.isSymbolicLink())continue;
  const entry=path.join(relative,item.name);
  if(item.isDirectory())output.push(...await files(root,entry));else if(item.isFile())output.push(entry);
 }
 return output.sort();
}
export async function createCheckpoint(root){
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const destination=path.join(root,'backups',`preserved-${stamp}-${randomUUID().slice(0,8)}`);
 await mkdir(destination,{recursive:true});
 const manifest={createdAt:new Date().toISOString(),timezone:'Asia/Dubai',root,exclusions:'Git metadata, dependencies, backups, exports, .env credentials, private-key files, logs and temporary files. Browser localStorage is not included.',files:[]};
 for(const relative of await files(root)){
  const bytes=await readFile(path.join(root,relative)),target=path.join(destination,'files',relative);
  await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx'});
  manifest.files.push({path:relative.split(path.sep).join('/'),bytes:bytes.length,sha256:hash(bytes)});
 }
 await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
 const result=await verifyCheckpoint(root,destination);
 if(result.changed.length||result.missing.length||result.backupDamaged.length)throw Error('Files changed while the checkpoint was created. The snapshot was retained; create another checkpoint when writes have finished.');
 return {destination,...result};
}
export async function verifyCheckpoint(root,destination){
 const manifest=JSON.parse(await readFile(path.join(destination,'manifest.json'),'utf8'));
 const changed=[],missing=[],backupDamaged=[];
 for(const entry of manifest.files){
  const target=path.resolve(root,entry.path),backup=path.resolve(destination,'files',entry.path);
  if(!target.startsWith(path.resolve(root)+path.sep)||!backup.startsWith(path.resolve(destination,'files')+path.sep))throw Error('Unsafe manifest path.');
  try{if(hash(await readFile(backup))!==entry.sha256)backupDamaged.push(entry.path);}catch{backupDamaged.push(entry.path);}
  try{if(hash(await readFile(target))!==entry.sha256)changed.push(entry.path);}catch{missing.push(entry.path);}
 }
 const known=new Set(manifest.files.map(entry=>entry.path));
 const added=(await files(root)).map(item=>item.split(path.sep).join('/')).filter(item=>!known.has(item));
 return {checked:manifest.files.length,changed,missing,backupDamaged,added};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 const result=process.argv[2]==='verify'?await verifyCheckpoint(root,path.resolve(process.argv[3])):await createCheckpoint(root);
 console.log(JSON.stringify(result,null,2));
 if(result.changed.length||result.missing.length||result.backupDamaged.length)process.exitCode=1;
}
