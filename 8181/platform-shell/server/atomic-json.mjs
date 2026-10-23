import {mkdir,open,rename} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// The provider is never retried here: only the local, already-completed save.
export async function atomicJson(file,value){
 await mkdir(path.dirname(file),{recursive:true});
 const handle=await open(file+'.tmp','w');
 try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
 for(let attempt=0;;attempt++){
  try{await rename(file+'.tmp',file);return;}catch(error){
   if(attempt>=3||!['EPERM','EBUSY','EACCES'].includes(error.code))throw error;
   await delay(50*2**attempt);
  }
 }
}
