import {projects as windProjects} from '/modules/wind-projects/data/source.js';
export {listedRows} from '/modules/listed-projects/data/source.js';
import {partnerRecords, partnerContacts} from '/modules/investors-jv/data/source.js';
import {hydrogenRows} from '/modules/hydrogen-offtakers/data/source.js';
import {contactIdentity,contactMatches,mergeContactRecords} from '/shared/js/contact-registry.js';
import {refineryContactAliases,refineryCompanyAliases} from '/modules/diesel-en590/data/contact-associations.js';
const scopedContactAssets=new Set(Object.values(refineryContactAliases).flat().map(contactIdentity));

export {hydrogenRows};

// The source modules remain untouched. These normalized rows are only a view model
// for the shared table; raw records and contacts remain available for later tabs.
export const imported = {
  windProjects,
  partnerRecords,
  partnerContacts,
  hydrogenRows,
  counts: {windProjects: windProjects.length, partnerRecords: partnerRecords.length, partnerContacts: Object.values(partnerContacts).flat().length}
};

export const windRows = windProjects.map(project => ({
  id: project.id,
  project: project.name,
  developer: project.developer,
  country: project.country,
  scale: project.capacity,
  signal: project.signal,
  status: project.partnership,
  workflow: project.stage,
  review: 'Open',
  contacts: project.contacts || [],
  source: project
}));

export const partnerRows = partnerRecords.map(partner => {
 const contacts=(partnerContacts[partner.id]||[]).map(contact=>({
  ...contact,phones:[...new Set([...(Array.isArray(contact.phones)?contact.phones:[]),...(contact.phone?[contact.phone]:[])])]
 }));
 // The shared detail renderer consumes source, not the table's display columns.
 // Keep company research and typed contact provenance available on every tab.
 const source={...partner,name:partner.company,developer:partner.partnerType,
  capacity:partner.scale,technology:partner.subSector,signal:partner.status,
  partnership:partner.intent,contacts,
  gaps:partner.notes?[partner.notes]:[],
  source:{date:partner.contactResearch?.asOf||partner.latestEvidence},
  history:[['Research checkpoint',partner.contactResearch?.asOf||'Not recorded'],
   ['Research conclusion',partner.contactResearch?.conclusion||partner.summary],
   ['Verification limits',partner.contactResearch?.verification||partner.notes]],
  sources:(partner.sources||[]).map(item=>typeof item==='string'
   ?{url:item,title:`Research source — ${new URL(item).hostname}`,date:'Publication date: see source'}
   :{...item})
 };
 return {
  id: partner.id,
  partner: partner.company,
  country: partner.country,
  intent: partner.intent,
  scale: partner.scale,
  latestEvidence: partner.latestEvidence,
  status: partner.status,
  workflow: partner.stage,
  review: 'Open',
  contacts,
  source
 };
});

const germanHydrogenZones = new Set([
  'altmark-arneburg', 'bitterfeld-wolfen', 'eberswalde', 'gid-ost-delitzsch',
  'guben-sued', 'high-tech-park-magdeburg', 'koethen', 'leuna', 'piesteritz',
  'premnitz', 'schwarze-pumpe', 'schwedt', 'sket-magdeburg', 'solvay-bernburg',
  'technologiepark-mitteldeutschland', 'valuepark-schkopau-boehlen', 'zeitz'
]);

function hydrogenZoneCountry(zoneId) {
  return germanHydrogenZones.has(zoneId) ? 'Germany' : 'Poland';
}

