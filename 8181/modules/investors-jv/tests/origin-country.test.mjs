import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {migrateOriginCountryColumns} from '../sectors.js';
import {partnerRecords,originCountryAudit} from '../data/source.js';
import {applyOriginCountries} from '../data/china-solar-research.js';
const prefix='oplatform:/investors-jv:';
function storage(initial){const values=new Map(Object.entries(initial));return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}

test('origin exists on every record, is sourced, and never replaces operating markets',()=>{
 assert.equal(originCountryAudit.records,75);
 assert.equal(originCountryAudit.classified,73);
 for(const row of partnerRecords){assert.ok(row.originCountry);assert.ok(row.originCountrySource);assert.ok(row.originCountryBasis);}
 assert.equal(partnerRecords.find(r=>r.id==='chint').originCountry,'China');
 assert.equal(partnerRecords.find(r=>r.id==='chint').country,'United Kingdom / Germany / Netherlands / Hungary / Italy / Portugal / Spain / France');
 assert.equal(partnerRecords.find(r=>r.id==='galileo').originCountry,'Switzerland');
 const clone=structuredClone(partnerRecords),before=JSON.stringify(clone);applyOriginCountries(clone);assert.equal(JSON.stringify(clone),before);
 const newRow={id:'new-company',country:'Italy'};applyOriginCountries([newRow]);assert.equal(newRow.originCountry,'Unknown');assert.equal(newRow.country,'Italy');
});

test('new column appends without changing existing order, hidden columns or widths and stays persistent',()=>{
 const order=[16,4,0,1,2,3,5,6,7,8,9,10,11,12,13,14,15];
 const store=storage({[prefix+'column-order']:JSON.stringify(order),[prefix+'visible-columns']:'[0,4,16]',[prefix+'column-widths']:'{"0":330,"16":210}',[prefix+'sidebar-state']:'{"sector":"Solar PV"}'});
 migrateOriginCountryColumns(store);
 assert.deepEqual(JSON.parse(store.getItem(prefix+'column-order')),[...order,17]);
 assert.equal(store.getItem(prefix+'column-widths'),'{"0":330,"16":210}');
 assert.equal(store.getItem(prefix+'visible-columns'),'[0,4,16,17]');
 assert.equal(store.getItem(prefix+'sidebar-state'),'{"sector":"Solar PV"}');
 store.setItem(prefix+'column-order',JSON.stringify([17,...order]));store.setItem(prefix+'visible-columns','[0,4]');
 const before=[...store.values];migrateOriginCountryColumns(store);assert.deepEqual([...store.values],before);
});

test('exported 18-column layout can be restored without losing origin column settings',async()=>{
 const code=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(code.replace(/export class /g,'class ')+'\nglobalThis.Guard=WorkspaceImportGuard;',context);
 const snapshot={format:'oplatform-workspace',version:1,path:'/investors-jv',state:{'column-order':JSON.stringify([17,...Array.from({length:17},(_,i)=>i)]),'visible-columns':'[0,17]','column-widths':'{"17":180}'}};
 assert.equal(context.Guard.snapshot(snapshot,'/investors-jv').length,3);
});
