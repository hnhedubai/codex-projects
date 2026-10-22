// Module-owned content adapter. All layout, typography, tables and navigation stay shared.
export const listedColumns=['Project','Owner','Country','Technology','Capacity','CAPEX','Bankability','Stage','Annual generation','Review'];
export function installListedProjectViews({OpportunityPlatformApp:App,PipelineView:Pipeline}){
 const values=Pipeline.prototype.values;
 Pipeline.prototype.values=function(row){return this.path==='/listed-projects'?[row.project,`${row.owner} (user-reported)`,row.country,row.technology,row.capacity,row.capex,row.bankability,row.stage,row.annualGeneration,'Open']:values.call(this,row);};
 const overview=App.prototype.renderWindOverview;
 App.prototype.renderWindOverview=function(record){
  if(this.path!=='/listed-projects')return overview.call(this,record);
  const card=(heading,body)=>`<section class="wind-detail-panel"><h2>${this.escape(heading)}</h2>${body}</section>`;
  const facts=this.detailGrid([['Owner',record.owner],['Ownership basis',record.ownerBasis],['Legal SPV',record.legalSpv],['Capacity',record.capacity],['CAPEX',record.capex],['Bankability',record.bankability],['Annual generation',record.annualGeneration],['Development stage',record.stage]]);
  const state=this.windWorkflow(this.detailRecordId),status={queued:'Queued',running:'Running',completed:'Completed',review:'Needs review'}[state.researchStatus]||'Not started';
  return `<div class="wind-overview-layout"><div class="wind-overview-main">${card('Investment snapshot',`<div class="wind-overview-snapshot"><p class="wind-detail-summary">${this.escape(record.summary)}</p>${facts}</div>`)}${card('Deep research · Overview',`<p>${this.escape(status)}. Imported one-pager claims require supporting documents and independent review.</p><button type="button" class="primary" data-detail-action="start-research">Start Overview research →</button>`)}${card('What needs to be established',this.detailList(record.gaps))}</div><aside class="wind-overview-side">${card('Recommended next step',`<p>${this.escape(record.next)}</p><button type="button" class="primary" data-detail-action="outreach">Prepare an enquiry →</button>`)}${card('Research discipline',`<p>Listing selection is not lender approval, completed RTB, a signed PPA or an independently verified offering mandate.</p><p>${this.escape(record.ownerBasis)}</p><p>Source projections are not guaranteed returns.</p><button type="button" class="quiet" data-detail-action="checklist">Review checklist</button>`)}</aside></div>`;
 };
 const panel=App.prototype.renderWindPanel;
 App.prototype.renderWindPanel=function(record,tab){
  if(this.path!=='/listed-projects'||tab!=='project')return panel.call(this,record,tab);
  const card=(heading,body,modifier='')=>`<section class="wind-detail-panel ${modifier}"><h2>${this.escape(heading)}</h2>${body}</section>`;
  return card('Project facts',this.detailGrid([['Project',record.name],['Owner',record.owner],['Ownership basis',record.ownerBasis],['Legal SPV',record.legalSpv],['Country / location',`${record.country} - ${record.location}`],['Technology',record.technology],['Reported capacity',record.capacity],['Annual generation',record.annualGeneration],['Turbines',record.turbines||'Not applicable - Solar PV'],['Specific yield',record.yield||'Not stated'],['Development status',record.stage],['Permits / land',record.permits],['Grid connection',record.gridConnection],['Commercial operation','COD not supplied'],['One-pager file date',`${record.document.date} (filename)`],['Document as-of period',record.document.asOf||'Not stated'],['Source branding',record.sourceBrand],['Independent verification','Not performed']]),'wind-project-facts')+card('Bankability & financing readiness',this.detailGrid(record.bankabilityFacts))+card('Evidence gaps',this.detailList(record.gaps),'wind-evidence-gaps');
 };
 const financials=App.prototype.renderFinancialsPanel;
 App.prototype.renderFinancialsPanel=function(record,card){
  const markup=financials.call(this,record,card);if(this.path!=='/listed-projects')return markup;
  const gaps=(record.gaps||[]).filter(value=>/reconciliation|NPV|OPEX|capacity conflict|filename date/i.test(value));
  return markup.replace('including wind yield','including solar or wind yield').replace('</div><aside class="wind-financials-side">',`${card('Source clarifications',this.detailList(gaps))}</div><aside class="wind-financials-side">`);
 };
 const outreach=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(record){
  const markup=outreach.call(this,record);if(this.path!=='/listed-projects'||this.windWorkflow(this.detailRecordId).outreachDraft)return markup;
  const draft=`Subject: ${record.name} - project documentation and partnership scope\n\nDear We Green Energo Team,\n\nWe are reviewing ${record.name}, ${record.capacity}, in ${record.country}, for potential investment or collaboration.\n\nPlease confirm current availability, the legal owning SPV and your authority to represent the project; the proposed transaction structure and equity requirement; outstanding development milestones; and the status of land rights, permits, grid connection and offtake.\n\nWe would welcome a current non-confidential brief and a reconciliation of the one-pager assumptions, followed by the financial model and supporting documentation under appropriate confidentiality arrangements. Please also clarify whether independent technical or lender due diligence has been completed.\n\nKind regards,`;
  return markup.replace(/(<textarea id="outreach-draft"[^>]*>)[\s\S]*?(<\/textarea>)/,(_,open,close)=>open+this.escape(draft)+close);
 };
}
