import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {partnerRecords} from '../data/source.js';
import {chinaSolarResearch} from '../data/china-solar-research.js';

test('China country option covers all 25 linked records without replacing operating locations',async()=>{
 const code=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(code.replace(/export class /g,'class ')+'\nglobalThis.Sidebar=SidebarController;',context);
 const sidebar=Object.create(context.Sidebar.prototype);
 const rows=partnerRecords.map(source=>({id:source.id,country:source.country,source}));
 const countries=rows.flatMap(row=>Array.from(sidebar.countryFilterValues(row)));
 assert.ok(countries.includes('China'));
 sidebar.countryValues=['China'];sidebar.countryMode='include';
 assert.deepEqual(rows.filter(row=>sidebar.countryMatches(row)).map(row=>row.id).sort(),chinaSolarResearch.map(row=>row.id).sort());
 for(const record of chinaSolarResearch){assert.equal(partnerRecords.find(row=>row.id===record.id).country,record.country);}
 sidebar.countryMode='exclude';
 assert.equal(rows.filter(row=>sidebar.countryMatches(row)).length,50);
 sidebar.countryValues=[];assert.equal(rows.filter(row=>sidebar.countryMatches(row)).length,75);
 assert.deepEqual(Array.from(sidebar.countryFilterValues({country:'Spain'})),['Spain']);
});
