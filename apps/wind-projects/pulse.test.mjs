import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from './server.mjs';
import {createContactStore} from './contact-store.mjs';
import {createSendStore} from './send-store.mjs';
import {createPulseClient,validateSend,buildCalls,runSend} from './pulse.mjs';
import {formatBody,parseDraft,personalise,greetingName} from './dist/format.mjs';

const KEY='pulse_test_secret_key_123';
const draft='Subject: Ghana wind portfolio — Partnership\n\nDear Project Team,\n\nI am contacting you regarding the portfolio.\nPlease see https://example.com/a?b=1&c=2.\n\n- First point\n- Second <b>point</b>\n\nKind regards,';
const contacts=[{id:'c1',name:'Dr. Christoph Kapp',emails:['ck@example.com']},{id:'c2',name:'Jeff Amoah',emails:['ja@example.com']},{id:'c3',name:'Info desk',emails:['info@example.com']}];
const base={projectId:'ghana',subject:'Hello',body:'Dear Project Team,\n\nBody text.'};

test('formatter escapes, links only http(s), keeps paragraphs and bullets',()=>{
 const {html,text}=formatBody(parseDraft(draft).body+'\njavascript:alert(1) <script>x</script>');
 assert.ok(html.includes('<p style="margin:0 0 12px 0;line-height:1.55">Dear Project Team,</p>'));
 assert.ok(html.includes('<a href="https://example.com/a?b=1&amp;c=2"'));
 assert.ok(html.includes('</a>.'));
 assert.ok(html.includes('<li>Second &lt;b&gt;point&lt;/b&gt;</li>'));
 assert.ok(!html.includes('<script>'));assert.ok(!/href="javascript/i.test(html));
 assert.ok(text.includes('- First point\n- Second <b>point</b>'));
 assert.deepEqual(parseDraft(draft).subject,'Ghana wind portfolio — Partnership');
});

test('personal greeting uses title + surname or first name',()=>{
 assert.equal(greetingName('Dr. Christoph Kapp'),'Dr. Kapp');
 assert.equal(greetingName('Jeff Amoah'),'Jeff');
 assert.equal(personalise('Dear Project Team,\n\nHi.','Jeff Amoah'),'Dear Jeff,\n\nHi.');
 assert.equal(personalise('No greeting.','Jeff Amoah'),'Dear Jeff,\n\nNo greeting.');
});

test('validation: saved contacts only, fields, duplicates, limits, placeholders',()=>{
 assert.throws(()=>validateSend({...base,mode:'separate',recipients:[{contactId:'c1',email:'other@example.com'}]},contacts),/saved contact/);
 assert.throws(()=>validateSend({...base,mode:'separate',recipients:[{contactId:'c1',email:'not-an-email'}]},contacts),/invalid email/);
 assert.throws(()=>validateSend({...base,mode:'together',recipients:[{contactId:'c1',email:'ck@example.com',field:'from'}]},contacts),/To, CC or BCC/);
 assert.throws(()=>validateSend({...base,mode:'together',recipients:[{contactId:'c1',email:'ck@example.com',field:'cc'}]},contacts),/To recipient/);
 assert.throws(()=>validateSend({...base,body:'Kind regards,\n[Your name]',mode:'separate',recipients:[{contactId:'c1',email:'ck@example.com'}]},contacts),/placeholder/);
 assert.throws(()=>validateSend({...base,mode:'separate',recipients:[]},contacts),/at least one/);
 const many=Array.from({length:11},(_,i)=>({id:'m'+i,name:'P '+i,emails:[`p${i}@example.com`]}));
 assert.throws(()=>validateSend({...base,mode:'separate',recipients:many.map(c=>({contactId:c.id,email:c.emails[0]}))},many),/up to 10/);
 const v=validateSend({...base,mode:'together',recipients:[{contactId:'c1',email:'CK@example.com',field:'bcc'},{contactId:'c1',email:'ck@example.com',field:'to'},{contactId:'c2',email:'ja@example.com',field:'cc'}]},contacts);
 assert.deepEqual(v.recipients.map(r=>`${r.field}:${r.email}`),['to:ck@example.com','cc:ja@example.com']);
});

test('separate: one call per person, own greeting and own idempotency key; together: one call, extra To → CC',()=>{
 const sep=buildCalls(validateSend({...base,mode:'separate',recipients:[{contactId:'c1',email:'ck@example.com'},{contactId:'c2',email:'ja@example.com'}]},contacts));
 assert.equal(sep.length,2);assert.notEqual(sep[0].payload.idempotency_key,sep[1].payload.idempotency_key);
 assert.ok(sep[0].payload.body_text.startsWith('Dear Dr. Kapp,'));assert.ok(sep[1].payload.body_text.startsWith('Dear Jeff,'));
 assert.equal(sep[0].payload.cc,undefined);
 const tog=buildCalls(validateSend({...base,mode:'together',recipients:[{contactId:'c1',email:'ck@example.com',field:'to'},{contactId:'c2',email:'ja@example.com',field:'to'},{contactId:'c3',email:'info@example.com',field:'bcc'}]},contacts));
 assert.equal(tog.length,1);assert.equal(tog[0].payload.to,'ck@example.com');assert.equal(tog[0].payload.cc,'ja@example.com');assert.equal(tog[0].payload.bcc,'info@example.com');
 assert.ok(tog[0].payload.body_text.startsWith('Dear Project Team,'));
});

test('pulse client maps responses and never exposes the key',async()=>{
 const reply=(status,body)=>async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 let seen;const ok=createPulseClient({key:KEY,baseUrl:'https://pulse.test',fetchImpl:async(url,init)=>{seen={url,init};return reply(200,{sent:true,emailMessageId:'m1'})();}});
 assert.deepEqual(await ok.send({to:'a@example.com'}),{status:'sent',httpStatus:200,error:'',emailMessageId:'m1',replay:false});
 assert.equal(seen.url,'https://pulse.test/api/pulse/external/send');assert.equal(seen.init.headers.Authorization,`Bearer ${KEY}`);
 const blocked=await createPulseClient({key:KEY,fetchImpl:reply(422,{code:'recipients_blocked',error:'Can’t send — remove x@example.com',verification:[]})}).send({});
 assert.equal(blocked.status,'blocked');assert.match(blocked.error,/x@example.com/);
 for(const result of [await createPulseClient({key:KEY,fetchImpl:reply(401,{error:'bad'})}).send({}),await createPulseClient({key:KEY,fetchImpl:async()=>{throw Error(KEY);}}).send({}),await createPulseClient({key:KEY,fetchImpl:reply(500,{error:{x:1}})}).send({})]){
  assert.equal(result.status,'failed');assert.ok(!JSON.stringify(result).includes(KEY));
 }
});

test('deadline marks unreached recipients as not attempted',async()=>{
 let t=0;const pulse={send:async()=>{t+=60000;return {status:'sent',httpStatus:200,error:''};}};
 const send=validateSend({...base,mode:'separate',recipients:[{contactId:'c1',email:'ck@example.com'},{contactId:'c2',email:'ja@example.com'},{contactId:'c3',email:'info@example.com'}]},contacts);
 const out=await runSend(send,pulse,{deadlineMs:90000,now:()=>t});
 assert.deepEqual(out.results.map(r=>r.status),['sent','sent','failed']);assert.match(out.results[2].error,/Not attempted/);
 assert.deepEqual(out.summary,{sent:2,blocked:0,failed:1});
});

async function withServer(responses,fn){
 const dir=await mkdtemp(path.join(tmpdir(),'wind-pulse-test-'));
 const store=await createContactStore(path.join(dir,'contacts.json'));const sendFile=path.join(dir,'sends.json');
 const a=await store.save('ghana',{name:'Jeff Amoah',emails:['ja@example.com'],phones:[],association:'unconfirmed'});
 const b=await store.save('ghana',{name:'Dr. Christoph Kapp',emails:['ck@example.com'],phones:[],association:'unconfirmed'});
 const c=await store.save('ghana',{name:'Samuel Manortey',emails:['sm@example.com'],phones:[],association:'unconfirmed'});
 const calls=[];const queue=[...responses];
 const pulse={enabled:true,send:async payload=>{calls.push(payload);return queue.shift()||{status:'sent',httpStatus:200,error:''};}};
 const server=createServer({storePromise:Promise.resolve(store),providerPromise:Promise.resolve({enabled:false}),enrichmentPromise:Promise.resolve({}),pulsePromise:Promise.resolve(pulse),sendStorePromise:createSendStore(sendFile)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/wind-projects/api`;
 try{const {token,pulseEnabled}=await(await fetch(url+'/contacts')).json();assert.equal(pulseEnabled,true);
  const post=(body,t=token)=>fetch(url+'/send',{method:'POST',headers:{'Content-Type':'application/json','X-Wind-Token':t},body:JSON.stringify(body)});
  await fn({post,calls,ids:{a:a.id,b:b.id,c:c.id},url,sendFile});}
 finally{await new Promise(r=>server.close(r));}
}

test('send route: token required, partial results, workflow update and saved history',async()=>{
 await withServer([{status:'sent',httpStatus:200,error:'',emailMessageId:'m1'},{status:'blocked',httpStatus:422,error:'Can’t send — remove sm@example.com'},{status:'failed',httpStatus:500,error:'Pulse error (HTTP 500).'}],async({post,calls,ids,url,sendFile})=>{
  const recipients=[{contactId:ids.a,email:'ja@example.com'},{contactId:ids.c,email:'sm@example.com'},{contactId:ids.b,email:'ck@example.com'}];
  assert.equal((await post({projectId:'ghana',mode:'separate',subject:'S',body:'Dear Team,\n\nB',recipients},'wrong')).status,403);
  assert.equal(calls.length,0);
  const bad=await post({projectId:'ghana',mode:'separate',subject:'S',body:'B',recipients:[{contactId:ids.a,email:'nobody@example.com'}]});
  assert.equal(bad.status,400);assert.match((await bad.json()).error,/saved contact/);
  const res=await post({projectId:'ghana',mode:'separate',subject:'S',body:'Dear Team,\n\nB',recipients});
  const out=await res.json();assert.equal(res.status,200);
  assert.deepEqual(out.summary,{sent:1,blocked:1,failed:1});assert.deepEqual(out.workflowUpdate,{emailStatus:'sent',workflow:'Contacted'});
  assert.equal(calls.length,3);assert.ok(!JSON.stringify(out).includes(KEY));
  const history=(await(await fetch(url+'/sends?projectId=ghana')).json()).sends;
  assert.equal(history.length,1);assert.deepEqual(history[0].summary,{sent:1,blocked:1,failed:1});assert.equal(history[0].mode,'separate');
  assert.equal(JSON.parse(await readFile(sendFile,'utf8')).sends.length,1);
 });
});

test('send route: all blocked → no workflow update',async()=>{
 await withServer([{status:'blocked',httpStatus:422,error:'Can’t send'}],async({post,ids})=>{
  const out=await(await post({projectId:'ghana',mode:'together',subject:'S',body:'B',recipients:[{contactId:ids.a,email:'ja@example.com',field:'to'},{contactId:ids.b,email:'ck@example.com',field:'cc'}]})).json();
  assert.deepEqual(out.summary,{sent:0,blocked:2,failed:0});assert.equal(out.workflowUpdate,null);
 });
});
