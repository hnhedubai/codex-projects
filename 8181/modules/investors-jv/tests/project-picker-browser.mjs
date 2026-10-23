// Isolated UI fixture: same app code, separate origin and saved-draft fixtures. No outbound APIs.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pickerProjects} from '../project-picker.js';
import {renderOfferHistory} from '../offer-history.js';
const root=fileURLToPath(new URL('../../../',import.meta.url)),off=process.argv.includes('--off');
const offers=process.argv.includes('--offers');
const offerFixture={id:'fixture-offer',recordId:'green-genius',recordName:'Test prospect (fixture)',at:'2026-10-23T09:10:11.123Z',completedAt:'2026-10-23T09:10:12.456Z',status:'done',mode:'separate',subject:'Anonymous opportunity — test fixture',body:'Hello,\n\nAnonymous opportunity fixture; no email was sent.',offerProjects:[pickerProjects[0],pickerProjects[2]],recipients:[{name:'Test Contact',email:'fixture@example.com',field:'to'}],results:[{emails:['fixture@example.com'],status:'sent'}],offerEvents:[]};
const state={'green-genius':{outreachDraft:'Subject: Existing saved draft A\n\nHello,\n\nPlease preserve this saved draft.\n\nKind regards,',outreachNotes:'Existing relationship notes A'},'sermsang-power':{outreachDraft:'Subject: Existing saved draft B\n\nHello,\n\nPlease preserve the second saved draft.\n\nKind regards,',outreachNotes:'Existing relationship notes B'}};
const seed=`<script>if(!localStorage.getItem('oplatform:/investors-jv:detail-workflow'))localStorage.setItem('oplatform:/investors-jv:detail-workflow',${JSON.stringify(JSON.stringify(state))});</script>`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const send=(body,type='text/html')=>{res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
 if(offers&&url.pathname==='/api/pulse/investors-jv/history')return send(JSON.stringify({available:true,projects:{'green-genius':{history:[offerFixture],sentCount:1}}}),'application/json');
 if(offers&&url.pathname==='/api/pulse/investors-jv/offer-status'){let body='';for await(const part of req)body+=part;const input=JSON.parse(body);offerFixture.offerStatus=input.status;offerFixture.offerEvents.push({at:new Date().toISOString(),status:input.status});return send('{}','application/json');}
 if(url.pathname.startsWith('/api/'))return send(JSON.stringify(url.pathname.endsWith('/status')?{enabled:false,connected:false,error:'Isolated fixture: sending disabled'}:url.pathname.endsWith('/results')?{results:{}}:{available:true,projects:{}}),'application/json');
 if(url.pathname==='/investors-jv'){const html=await readFile(path.join(root,'index.html'),'utf8');return send(html.replace('<div id="app"></div>',seed+'<div id="app"></div>'));}
 if(url.pathname==='/modules/investors-jv/outreach-settings.js')return send(`export const OUTREACH_PROJECT_PICKER=${!off};`,'text/javascript');
 let relative;
 if(/^\/shared\/(?:js|css)\/[a-z0-9-]+\.(?:js|css)$/.test(url.pathname))relative='platform-shell'+url.pathname;
 else if(url.pathname==='/data/records.js'||url.pathname==='/apps/registry.js')relative='platform-shell'+url.pathname;
 else if(/^\/modules\/(?:investors-jv|listed-projects|wind-projects|hydrogen-offtakers|diesel-en590)\/(?:data\/)?[a-z0-9.-]+\.(?:js|css|json)$/.test(url.pathname))relative=url.pathname;
 if(!relative){res.writeHead(404);return res.end('Not found');}
 try{const body=await readFile(path.join(root,relative));return send(body,relative.endsWith('.css')?'text/css':relative.endsWith('.json')?'application/json':'text/javascript');}catch{res.writeHead(404);res.end('Not found');}
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}/investors-jv#record/green-genius/outreach`,off,pid:process.pid})));
