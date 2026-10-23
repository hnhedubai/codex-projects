// Modules that can send email through Pulse from 8181. Shared by the browser and the server.
// To add a module: add one entry here (keyed by its page route, which must also be in server.mjs `routes`).
//   key            → URL segment (/api/pulse/<key>/…) and history file name (platform-shell/data/pulse-sends/<key>.json)
//   requiredChecks → optional; every check must be ticked before the server accepts a send
//   deskHistory    → optional read-only history from another app, shown next to 8181's own sends
export const pulseModules=Object.freeze({
 '/listed-projects':{key:'listed-projects',label:'Listed Projects'},
 '/wind-projects':{key:'wind-projects',label:'Wind Projects',deskHistory:'/api/wind-projects/outreach-status'},
 '/investors-jv':{key:'investors-jv',label:'Investors & JV'},
 '/hydrogen-offtakers':{key:'hydrogen-offtakers',label:'Hydrogen Offtakers'},
 '/e-saf':{key:'e-saf',label:'e-SAF'},
 '/ammonia':{key:'ammonia',label:'Ammonia'},
 '/gases':{key:'other-gases',label:'Other Gases'},
 '/diesel-en590':{key:'diesel-en590',label:'Diesel EN590',requiredChecks:[
  {id:'entity',label:'Legal entity, beneficial ownership and signing authority verified'},
  {id:'product',label:'EN590 grade, volume and delivery basis match the contemplated transaction'},
  {id:'authority',label:'Refinery ownership / marketing mandate (sellers) or purchase mandate and financial capacity (buyers) evidenced'},
  {id:'compliance',label:'Sanctions, compliance and trade documentation reviewed'}
 ]}
});
export const PULSE_MAX_RECIPIENTS=10;