export async function loadLegacyRows(pathname) {
  if (pathname === '/diesel-en590') {
    const [buyerSnapshot,sellerSnapshot,refinerySnapshot,concaweRefinerySnapshot,contactSnapshot] = await Promise.all([
      fetch('/data/en590-companies.source.json').then(response => response.json()),
      fetch('/data/en590-sellers.source.json').then(response => response.json()),
      fetch('/data/en590-refineries.source.json').then(response => response.json()),
      fetch('/data/en590-refineries-2024-concawe.source.json').then(response => response.json()),
      fetch('/data/en590-contacts.source.json').then(response => response.json())
    ]);
    const importedContacts = (() => {
      try {
        const value = localStorage.getItem('oplatform:/diesel-en590:imported-refinery-contacts');
        return value ? JSON.parse(value) : [];
      } catch {
        return [];
      }
    })();
    const contacts = mergeContactRecords([...(contactSnapshot.contacts || []), ...(Array.isArray(importedContacts) ? importedContacts : [])]);
    // A refinery can have an operating company, a parent group and an asset name.
    // Match every known identity so asset-specific contacts are retained alongside
    // legitimate parent-group escalation routes without duplicating contact records.
    const attachContacts = (...identities) => {
      const normalized = identities.flat().filter(Boolean);
      const name=normalized.at(-1);
      return contacts.filter(contact => contactMatches(contact,{assetName:name,assetAliases:refineryContactAliases[name]||[],scopedAssets:scopedContactAssets,identities:[...normalized,...(refineryCompanyAliases[name]||[])]}));
    };
    const buyerRoles = {
      'Trading house / buyer RFQ': ['Buyer · Trading house','Reported EN590 buyer RFQ. The company may be acting as principal or intermediary; purchase mandate and financing are not yet verified.'],
      'Trading house / importer-side sourcer': ['Buyer · Importer-side sourcer','Reported to source cargoes for buyers. This does not establish that the entity itself is the purchasing principal.'],
      'Buyer-posted importer RFQ': ['Buyer · Importer RFQ','Reported importer-side RFQ. The stated purchase requirement is not an awarded contract or confirmed procurement mandate.'],
      'Self-declared buyer in LOI': ['Buyer · LOI claimant','Reported purchase intention through an LOI. Legal entity, authority, financing and transaction readiness need verification.'],
      'State-owned petroleum importer / procuring entity': ['Buyer · State procuring entity','State petroleum importer / procuring entity. Reported past procurement does not confirm an open current tender.']
    };
    const buyers = (buyerSnapshot.companies || []).map((item, index) => {
      const [role,roleBrief] = buyerRoles[item.type] || ['Buyer · Unclassified','Reported buyer-side lead; commercial authority needs verification.'];
      return ({
      id: `buyer:${index}:${item.company}`,
      buyer: item.company,
      country: item.country,
      product: 'EN590 10 ppm',
      signal: role,
      role,
      roleBrief,
      tradeSide: 'Buyer',
      entityRole: item.type,
      commercialEvidence: item.batch,
      verification: 'Claimed · verify authority',
      status: 'Imported buyer lead',
      evidence: item.sources?.[0] || '—',
      source: {...item,tradeSide:'Buyer',role,roleBrief,entityRole:item.type,productSpec:'EN590 10 ppm',commercialEvidence:item.batch,supplyAuthority:'Not applicable',verification:'Claimed · verify authority',contacts:attachContacts(item.company)}
    });});
    const sellers = (sellerSnapshot.counterparties || []).map((item, index) => {
      const role=`Seller · ${item.sellerType}`;
      const roleBrief=item.sellerType==='Authorized marketer / exporter'?'Reported marketer or exporter. A current authorization, allocation and product entitlement must be evidenced before treating it as a principal supply route.':'Reported trader-side supplier. No refinery ownership, allocation or authority is inferred from the supply claim alone.';
      return ({
      id: `seller:${index}:${item.company}`,
      buyer: item.company,
      country: item.country,
      product: item.productSpec || 'EN590 10 ppm · verify',
      signal: role,
      role,
      roleBrief,
      tradeSide: 'Seller',
      entityRole: item.sellerType,
      commercialEvidence: item.commercialEvidence,
      verification: item.supplyAuthority,
      status: item.status,
      evidence: item.sources?.[0]?.url || item.sources?.[0] || '—',
      source: {...item,tradeSide:'Seller',role,roleBrief,entityRole:item.sellerType,contacts:attachContacts(item.company)}
    });});
    const legacyConcaweRefineryMetadata={
      'Repsol — Cartagena refinery':{id:'5vuxxv',mtpa:11,kbblCd:232},
      'Repsol — Tarragona refinery':{id:'tch28x',mtpa:9,kbblCd:189},
      'Repsol — Puertollano refinery':{id:'j9ufe0',mtpa:7.5,kbblCd:158},
      'Repsol — A Coruña refinery':{id:'uoldak',mtpa:6,kbblCd:126},
      'Petronor (Repsol group) — Bilbao refinery':{id:'colxta',mtpa:11,kbblCd:232},
      'Moeve — La Rábida refinery':{id:'v3fopp',mtpa:9.03,kbblCd:190},
      'Moeve — Gibraltar-San Roque refinery':{id:'xe00gw',mtpa:11.88,kbblCd:250},
      'bp — Castellón refinery':{id:'58qz39',mtpa:5.23,kbblCd:110},
      'Galp — Sines refinery':{id:'labhm2',mtpa:11.3,kbblCd:238}
    };
    const concaweRefineries=(concaweRefinerySnapshot.assets || []).map(asset=>({
      company:`${asset.operator} — ${asset.site} refinery`,
      operator:asset.operator,
      country:asset.country,
      location:`${asset.site}, ${asset.country}`,
      concaweId:asset.id,
      primaryCapacityMta:asset.mtpa,
      primaryCapacityKbblCd:asset.kbblCd,
      tradeSide:'Seller',
      sellerType:'Refinery operator',
      chainPosition:'Producer / refinery operator',
      assetClass:'Mainstream refinery',
      sourceYear:concaweRefinerySnapshot.source?.datasetYear || 2024,
      productSpec:'Refinery products; EN590 availability not verified',
      commercialEvidence:`Concawe's ${concaweRefinerySnapshot.source?.datasetYear || 2024} map lists ${asset.site}, ${asset.country} as an open mainstream refinery, owner ${asset.operator}, with primary refining capacity ${asset.mtpa} Mt/a (${asset.kbblCd} kbbl/cd).`,
      supplyAuthority:'Refinery operation reported by Concawe · allocation unverified',
      status:'Refinery operator · qualification required',
      sources:[{url:concaweRefinerySnapshot.source?.url || 'https://www.concawe.eu/refineries-map/',date:'2026-10-19',claim:`Concawe ${concaweRefinerySnapshot.source?.datasetYear || 2024} public map: ${asset.site}, ${asset.country}; owner ${asset.operator}; open mainstream refinery; ${asset.mtpa} Mt/a (${asset.kbblCd} kbbl/cd).`}]
    }));
    const legacyRefineries=(refinerySnapshot.counterparties || []).map(item=>{
      const concawe=legacyConcaweRefineryMetadata[item.company];
      if(!concawe)return item;
      const concaweSource={url:concaweRefinerySnapshot.source?.url || 'https://www.concawe.eu/refineries-map/',date:'2026-10-19',claim:`Concawe 2024 public map: ${item.company}; open mainstream refinery; ${concawe.mtpa} Mt/a (${concawe.kbblCd} kbbl/cd).`};
      return {...item,concaweId:concawe.id,primaryCapacityMta:concawe.mtpa,primaryCapacityKbblCd:concawe.kbblCd,sourceYear:concaweRefinerySnapshot.source?.datasetYear || 2024,sources:[...(item.sources || []),concaweSource]};
    });
    const refineries = [...legacyRefineries,...concaweRefineries].map((item, index) => ({
      id: `refinery:${index}:${item.company}`,
      buyer: item.company,
      country: item.country,
      product: item.productSpec,
      signal: 'Seller · Refinery operator',
      role: 'Seller · Refinery operator',
      roleBrief: 'Verified refinery-operator asset. This confirms refining activity only; current EN590 availability, allocation, export authority and commercial terms remain unverified.',
      tradeSide: 'Seller',
      entityRole: 'Refinery operator',
      commercialEvidence: item.commercialEvidence,
      verification: item.supplyAuthority,
      status: item.status,
      evidence: item.sources?.[0]?.url || '—',
      source: {...item,tradeSide:'Seller',role:'Seller · Refinery operator',roleBrief:'Verified refinery-operator asset. This confirms refining activity only; current EN590 availability, allocation, export authority and commercial terms remain unverified.',entityRole:'Refinery operator',contacts:attachContacts(item.operator,item.contactOperator,item.company)}
    }));
    return [...buyers,...sellers,...refineries].map(row=>({...row,source:{...row.source,contactSnapshotLoaded:true}}));
  }
  return [];
}
