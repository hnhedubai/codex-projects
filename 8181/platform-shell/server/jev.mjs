import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {atomicJson} from './atomic-json.mjs';

const DEFAULT_ENDPOINT='https://api.typesafe.ai/v1/systemone';
const MODEL='jev-latest';
const QUESTIONS_VERSION='2026-10-23-mandate-v2';
const SCORE_LABELS=['Do not pursue','Hold','Moderate','Go ahead'];

function envValue(text,name){
  const line=String(text||'').split(/\r?\n/).find(item=>new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}\\s*=`).test(item));
  if(!line)return '';
  const value=line.split('=',2)[1]?.trim()||'';
  return value.replace(/^['"]|['"]$/g,'');
}

async function configuredValue(root,name){
  if(process.env[name]?.trim())return process.env[name].trim();
  for(const filename of ['.env.local','.env']){
    try{
      const value=envValue(await readFile(path.join(root,filename),'utf8'),name);
      if(value)return value;
    }catch{}
  }
  return '';
}

const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clean(item)])):value??'';

function stateFor(record){
  return clean({
    company:record.company,
    country:record.country,
    industry:record.industry,
    sectors:record.sectors||record.sector||record.subSector,
    partnerType:record.partnerType,
    intent:record.intent,
    scale:record.scale,
    stage:record.stage,
    latestEvidence:record.latestEvidence,
    status:record.status,
    summary:record.summary,
    notes:record.notes,
    sources:record.sources
  });
}

const questions={
  investment_intent:{type:'noul',instructions:'Does the company currently show evidence of a mandate involving external renewable-energy investment, equity, capital partners or financial partners?',criteria:{true:'Recent source-backed evidence shows the company is investing in third-party renewable projects, seeking external capital for its own renewable platform or assets, or explicitly seeking financial partners.',false:'The evidence shows only ordinary own-project development or operations, historical activity, or an intermediary listing without a current capital or investment mandate.'}},
  jv_intent:{type:'noul',instructions:'Does the company currently show evidence of seeking or accepting joint-venture, co-development or shared-ownership partners for renewable-energy opportunities?',criteria:{true:'Recent source-backed evidence identifies a current joint-venture, co-development, shared-ownership or project-partner route.',false:'No current joint-venture, co-development or shared-ownership route is evidenced.'}},
  collaboration_intent:{type:'noul',instructions:'Does the company currently show evidence of seeking strategic collaboration on renewable-energy projects?',criteria:{true:'Recent source-backed evidence identifies a current collaboration, strategic-partner, EPC, technology, development-partner or similar cooperation need.',false:'No current collaboration need is evidenced, or the activity is only historical or internal.'}},
  m_and_a_intent:{type:'noul',instructions:'Does the company currently show evidence of an M&A, asset-acquisition, divestment, minority sell-down, merger or control-transaction mandate related to renewable energy?',criteria:{true:'Recent source-backed evidence identifies an active acquisition, sale, sell-down, merger or control-investment process.',false:'No current renewable-energy M&A or control-transaction mandate is evidenced.'}},
  sector_fit:{type:'noul',instructions:'Does the company have current activity relevant to renewable-energy sectors such as wind, solar PV, BESS, hydrogen or e-SAF?',criteria:{true:'Current evidence connects the company to at least one relevant renewable-energy sector.',false:'No relevant current sector activity is evidenced.'}},
  europe_fit:{type:'noul',instructions:'Does the company have current activity, assets, projects or a mandate connected to Europe?',criteria:{true:'The record directly identifies current European activity, projects, offices, investment or partnership scope.',false:'The record does not establish current European relevance.'}},
  stage_fit:{type:'noul',instructions:'Does the company’s current activity include project stages relevant to external project outreach, such as development, pre-construction, ready-to-build, construction or operation?',criteria:{true:'The record identifies at least one relevant project stage or stage-specific mandate.',false:'The stage is missing, irrelevant or unsupported.'}},
  scale_fit:{type:'noul',instructions:'Does the company’s stated or evidenced scale indicate a plausible fit for utility-scale renewable projects?',criteria:{true:'The record gives credible utility-scale capacity, portfolio, ticket or platform evidence.',false:'Scale or investment capacity is missing, immaterial or unsupported.'}},
  evidence_recent:{type:'noul',instructions:'Is the company’s opportunity evidence recent enough to support current outreach?',criteria:{true:'The latest evidence is dated and appears current, preferably within the last 18 months.',false:'The evidence is undated, historical, stale, indirect or explicitly requires refresh.'}},
  direct_evidence:{type:'noul',instructions:'Does the evidence come directly from the company or a clearly identified project owner rather than only an intermediary or secondary listing?',criteria:{true:'A company, project owner or official representative directly supports the relevant claim.',false:'The claim comes only from an intermediary, database, repost, unattributed source or historical report.'}},
  jvote:{type:'score',instructions:'How strongly should we pursue this company for outreach about external renewable-energy projects for investment, JV or collaboration, while recording M&A as a separate mandate?',criteria:['Do not pursue: no credible renewable-energy fit, intermediary-only route, or no relevant external mandate or route.','Hold: relevant company, but the evidence is old, indirect, conflicting or insufficient for current outreach.','Moderate: a current compatible investment, JV, collaboration or M&A signal exists, but availability or mandate needs confirmation.','Go ahead: direct company with recent, compatible mandate evidence and a clear route for the proposed outreach.']}
};

function answerSummary(answers){
  const score=Number(answers?.jvote?.score);
  const jvote=Number.isFinite(score)?SCORE_LABELS[Math.max(0,Math.min(3,Math.round(score)))]:'Needs review';
  const noul={};for(const key of Object.keys(questions))if(key!=='jvote')noul[key]=Number.isFinite(Number(answers?.[key]?.noul))?Number(answers[key].noul):null;
  return {questionsVersion:QUESTIONS_VERSION,jevVote:jvote,jevChoice:jvote,jevScore:Number.isFinite(score)?Math.round(score/3*100):null,jevScoreRaw:Number.isFinite(score)?score:null,jevFactors:noul,jevConfidence:answers?.jvote?.confidence??null,jevSummary:`JEV: ${jvote}${Number.isFinite(score)?` · score ${score.toFixed(2)}/3`:''}`,jevMode:'live',jevModel:MODEL};
}

export class JevService{
  constructor({root,records,fetchImpl=fetch}={}){this.root=root;this.records=records||[];this.fetch=fetchImpl;this.file=process.env.JEV_RESULTS_FILE||path.join(root,'platform-shell','data','jev-runs','investors-jv.json');this.keyPromise=configuredValue(root,'TYPESAFE_API_KEY');this.endpointPromise=configuredValue(root,'TYPESAFE_API_URL');}
  async config(){return {key:await this.keyPromise,endpoint:(await this.endpointPromise)||DEFAULT_ENDPOINT};}
  async results(){try{return JSON.parse(await readFile(this.file,'utf8'))||{};}catch(error){if(error.code==='ENOENT')return {};throw error;}}
  async evaluate(record){
    const {key,endpoint}=await this.config();if(!key)throw Object.assign(Error('TypeSafe is not configured. Add TYPESAFE_API_KEY to the server environment.'),{status:503});
    const response=await this.fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state:stateFor(record),model:MODEL,questions}),signal:AbortSignal.timeout(45000)});
    const body=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(body?.error?.message||body?.message||`TypeSafe request failed (${response.status}).`),{status:response.status});
    const normalized={...answerSummary(body.answers||{}),runId:body.runId||'',evaluatedAt:new Date().toISOString(),usage:body.usage||{}};
    return {id:record.id,company:record.company,...normalized,rawAnswers:body.answers||{}};
  }
  async run({ids,force=false}={}){
    const existing=await this.results();const wanted=Array.isArray(ids)&&ids.length?this.records.filter(record=>ids.includes(record.id)):this.records;const selected=force?wanted:wanted.filter(record=>existing[record.id]?.questionsVersion!==QUESTIONS_VERSION);const updated={...existing};
    for(const record of selected){updated[record.id]=await this.evaluate(record);await atomicJson(this.file,updated);}
    return {evaluated:selected.length,skipped:wanted.length-selected.length,total:wanted.length,results:updated};
  }
}

export class JevRoutes{
  constructor(service){this.service=service;}
  matches(pathname){return pathname==='/api/jev/investors-jv/results'||pathname==='/api/jev/investors-jv/run'||pathname==='/api/jev/status';}
  async handle(req,res,url){
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      if(url.pathname==='/api/jev/status'){if(req.method!=='GET')return json(405,{error:'Method not supported.'});const {key}=await this.service.config();return json(200,{configured:!!key,model:MODEL});}
      if(url.pathname==='/api/jev/investors-jv/results'){if(req.method!=='GET')return json(405,{error:'Method not supported.'});return json(200,{results:await this.service.results()});}
      if(req.method!=='POST')return json(405,{error:'Method not supported.'});let body='';for await(const chunk of req){body+=chunk;if(body.length>32768)return json(413,{error:'Request too large.'});}let input={};try{input=body?JSON.parse(body):{};}catch{return json(400,{error:'Invalid JSON.'});}if(input.ids&&!Array.isArray(input.ids))return json(422,{error:'ids must be an array.'});const result=await this.service.run({ids:input.ids,force:input.force===true});return json(200,result);
    }catch(error){return json(error.status||500,{error:error.status?error.message:'JEV evaluation could not be completed.'});}
  }
}
