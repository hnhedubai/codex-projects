import path from 'node:path';
import {pulseModules} from '../../shared/js/pulse-modules.js';
import {SendHistoryStore} from './send-history-store.mjs';
import {SendError} from './send-request.mjs';

/** One 8181 module that can send through Pulse, with its own send history. */
export class SendModule {
 constructor({route,key,label,requiredChecks=[]}){
  if(!/^[a-z0-9-]+$/.test(key))throw Error(`Invalid Pulse module key: ${key}`);
  Object.assign(this,{route,key,label,requiredChecks:Object.freeze([...requiredChecks])});
  this.history=null;this.historyError='';
 }
 async openHistory(directory){
  try{this.history=await SendHistoryStore.open(path.join(directory,`${this.key}.json`));this.historyError='';}
  catch(error){this.history=null;this.historyError=error.message;}
  return this;
 }
 /** Modules with required checks only send when every check is ticked. */
 assertChecks(checks){
  const missing=this.requiredChecks.filter(check=>checks?.[check.id]!==true);
  if(missing.length)throw new SendError(`${this.label}: complete the outreach checklist before sending (${missing.map(check=>check.label).join('; ')}).`);
 }
 describe(){return {route:this.route,label:this.label,requiredChecks:this.requiredChecks,historyAvailable:!!this.history};}
}

export class SendModuleRegistry {
 /** Builds every module listed in shared/js/pulse-modules.js and opens its history file. */
 static async open(directory,definitions=pulseModules){
  const registry=new SendModuleRegistry();
  for(const [route,definition] of Object.entries(definitions))registry.add(new SendModule({route,...definition}));
  await Promise.all(registry.all().map(module=>module.openHistory(directory)));
  return registry;
 }
 #byKey=new Map();
 add(module){if(this.#byKey.has(module.key))throw Error(`Duplicate Pulse module key: ${module.key}`);this.#byKey.set(module.key,module);return this;}
 get(key){return this.#byKey.get(key)||null;}
 all(){return [...this.#byKey.values()];}
}
