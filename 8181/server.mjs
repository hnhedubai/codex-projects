import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReoonService,trustedLocalRequest} from './platform-shell/server/reoon.mjs';
import {loadContactCatalog} from './platform-shell/server/contact-catalog.mjs';
import {contactModules,contactSnapshotUrl} from './platform-shell/shared/js/contact-registry.js';
import {hydrogenRows} from './modules/hydrogen-offtakers/data/source.js';
import {h2DeveloperRecords} from './modules/h2-dev/data/source.js';
import {h2ProjectRecords} from './modules/h2-projects/data/source.js';
import {PulseSendRoutes} from './platform-shell/server/pulse/pulse-routes.mjs';
import {createReoonSendGate} from './platform-shell/server/pulse/reoon-send-gate.mjs';
import {readOutreachStatus} from './platform-shell/server/wind-outreach-status.mjs';
import {partnerProjects} from './modules/investors-jv/data/source.js';
import {projects as windProjects} from './modules/wind-projects/data/source.js';
import {listedProjects} from './modules/listed-projects/data/source.js';
import {bankabilityDocuments} from './modules/listed-projects/data/bankability.js';
import {OutreachExportRoute} from './platform-shell/server/outreach-export.mjs';
import {localDocumentNavigation} from './platform-shell/server/document-navigation.mjs';
import {JevRoutes,JevService} from './platform-shell/server/jev.mjs';
import {InvestorContactDirectory} from './platform-shell/server/investor-contact-directory.mjs';
import { loadLimaKey, enrichH2Contact } from './platform-shell/server/limadata-h2.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const investorDirectory=new InvestorContactDirectory(root);
const limaKey = await loadLimaKey({ root });
const contactCatalog=await loadContactCatalog(root,{listedProjects,windProjects,partnerProjects,hydrogenRows,h2DevRows:h2DeveloperRecords,h2ProjectRows:h2ProjectRecords});
const reoon=await createReoonService({root,allowedEmails:contactCatalog.allowedEmails});
// Automatic sweep: only missing or expired (>30 days) results can reach Reoon.
void reoon.verifyAll().then(result=>console.log(`[reoon-auto] checked ${result.checked.length}/${result.candidates} expired or missing; failed batches ${result.failed.length}`)).catch(error=>console.error(`[reoon-auto] ${error.message}`));
const pulseRoutes=await PulseSendRoutes.create(root,{verifyRecipients:createReoonSendGate(reoon,contactCatalog),campaign:{records:()=>h2ProjectRecords,results:()=>reoon.results(),verify:async email=>(await reoon.verify([email],{refresh:true}))[0]}});
const outreachExport=new OutreachExportRoute(root);
const jevRoutes=new JevRoutes(new JevService({root,records:partnerProjects}));
const files = new Map([
  ['/modules/investors-jv/data/ceo-email-enrichment-20261105.json','modules/investors-jv/data/ceo-email-enrichment-20261105.json'],
  ['/data/europe-investor-research.js','modules/investors-jv/data/europe-investor-research.js'],
  ['/data/europe-investor-research-20261105.json','modules/investors-jv/data/europe-investor-research-20261105.json'],
  ['/modules/investors-jv/data/europe-investor-research.js','modules/investors-jv/data/europe-investor-research.js'],
  ['/modules/investors-jv/data/europe-investor-research-20261105.json','modules/investors-jv/data/europe-investor-research-20261105.json'],
  ['/','index.html'],
  ['/index.html','index.html'],
  ['/shared/css/tokens.css','platform-shell/shared/css/tokens.css'],
  ['/shared/css/base.css','platform-shell/shared/css/base.css'],
  ['/shared/css/layout.css','platform-shell/shared/css/layout.css'],
  ['/shared/css/components.css','platform-shell/shared/css/components.css'],
  ['/shared/css/tables.css','platform-shell/shared/css/tables.css'],
  ['/shared/css/wind-reference.css','platform-shell/shared/css/wind-reference.css'],
  ['/shared/css/scroll-system.css','platform-shell/shared/css/scroll-system.css'],
  ['/shared/js/shell.js','platform-shell/shared/js/shell.js'],
  ['/shared/js/platform-app.js','platform-shell/shared/js/platform-app.js'],
  ['/apps/registry.js','platform-shell/apps/registry.js'],
  ['/data/records.js','platform-shell/data/records.js'],
  ['/data/wind-projects.source.js','modules/wind-projects/data/source.js'],
  ['/data/investors-jv.source.js','modules/investors-jv/data/source.js'],
  ['/data/contact-research.js','modules/investors-jv/data/contact-research.js'],
  ['/data/solar-research.js','modules/investors-jv/data/solar-research.js'],
  ['/data/uae-france-solar-research.js','modules/investors-jv/data/uae-france-solar-research.js'],
  ['/data/india-global-research.js','modules/investors-jv/data/india-global-research.js'],
  ['/data/global-solar-buyers.js','modules/investors-jv/data/global-solar-buyers.js'],
  ['/data/balkan-solar-buyers.js','modules/investors-jv/data/balkan-solar-buyers.js'],
  ['/data/priority-contact-rescan.js','modules/investors-jv/data/priority-contact-rescan.js'],
  ['/modules/investors-jv/data/priority-contact-rescan.js','modules/investors-jv/data/priority-contact-rescan.js'],
  ['/modules/investors-jv/data/balkan-solar-buyers.js','modules/investors-jv/data/balkan-solar-buyers.js'],
  ['/modules/investors-jv/data/global-solar-buyers.js','modules/investors-jv/data/global-solar-buyers.js'],
  ['/modules/investors-jv/data/india-global-research.js','modules/investors-jv/data/india-global-research.js'],
  ['/modules/investors-jv/data/uae-france-solar-research.js','modules/investors-jv/data/uae-france-solar-research.js'],
  ['/modules/investors-jv/data/solar-research.js','modules/investors-jv/data/solar-research.js'],
  ['/data/hydrogen-offtakers.source.js','modules/hydrogen-offtakers/data/source.js'],
  ['/data/h2-dev.source.js','modules/h2-dev/data/source.js'],
  ['/data/h2-projects.source.js','modules/h2-projects/data/source.js'],
  ['/data/contact-deep-research.js','modules/h2-projects/data/contact-deep-research.js'],
  ['/modules/h2-projects/data/contact-deep-research.js','modules/h2-projects/data/contact-deep-research.js'],
  ['/data/hydrogen-offtaker-candidates.source.json','modules/hydrogen-offtakers/data/source.json'],
  ['/data/en590-companies.source.json','modules/diesel-en590/data/en590-companies.source.json'],
  ['/data/en590-sellers.source.json','modules/diesel-en590/data/en590-sellers.source.json'],
  ['/data/en590-refineries.source.json','modules/diesel-en590/data/en590-refineries.source.json'],
  ['/data/en590-refineries-2024-concawe.source.json','modules/diesel-en590/data/en590-refineries-2024-concawe.source.json'],
  ['/data/en590-refineries.csv','modules/diesel-en590/data/en590-refineries.csv'],
  ['/data/en590-refinery-contacts.csv','modules/diesel-en590/data/en590-refinery-contacts.csv'],
  ['/data/en590-contacts.source.json','modules/diesel-en590/data/en590-contacts.source.json'],
  ['/data/en590-rejected.source.json','modules/diesel-en590/data/en590-rejected.source.json'],
  ['/modules/wind-projects/data/source.js','modules/wind-projects/data/source.js'],
  ['/modules/investors-jv/data/source.js','modules/investors-jv/data/source.js'],
  ['/modules/investors-jv/data/contact-research.js','modules/investors-jv/data/contact-research.js'],
  ['/modules/investors-jv/data/china-solar-research.js','modules/investors-jv/data/china-solar-research.js'],
  ['/modules/hydrogen-offtakers/data/source.js','modules/hydrogen-offtakers/data/source.js'],
  ['/modules/h2-dev/data/source.js','modules/h2-dev/data/source.js'],
  ['/modules/h2-dev/priority.js','modules/h2-dev/priority.js'],
  ['/modules/h2-projects/data/source.js','modules/h2-projects/data/source.js'],
  ['/modules/h2-projects/data/contact-imports.json','modules/h2-projects/data/contact-imports.json'],
  ['/modules/h2-projects/data/australia-priority-additions-100.js','modules/h2-projects/data/australia-priority-additions-100.js'],
  ['/modules/h2-projects/data/australia-expansion.js','modules/h2-projects/data/australia-expansion.js'],
  ['/modules/h2-projects/data/australia-csiro-reconciled.js','modules/h2-projects/data/australia-csiro-reconciled.js'],
  ['/modules/h2-projects/data/australia-safest-additions.js','modules/h2-projects/data/australia-safest-additions.js'],
  ['/modules/h2-projects/data/outreach-pilot.js','modules/h2-projects/data/outreach-pilot.js'],
  ['/modules/h2-projects/data/outreach-drafts.js','modules/h2-projects/data/outreach-drafts.js'],
  ['/modules/h2-projects/campaign-ui.js','modules/h2-projects/campaign-ui.js'],
  ['/modules/hydrogen-offtakers/data/source.json','modules/hydrogen-offtakers/data/source.json'],
  ['/nda-guard','modules/nda-guard/dealguard-client-nda-review.html'],
  ['/nda-guard/','modules/nda-guard/dealguard-client-nda-review.html'],
  ['/nda-guard/dealguard-client-nda-review.html','modules/nda-guard/dealguard-client-nda-review.html'],
  ['/nda-guard/comparison.css','modules/nda-guard/comparison.css'],
  ['/nda-guard/comparison-core.js','modules/nda-guard/comparison-core.js'],
  ['/nda-guard/comparison-app.js','modules/nda-guard/comparison-app.js'],
  ['/nda-guard/ai-review.js','modules/nda-guard/ai-review.js'],
  ['/nda-guard/comparison-tests.html','modules/nda-guard/comparison-tests.html'],
  ['/nda-guard/comparison-tests.js','modules/nda-guard/comparison-tests.js'],
  ['/nda-guard/NDA_1__Viktoriia_V2.docx','modules/nda-guard/NDA_1__Viktoriia_V2.docx'],
  ['/nda-guard/vendor/jszip-3.10.1.min.js','modules/nda-guard/vendor/jszip-3.10.1.min.js'],
  ['/nda-guard/vendor/pdf-3.11.174.min.js','modules/nda-guard/vendor/pdf-3.11.174.min.js'],
  ['/nda-guard/vendor/pdf.worker-3.11.174.min.js','modules/nda-guard/vendor/pdf.worker-3.11.174.min.js'],
  ['/comparison.css','modules/nda-guard/comparison.css']
]);
const routes = new Set(['/listed-projects','/wind-projects','/investors-jv','/hydrogen-offtakers','/h2-dev','/h2-projects','/e-saf','/ammonia','/gases','/diesel-en590']);
const entryPages=new Set([...routes,'/','/index.html','/nda-guard','/nda-guard/','/nda-guard/dealguard-client-nda-review.html']);
files.set('/modules/listed-projects/data/source.js','modules/listed-projects/data/source.js');
files.set('/modules/listed-projects/data/bankability.js','modules/listed-projects/data/bankability.js');
files.set('/modules/listed-projects/data/croatia-portfolio.js','modules/listed-projects/data/croatia-portfolio.js');
files.set('/modules/listed-projects/documents/croatia-ppa-axpo-indicative.pdf','modules/listed-projects/documents/croatia-ppa-axpo-indicative.pdf');
files.set('/modules/listed-projects/profile.js','modules/listed-projects/profile.js');
files.set('/modules/investors-jv/outreach.js','modules/investors-jv/outreach.js');
files.set('/modules/investors-jv/sectors.js','modules/investors-jv/sectors.js');
files.set('/modules/investors-jv/outreach-export.js','modules/investors-jv/outreach-export.js');
files.set('/shared/js/outreach-export.js','platform-shell/shared/js/outreach-export.js');
files.set('/modules/investors-jv/outreach-policy.js','modules/investors-jv/outreach-policy.js');
for(const name of ['outreach-settings.js','outreach-draft-v2.js','project-picker.js','project-picker-rules.js','project-picker-drafts.js','project-picker.css','offer-history.js'])files.set(`/modules/investors-jv/${name}`,`modules/investors-jv/${name}`);
for(const name of ['contact-room.js','contact-room-model.js','contact-room.css'])files.set(`/modules/investors-jv/${name}`,`modules/investors-jv/${name}`);
for(const project of listedProjects){const name=project.document.filename;files.set(`/modules/listed-projects/documents/${name}`,`modules/listed-projects/documents/${name}`);}
files.set('/shared/js/contact-registry.js','platform-shell/shared/js/contact-registry.js');
files.set('/modules/diesel-en590/data/contact-associations.js','modules/diesel-en590/data/contact-associations.js');
for(const name of ['pulse-modules.js','pulse-format.js','pulse-send-panel.js','navigation.js','module-loader.js'])files.set(`/shared/js/${name}`,`platform-shell/shared/js/${name}`);
for(const [module,config]of Object.entries(contactModules))if(config.snapshot)files.set(contactSnapshotUrl(module),`modules/${config.directory}/data/${config.snapshot}`);

