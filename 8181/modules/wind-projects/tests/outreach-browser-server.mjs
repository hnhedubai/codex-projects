// Isolated browser fixture: exercise the real shared UI without editing user records.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../../../',import.meta.url);
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/shared/css/tokens.css"><link rel="stylesheet" href="/shared/css/base.css"><link rel="stylesheet" href="/shared/css/layout.css"><link rel="stylesheet" href="/shared/css/components.css"><link rel="stylesheet" href="/shared/css/wind-reference.css"><title>Outreach indicator test</title></head><body><div id="app"></div><script type="module">
import {OpportunityPlatformApp} from '/shared/js/platform-app.js';
const rows=[{id:'qa-alpha',project:'QA Alpha',country:'Test',developer:'Browser test fixture',contacts:[{status:'Verified'},{status:'Verified'}],source:{id:'qa-alpha',name:'QA Alpha',contacts:[]}},{id:'qa-beta',project:'QA Beta',country:'Test',developer:'Browser test fixture',contacts:[],source:{id:'qa-beta',name:'QA Beta',contacts:[]}}];
new OpportunityPlatformApp({root:document.querySelector('#app'),path:'/wind-projects',workspaces:{'/wind-projects':{name:'Wind Projects',description:'Isolated browser test',symbol:'W',entity:'Projects'}},rows});
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/wind-projects'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});return res.end(html);}
 if(!/^\/shared\/(?:css\/[\w-]+\.css|js\/platform-app\.js)$/.test(url.pathname)){res.writeHead(404);return res.end();}
 try{const file=new URL('platform-shell'+url.pathname,root);const body=await readFile(file);res.writeHead(200,{'Content-Type':url.pathname.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1',()=>console.log('OUTREACH_TEST_URL=http://127.0.0.1:'+server.address().port+'/wind-projects#record/qa-alpha/outreach'));
