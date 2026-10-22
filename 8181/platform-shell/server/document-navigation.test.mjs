import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {localDocumentNavigation} from './document-navigation.mjs';
const pages=new Set(['/investors-jv','/listed-projects','/nda-guard']);
const navigation={method:'GET',headers:{host:'localhost:8181','sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','sec-fetch-dest':'document',origin:'https://example.invalid'},socket:{localPort:8181}};
test('cross-site top-level document visits are allowed only on exact local app entry pages',()=>{
 for(const page of pages)assert.equal(localDocumentNavigation(navigation,page,pages),true);
 for(const pathname of ['/api/pulse/status','/api/outreach-data/export','/data/records.js','/modules/investors-jv/data/source.js','/nda-guard/NDA_1__Viktoriia_V2.docx','/investors-jv/other'])assert.equal(localDocumentNavigation(navigation,pathname,pages),false);
 for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal(localDocumentNavigation({...navigation,method},'/investors-jv',pages),false);
 for(const destination of ['iframe','frame','script','empty'])assert.equal(localDocumentNavigation({...navigation,headers:{...navigation.headers,'sec-fetch-dest':destination}},'/investors-jv',pages),false);
 for(const mode of ['cors','no-cors','same-origin'])assert.equal(localDocumentNavigation({...navigation,headers:{...navigation.headers,'sec-fetch-mode':mode}},'/investors-jv',pages),false);
 for(const host of ['audit.invalid:8181','localhost:9999','localhost:8181.evil.invalid'])assert.equal(localDocumentNavigation({...navigation,headers:{...navigation.headers,host}},'/investors-jv',pages),false);
});
test('real server permits browser navigation but still rejects cross-origin data reads, exports and mutations',async()=>{
 const port=await new Promise(resolve=>{const probe=createServer().listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>resolve(port));});});
 const child=spawn(process.execPath,[fileURLToPath(new URL('../../server.mjs',import.meta.url))],{env:{...process.env,OPLATFORM_PORT:String(port)},stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server did not start')),10000);child.stdout.on('data',chunk=>{if(String(chunk).includes('Opportunity platform')){clearTimeout(timeout);resolve();}});child.once('exit',code=>{clearTimeout(timeout);reject(Error(`Server exited ${code}: ${stderr}`));});});
  const get=(pathname,{method='GET',...headers}={})=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:pathname,method,headers:{Host:`localhost:${port}`,...headers}},res=>{let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end();});
  const external={'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document',Origin:'https://example.invalid'};
  for(const pathname of ['/investors-jv','/listed-projects','/wind-projects','/nda-guard']){const response=await get(pathname,external);assert.equal(response.status,200,pathname);assert.match(response.body,/<!doctype html/i);}
  for(const pathname of ['/api/reoon/status','/api/reoon/verify','/api/pulse/status','/api/pulse/investors-jv/send','/api/outreach-data/export','/data/records.js','/modules/investors-jv/data/source.js','/nda-guard/NDA_1__Viktoriia_V2.docx'])assert.equal((await get(pathname,external)).status,403,pathname);
  assert.equal((await get('/investors-jv',{...external,'Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'})).status,403);
  assert.equal((await get('/investors-jv',{...external,'Sec-Fetch-Dest':'iframe'})).status,403);
  assert.equal((await get('/investors-jv',{...external,method:'POST'})).status,403);
  assert.equal((await get('/investors-jv',{...external,Host:`audit.invalid:${port}`})).status,403);
  assert.equal((await get('/shared/js/shell.js',{'Sec-Fetch-Site':'same-origin'})).status,200);
  assert.equal((await get('/investors-jv')).status,200);
 }finally{child.kill();}
});
