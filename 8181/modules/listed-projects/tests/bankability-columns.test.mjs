import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {listedProjects} from '../data/source.js';
import {bankabilityReview,bankabilityValues,bankabilityDocuments,bankabilityDocumentUrl} from '../data/bankability.js';
import {listedColumns,migrateBankabilityColumns} from '../profile.js';
const prefix='oplatform:/listed-projects:';
function storage(initial={}){const values=new Map(Object.entries(initial));return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('bankability reuses existing position, appends six fields and retains Open and PPA positions',()=>{
 assert.equal(listedColumns.length,17);assert.equal(listedColumns[6],'Bankability');assert.equal(listedColumns[9],'Review');assert.equal(listedColumns[10],'Offtake Agreement');assert.equal(listedColumns[16],'Loan tenor / Repayment');
 for(const record of listedProjects){assert.equal(bankabilityValues({source:record}).length,6);assert.equal(bankabilityReview(record).financing,'Not evidenced');assert.equal(record.bankability,'Not independently assessed');}
});
test('EBRD mandate is Sushevo 1 only, with grace included rather than added to tenor',()=>{
 const one=bankabilityReview(listedProjects.find(p=>p.id==='sushevo-1-north-macedonia-pv'));
 assert.equal(one.status,'Conditional lender interest');assert.match(one.lender,/EBRD/);assert.match(one.tenor,/14 years total.*including.*1.5 years grace.*12.5/);assert.match(one.loanEquity,/70%.*30%/);assert.match(one.requirements,/Reconfirm 2023/);
 const two=bankabilityReview(listedProjects.find(p=>p.id==='sushevo-2-north-macedonia-pv'));assert.equal(two.lender,'Not identified');assert.equal(two.loanEquity,'Not evidenced');assert.equal(two.tenor,'Not evidenced');assert.deepEqual(two.documents,['sushevo2dd']);
});
test('all Croatia projects distinguish shared indicative terms from approval',()=>{
 for(const record of listedProjects.filter(p=>p.country==='Croatia')){const b=bankabilityReview(record);assert.match(b.lender,/shared portfolio/);assert.match(b.loanEquity,/not project-approved/);assert.match(b.tenor,/not project-approved/);assert.deepEqual(b.documents,['erste','unicredit']);assert.notEqual(b.status,'Confirmed');}
});
test('saved layout appends fields once, preserving order, widths, hidden fields and other state',()=>{
 const order=[5,0,9,1,2,3,4,6,7,8,10];
 const s=storage({[prefix+'column-order']:JSON.stringify(order),[prefix+'visible-columns']:'[0,9]',[prefix+'column-widths']:'{"CAPEX":330}',[prefix+'sidebar-state']:'{"search":"DRIN"}'});
 migrateBankabilityColumns(s);assert.deepEqual(JSON.parse(s.getItem(prefix+'column-order')),[...order,11,12,13,14,15,16]);assert.equal(s.getItem(prefix+'visible-columns'),'[0,9,11,12,13,14,15,16]');assert.equal(s.getItem(prefix+'column-widths'),'{"CAPEX":330}');assert.equal(s.getItem(prefix+'sidebar-state'),'{"search":"DRIN"}');
 s.setItem(prefix+'visible-columns','[0,9]');const before=[...s.values];migrateBankabilityColumns(s);assert.deepEqual([...s.values],before);
 for(const count of [8,10,11]){const legacy=storage({[prefix+'column-order']:JSON.stringify(Array.from({length:count},(_,i)=>count-i-1))});migrateBankabilityColumns(legacy);assert.equal(JSON.parse(legacy.getItem(prefix+'column-order')).length,17);}
 const fresh=storage();migrateBankabilityColumns(fresh);assert.equal(JSON.parse(fresh.getItem(prefix+'column-order')).length,17);
});
test('invalid layout is retained and partial migration failure rolls back',()=>{
 const broken=storage({[prefix+'column-order']:'[1,1]'});const before=[...broken.values];assert.throws(()=>migrateBankabilityColumns(broken));assert.deepEqual([...broken.values],before);
 const s=storage({[prefix+'column-order']:'[0,1,2,3,4,5,6,7,8,9,10]',[prefix+'visible-columns']:'[0,9]'});const set=s.setItem;let fail=true;s.setItem=(key,value)=>{if(key.endsWith('visible-columns')&&fail){fail=false;throw Error('quota');}set(key,value);};assert.throws(()=>migrateBankabilityColumns(s));assert.equal(s.getItem(prefix+'column-order'),'[0,1,2,3,4,5,6,7,8,9,10]');assert.equal(s.getItem(prefix+'visible-columns'),'[0,9]');
});
test('evidence links target existing original docs only, through an exact server allowlist',async()=>{
 const root='C:/Users/mohdz/OneDrive/Documents/Dubai Island/1/Weenergo/docs/WE GREEN ENERGO PUBLIC/WE GREEN ENERGO PUBLIC/';
 for(const [key,d]of Object.entries(bankabilityDocuments)){assert.match(bankabilityDocumentUrl(key),/^\/api\/listed-projects\/bankability-documents\/[a-z0-9]+$/);await access(root+d.file);const bytes=await readFile(root+d.file);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');}
 const server=await readFile(new URL('../../../server.mjs',import.meta.url),'utf8');assert.match(server,/Object.hasOwn\(bankabilityDocuments,key\)/);assert.match(server,/trustedLocalRequest/);
});