const mime = file => file.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : file.endsWith('.pdf') ? 'application/pdf' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.json') ? 'application/json; charset=utf-8' : file.endsWith('.csv') ? 'text/csv; charset=utf-8' : file.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/html; charset=utf-8';
const server = http.createServer(async (req,res) => {
  let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);return res.end('Invalid URL');}
  if(!trustedLocalRequest(req)&&!localDocumentNavigation(req,url.pathname,entryPages)){res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end('Local same-origin requests only.');}
  if(outreachExport.matches(url.pathname))return outreachExport.handle(req,res);
  if(url.pathname==='/api/h2-projects/find-work-email'){
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    if(!trustedLocalRequest(req))return json(403,{error:'Local same-origin requests only.'});
    if(req.method!=='POST')return json(405,{error:'Use POST.'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>12000)return json(413,{error:'Request too large.'});}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
    try{return json(200,await enrichH2Contact({input,records:h2ProjectRecords,root,apiKey:limaKey,register:(context,emails)=>contactCatalog.register(context,emails)}));}
    catch(error){return json(error.status||502,{error:error.message||'LimaData lookup failed.'});}
  }
  if(url.pathname==='/api/investors-jv/contact-directory'){
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    if(!trustedLocalRequest(req))return json(403,{error:'Local same-origin requests only.'});
    if(req.method!=='GET')return json(405,{error:'Read-only endpoint. Use GET.'});
    try{return json(200,{...await investorDirectory.read(),results:reoon.results()});}
    catch{return json(503,{error:'Contact directory temporarily unavailable; retry shortly.'});}
  }
  if(url.pathname==='/api/investors-jv/contact-import'){
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    if(!trustedLocalRequest(req))return json(403,{error:'Local same-origin requests only.'});
    if(!['POST'].includes(req.method))return json(405,{error:'Use POST.'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>200000)return json(413,{error:'Import too large.'});}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
    if(!input||!Array.isArray(input.contacts))return json(422,{error:'contacts array required.'});
    try{return json(200,await investorDirectory.importContacts(input.contacts,{apply:input.apply===true}));}
    catch(error){return json(500,{error:'Contact import failed; no records were changed.'});}
  }
  if(jevRoutes.matches(url.pathname)){
    if(!trustedLocalRequest(req)){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({error:'Local same-origin requests only.'}));}
    return jevRoutes.handle(req,res,url);
  }
  if(pulseRoutes.matches(url.pathname))return pulseRoutes.handle(req,res,url);
  if(url.pathname.startsWith('/api/reoon/')){
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    if(!trustedLocalRequest(req))return json(403,{error:'Local same-origin requests only.'});
    try{
      if(req.method==='GET'&&url.pathname==='/api/reoon/status')return json(200,{...await reoon.status(),modules:contactCatalog.modules,registration:contactCatalog.registrationStatus()});
      if(req.method==='GET'&&url.pathname==='/api/reoon/results')return json(200,{results:reoon.results()});
      if(req.method==='POST'&&url.pathname==='/api/reoon/verify'){
        if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(415,{error:'JSON required.'});
        let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)return json(413,{error:'Request too large.'});}
        let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
        if(!input||typeof input!=='object'||Array.isArray(input))return json(422,{error:'An object with email addresses is required.'});
        if(!Array.isArray(input.emails)||!input.emails.length||input.emails.length>5)return json(422,{error:'Verify one to five addresses per request.'});
        if(input.emails.some(email=>typeof email!=='string'||email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)))return json(422,{error:'Valid email addresses required.'});
        await contactCatalog.register(input.context,input.emails);
        return json(200,{results:await reoon.verify(input.emails,{refresh:input.refresh===true})});
      }
      return json(405,{error:'Unsupported Reoon endpoint or method.'});
    }catch(error){return json(error.status||500,{error:error.status?error.message:'Verification could not be persisted; no positive result recorded.'});}
  }
  if(req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);return res.end('Method not supported');}
  if(url.pathname.startsWith('/api/listed-projects/bankability-documents/')){
    const key=url.pathname.slice('/api/listed-projects/bankability-documents/'.length);
    const document=Object.hasOwn(bankabilityDocuments,key)?bankabilityDocuments[key]:null;
    if(!document){res.writeHead(404);return res.end('Document not found');}
    // Exact reviewed-file allowlist, never a caller-supplied filesystem path.
    const documentRoot='C:/Users/mohdz/OneDrive/Documents/Dubai Island/1/Weenergo/docs/WE GREEN ENERGO PUBLIC/WE GREEN ENERGO PUBLIC';
    try{
      const body=await readFile(path.join(documentRoot,document.file));
      res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Source PDF unavailable. Check the existing Weenergo docs folder.');}
  }
  if(url.pathname==='/api/wind-projects/outreach-status'){
    const body=JSON.stringify(await readOutreachStatus());
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  if(routes.has(url.pathname)){
    const body = await readFile(path.join(root,'index.html'));
    res.writeHead(200,{'Content-Type':mime('index.html'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  let resourcePath;try{resourcePath=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end('Invalid URL');}
  // Keep local module data imports resilient: a new data helper imported by
  // an existing source module must not produce a browser-only 404 merely
  // because someone forgot to duplicate it in the static route table.
  let file = files.get(resourcePath);
  if(!file&&/^\/modules\/investors-jv\/data\/[A-Za-z0-9._-]+\.js$/.test(resourcePath))file=resourcePath.slice(1);
  if(!file){res.writeHead(404);return res.end('Not found');}
  try{
    const body = await readFile(path.join(root,file));
    res.writeHead(200,{'Content-Type':mime(file),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  }catch{res.writeHead(500);res.end('Unable to read platform file');}
});

const port = Number(process.env.OPLATFORM_PORT || 8181);
server.listen(port,'127.0.0.1',()=>console.log(`Opportunity platform: http://localhost:${port}`));
