export const SECTOR_OPTIONS=Object.freeze(['Wind','Solar PV','e-SAF','Hybrid','BESS','Hydrogen','Ammonia','Other']);
const path='/investors-jv';
export function normalizeSectors(values){return SECTOR_OPTIONS.filter(sector=>Array.isArray(values)&&values.includes(sector));}
/** Existing classification only. A sector is not evidence of a current investment mandate. */
export function defaultSectors(row){
 const source=row.source||row;
 if(Array.isArray(source.sectors))return normalizeSectors(source.sectors);
 const text=String(source.subSector||'');
 return SECTOR_OPTIONS.filter(sector=>({Wind:/\bwind\b/i,'Solar PV':/\bsolar\b|\bpv\b/i,'e-SAF':/\be-saf\b/i,Hybrid:/\bhybrid\b/i,BESS:/\bbess\b|\bstorage\b/i,Hydrogen:/\bhydrogen\b/i,Ammonia:/\bammonia\b/i,Other:/$a/}[sector]).test(text));
}
export function sectorState(storage,row){
 const raw=storage.getItem(`oplatform:${path}:detail-workflow`),all=raw?JSON.parse(raw):{};
 if(!all||typeof all!=='object'||Array.isArray(all))throw Error('Invalid saved workflow.');
 const entry=all[row.id];
 return entry&&Object.hasOwn(entry,'sectors')?normalizeSectors(entry.sectors):defaultSectors(row);
}
/** Add a column without discarding saved column order, widths or visibility. */
export function migrateSectorColumns(storage){
 const prefix=`oplatform:${path}:`,marker='oplatform-investor-sector-layout-v1';
 const keys=['column-order','column-widths','visible-columns'].map(key=>prefix+key),before=keys.map(key=>[key,storage.getItem(key)]);
 const oldOrder=JSON.parse(before[0][1]||'null');
 if(Array.isArray(oldOrder)&&oldOrder.length===9&&new Set(oldOrder).size===9&&oldOrder.every(value=>Number.isInteger(value)&&value>=0&&value<9)){if(!storage.getItem(marker))storage.setItem(marker,'1');return;}
 const valid=Array.isArray(oldOrder)&&oldOrder.length===8&&new Set(oldOrder).size===8&&oldOrder.every(value=>Number.isInteger(value)&&value>=0&&value<8);
 const order=(valid?oldOrder:[0,1,2,3,4,5,6,7]).map(index=>index===7?8:index),position=1;order.splice(position,0,7);
 const widths=JSON.parse(before[1][1]||'{}'),visible=JSON.parse(before[2][1]||'null');
 if(!widths||typeof widths!=='object'||Array.isArray(widths))throw Error('Saved column widths need review.');
 const nextWidths=Object.fromEntries(Object.entries(widths).filter(([key])=>/^\d+$/.test(key)&&Number(key)<8).map(([key,value])=>[Number(key)>=position?Number(key)+1:Number(key),value]));
 const nextVisible=Array.isArray(visible)?[...new Set([...visible.filter(index=>Number.isInteger(index)&&index>=0&&index<8).map(index=>index===7?8:index),7])]:[0,1,2,3,4,5,6,7,8];
 if(!storage.getItem('oplatform-investor-sector-layout-backup-v1'))storage.setItem('oplatform-investor-sector-layout-backup-v1',JSON.stringify(before));
 try{storage.setItem(keys[0],JSON.stringify(order));storage.setItem(keys[1],JSON.stringify(nextWidths));storage.setItem(keys[2],JSON.stringify(nextVisible));storage.setItem(marker,'1');}
 catch(error){for(const [key,value]of before){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}throw error;}
}
export function installInvestorSectors({OpportunityPlatformApp:App,PipelineView:Pipeline}){
 const columns=Pipeline.prototype.columns,values=Pipeline.prototype.values,cell=Pipeline.prototype.cell,render=Pipeline.prototype.render;
 Pipeline.prototype.columns=function(){const result=columns.call(this);return this.path===path?[...result.slice(0,-1),'Sector',result.at(-1)]:result;};
 Pipeline.prototype.sectorsFor=function(row){return sectorState(localStorage,row);};
 Pipeline.prototype.values=function(row){const result=values.call(this,row);if(this.path!==path)return result;let sectors;try{sectors=this.sectorsFor(row).join(', ')||'Not classified';}catch{sectors='Storage unavailable';}return [...result.slice(0,-1),sectors,result.at(-1)];};
 Pipeline.prototype.cell=function(row,value,index){
  if(this.path!==path||this.columns()[index]!=='Sector')return cell.call(this,row,value,index);
  let selected=[],disabled=false;try{selected=this.sectorsFor(row);}catch{disabled=true;}
  const label=selected.join(' · ')||'Select sectors';
  return `<td class="investor-sector-cell"><details class="investor-sector-picker"><summary aria-label="Sector for ${this.escape(this.name(row))}">${this.escape(disabled?'Storage unavailable':label)}</summary><div class="investor-sector-options" role="group" aria-label="Sector choices for ${this.escape(this.name(row))}">${SECTOR_OPTIONS.map(sector=>`<label><input type="checkbox" aria-label="${this.escape(sector)} for ${this.escape(this.name(row))}" data-investor-sector="${this.escape(sector)}" data-sector-record="${this.escape(row.id)}" ${selected.includes(sector)?'checked':''} ${disabled?'disabled':''}> ${this.escape(sector)}</label>`).join('')}<small>Classification only; investment intent needs separate evidence.</small></div></details></td>`;
 };
 Pipeline.prototype.render=function(...args){
  if(this.path===path){try{migrateSectorColumns(localStorage);}catch{this.root.innerHTML='<p role="alert">Sector column could not load safely. Saved layout is retained; check browser storage and reload.</p>';return;}
   if(this.columnOrder?.length!==9)this.columnOrder=null;
  }
  return render.apply(this,args);
 };
 const bind=App.prototype.bind;
 App.prototype.bind=function(...args){
  const result=bind.apply(this,args);
  this.root.addEventListener('change',event=>{
   const input=event.target;if(this.path!==path||!input.matches('[data-investor-sector]'))return;
   const row=this.rows.find(item=>item.id===input.dataset.sectorRecord),picker=input.closest('.investor-sector-picker');if(!row||!picker)return;
   const summary=picker.querySelector('summary');
   try{
    // Read first: corrupt existing workflow must never be overwritten by an edit.
    sectorState(localStorage,row);
    const sectors=normalizeSectors([...picker.querySelectorAll('[data-investor-sector]:checked')].map(item=>item.dataset.investorSector));
    this.saveWindWorkflow(row.id,{sectors});summary.textContent=sectors.join(' · ')||'Select sectors';
   }catch{input.checked=!input.checked;summary.textContent='Not saved — storage unavailable';this.navigation?.status('Sector change was not saved. Existing company data has not been replaced.');}
  });
  return result;
 };
}
