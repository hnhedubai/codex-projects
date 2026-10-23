/** Failed requests never become empty modules; successful datasets are reused. */
export class ModuleLoader {
 constructor({records,snapshotUrl,hydrate,fetchImpl=(...args)=>fetch(...args),timeout=20000}){Object.assign(this,{records,snapshotUrl,hydrate,fetchImpl,timeout});this.cache=new Map();}
 load(path){
  if(this.cache.has(path))return this.cache.get(path);
  let timer;
  const request=Promise.race([this.read(path),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Module loading timed out.')),this.timeout);})]).catch(error=>{this.cache.delete(path);throw error;}).finally(()=>clearTimeout(timer));
  this.cache.set(path,request);return request;
 }
 async read(path){
  const {listedRows,windRows,partnerRows,hydrogenRows,loadLegacyRows}=await this.records();
  const rows=path==='/listed-projects'?listedRows:path==='/wind-projects'?windRows:path==='/investors-jv'?partnerRows:path==='/hydrogen-offtakers'?hydrogenRows:await loadLegacyRows(path);
  let snapshot={};const url=this.snapshotUrl(path);
  if(url&&!(path==='/diesel-en590'&&rows.every(row=>row.source?.contactSnapshotLoaded))){
   const response=await this.fetchImpl(url);if(!response.ok)throw Error(`Contact data unavailable (HTTP ${response.status}).`);snapshot=await response.json();
  }
  return this.hydrate(rows,snapshot);
 }
}
