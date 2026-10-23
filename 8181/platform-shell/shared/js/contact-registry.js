// Shared by the browser and server. Module data remains in its owning folder.
export const contactModules=Object.freeze({
 '/listed-projects':{directory:'listed-projects',snapshot:null},
 '/wind-projects':{directory:'wind-projects',snapshot:null},
 '/investors-jv':{directory:'investors-jv',snapshot:null},
 '/hydrogen-offtakers':{directory:'hydrogen-offtakers',snapshot:'contacts.source.json'},
 '/diesel-en590':{directory:'diesel-en590',snapshot:'en590-contacts.source.json'},
 '/e-saf':{directory:'e-saf',snapshot:'contacts.source.json'},
 '/ammonia':{directory:'ammonia',snapshot:'contacts.source.json'},
 '/gases':{directory:'other-gases',snapshot:'contacts.source.json'}
});
// A sourced corporate domain establishes a company route, not ownership by a person.
// This only permits mailbox checking; sending still requires a positive Reoon gate.
export function isSourcedCorporateCandidate(contact,route){
 const email=String(route?.email||'').trim().toLowerCase(),domain=email.split('@')[1];
 const restriction=[contact.status,contact.roleStatus,contact.title,contact.role,route?.status,route?.type].filter(Boolean).join(' ');
 if(!domain||!/candidate only/i.test(restriction)||/generated|historical|not established|user-reported invalid|\bformer\b|replaced|not a current/i.test(restriction))return false;
 return (contact.corporateRoutes||[]).some(item=>item&&typeof item==='object'&&/^https?:\/\//i.test(item.source||'')&&String(item.email||'').toLowerCase().split('@')[1]===domain&&!/candidate|historical|invalid/i.test(`${item.type||''} ${item.status||''}`));
}
export function contactSnapshotUrl(module){const config=contactModules[module];return config?.snapshot?`/modules/${config.directory}/data/${config.snapshot}`:null;}
const identityCache=new Map();
export function contactIdentity(value){
 const raw=String(value||'');if(identityCache.has(raw))return identityCache.get(raw);
 const normalized=raw.normalize('NFKC').trim().toLowerCase().replace(/[\u2010-\u2015]/g,'-').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ');
 if(identityCache.size>=5000)identityCache.delete(identityCache.keys().next().value);identityCache.set(raw,normalized);return normalized;
}
export function contactMatches(contact,{id,assetId,assetName,assetAliases=[],scopedAssets=[],identities=[]}){
 if(contact.recordId)return contactIdentity(contact.recordId)===contactIdentity(id);
 if(contact.assetId)return !!assetId&&contactIdentity(contact.assetId)===contactIdentity(assetId);
 const asset=contactIdentity(contact.asset);
 const aliasMatches=asset&&assetAliases.some(alias=>contactIdentity(alias)===asset);
 if(aliasMatches&&asset!=='european commercial supply')return true;
 const explicitlyScoped=scopedAssets instanceof Set?scopedAssets.has(asset):scopedAssets.some(alias=>contactIdentity(alias)===asset);
 const groupRoute=!explicitlyScoped&&/\b(portfolio|group-wide|global|corporate-wide)\b/.test(asset);
 if(asset&&!groupRoute&&asset!=='european commercial supply')return !!assetName&&asset===contactIdentity(assetName);
 const companies=String(contact.company||'').split(/\s*\/\s*/).map(contactIdentity).filter(Boolean);
 const companyMatches=identities.filter(Boolean).some(value=>companies.some(company=>{
  const identity=contactIdentity(value);
  return identity===company||(` ${identity.replace(/[^\p{L}\p{N}]+/gu,' ')} `).includes(` ${company.replace(/[^\p{L}\p{N}]+/gu,' ')} `);
 }));
 if(aliasMatches&&companyMatches)return true;
 // A named site is not a corporate route just because it contains "refinery".
 if(asset&&!groupRoute)return !!assetName&&asset===contactIdentity(assetName);
 return companyMatches;
}
const signature=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const copy=value=>JSON.parse(JSON.stringify(value));
export function mergeContactRecords(records){
 const merged=[],seen=new Map();
 for(const input of records){
  const contact=normalizeContact(copy(input));
  // Distinct sites/companies and distinct primary email routes must stay distinct.
  const key=JSON.stringify([contact.company,contact.recordId||contact.assetId||contact.asset,contact.name,contact.email].map(contactIdentity));
  if(!seen.has(key)){merged.push(contact);seen.set(key,contact);continue;}
  const target=seen.get(key);
  for(const [field,value]of Object.entries(contact)){
   if(value===undefined||value===null||value==='')continue;
   if(target[field]===undefined||target[field]===null||target[field]===''){target[field]=copy(value);continue;}
   if(signature(target[field])===signature(value))continue;
   if(Array.isArray(target[field])&&Array.isArray(value)){for(const item of value)if(!target[field].some(old=>signature(old)===signature(item)))target[field].push(copy(item));continue;}
   if(target.fieldHistory?.some(old=>old.field===field&&(signature(old.existing)===signature(value)||signature(old.incoming)===signature(value))))continue;
   const entry={field,existing:copy(target[field]),incoming:copy(value)};
   target.fieldHistory=target.fieldHistory||[];
   if(!target.fieldHistory.some(old=>signature(old)===signature(entry)))target.fieldHistory.push(entry);
   if(field==='notes')target.notes=[...new Set([target.notes,value])].join('\n\n');
   if(field==='phone')target.phones=[...new Set([...(target.phones||[]),target.phone,value])];
   if(field==='source'){
    target.sources=target.sources||[];
    for(const url of [target.source,value])if(!target.sources.some(item=>(typeof item==='string'?item:item.url)===url))target.sources.push({url,title:'Preserved contact source'});
   }
  }
 }
 return merged;
}
export function normalizeContact(contact){
 return {...contact,title:contact.title||contact.designation||contact.role||'',
  linkedin:contact.linkedin||contact.linkedinUrl||'',
  phones:[...new Set([...(Array.isArray(contact.phones)?contact.phones:[]),...(contact.phone?[contact.phone]:[])])],
  source:contact.source||contact.sourceUrl||''};
}
export function hydrateContactRows(rows,snapshot={}){
 const supplemental=Array.isArray(snapshot.contacts)?snapshot.contacts:[];
 return rows.map(row=>{
  const original=row.source&&typeof row.source==='object'?row.source:row;
  const identities=[row.id,row.company,row.buyer,row.partner,original.company,original.name].filter(Boolean).map(value=>String(value).trim().toLowerCase());
  const linked=original.contactSnapshotLoaded?[]:supplemental.filter(contact=>contactMatches(contact,{id:row.id,assetId:original.concaweId,assetName:original.company||row.buyer||original.name,identities:[...identities,original.operator,original.contactOperator]}));
  const contacts=mergeContactRecords([...(original.contacts||row.contacts||[]),...linked]);
  const source={...original,name:original.name||row.company||row.buyer||row.partner,contacts};
  return {...row,contacts,source};
 });
}
