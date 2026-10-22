import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {contactModules,contactSnapshotUrl,hydrateContactRows} from '../shared/js/contact-registry.js';
import {loadContactCatalog} from './contact-catalog.mjs';
import {createReoonService} from './reoon.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('all eight module paths are registered and EN590 sourced emails are accepted',async()=>{
 const catalog=await loadContactCatalog(root);
 assert.equal(Object.keys(catalog.modules).length,8);
 for(const module of Object.keys(contactModules))assert.equal(catalog.modules[module].enabled,true);
 assert.ok(catalog.allowedEmails.has('bunkerspain.trading@repsol.com'));
 assert.ok(!catalog.allowedEmails.has('not publicly verified'));
 assert.equal(contactSnapshotUrl('/gases'),'/modules/other-gases/data/contacts.source.json');
 assert.equal(contactSnapshotUrl('/nda-guard'),null);
});
test('contact hydration preserves provenance and never attaches an unrelated company',()=>{
 const original={id:'hydrogen-record',company:'Company A',country:'Germany'};
 const contact={recordId:original.id,name:'Named person',email:'person@example.com',source:'https://example.com/contact',notes:'Unconfirmed role'};
 const rows=hydrateContactRows([original],{contacts:[contact,{company:'Company B',name:'Wrong person'}]});
 assert.equal(original.contacts,undefined);
 assert.equal(rows[0].contacts.length,1);
 assert.equal(rows[0].source.contacts[0].source,contact.source);
 assert.equal(rows[0].source.contacts[0].notes,contact.notes);
 assert.equal(rows[0].source.name,'Company A');
 assert.deepEqual(hydrateContactRows([], {contacts:[contact]}),[]);
});
test('sourced local contacts in every module can verify and reuse one cached mailbox',async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),'8181-modules-'));
 const catalog=await loadContactCatalog(temporary);let calls=0;
 const service=await createReoonService({root:temporary,apiKey:'test-key',allowedEmails:catalog.allowedEmails,fetchImpl:async url=>{calls++;return {ok:true,json:async()=>({email:url.searchParams.get('email'),status:'safe',verification_mode:'power',is_deliverable:true,is_safe_to_send:true})};}});
 for(const module of Object.keys(contactModules)){
  await catalog.register({module,recordId:'test-only',name:'Fixture person',email:'fixture@example.com',source:'https://example.com/contact'},['fixture@example.com']);
  assert.equal((await service.verify(['fixture@example.com']))[0].status,'safe');
 }
 assert.equal(calls,1);
 assert.ok((await loadContactCatalog(temporary)).allowedEmails.has('fixture@example.com'));
 assert.throws(()=>catalog.register({module:'/not-a-module'},['new@example.com']),/source URL/);
 assert.throws(()=>catalog.register({module:'/hydrogen-offtakers',recordId:'id',name:'Person',email:'new@example.com'},['new@example.com']),/source URL/);
});
test('EN590 uses the same contact renderer with source and Reoon controls',async()=>{
 const source=await readFile(new URL('../shared/js/platform-app.js',import.meta.url),'utf8');
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.App=OpportunityPlatformApp;',context);
 const app=Object.create(context.App.prototype);app.path='/diesel-en590';app.detailRecordId='refinery';app.windWorkflow=()=>({});
 const markup=app.renderEn590ProfilePanel({contacts:[{name:'Published route',email:'route@example.com',source:'https://example.com/contact'}]},'contacts');
 assert.match(markup,/data-reoon-email="route@example.com"/);
 assert.match(markup,/data-reoon-module="\/diesel-en590"/);
 assert.match(markup,/data-reoon-source="https:\/\/example.com\/contact"/);
 assert.match(markup,/id="contact-source"/);
 assert.match(markup,/Check Reoon connection/);
});
