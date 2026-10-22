import {readBrowserOutreachState} from '../../../modules/investors-jv/outreach-export.js';

export function installOutreachExport({OpportunityPlatformApp:App,PlatformNavigation:Navigation}){
 const restore=Navigation.prototype.restore;
 Navigation.prototype.restore=function(...args){const result=restore.apply(this,args);this.app?.syncOutreachExportButton();return result;};
 App.prototype.syncOutreachExportButton=function(){
  const actions=this.root.querySelector('.topbar-actions');if(!actions)return;
  let button=actions.querySelector('[data-outreach-export]');
  if(!button){button=this.root.ownerDocument.createElement('button');button.type='button';button.className='quiet';button.dataset.outreachExport='';button.textContent='Export outreach data (JSON)';button.title='Both datasets, including internal project references. Internal use only; do not forward this file.';actions.append(button);}
  button.hidden=!['/investors-jv','/listed-projects'].includes(this.path);
 };
 const bind=App.prototype.bind;
 App.prototype.bind=function(...args){const result=bind.apply(this,args);this.syncOutreachExportButton();this.root.addEventListener('click',event=>{const button=event.target.closest('[data-outreach-export]');if(button&&!button.hidden)this.exportOutreachData(button);});return result;};
 App.prototype.exportOutreachData=async function(button){
  if(button.disabled)return;button.disabled=true;
  try{
   const state=readBrowserOutreachState(this.navigation?.storage||localStorage);
   const encoded=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(state))));
   if(encoded.length>12000)throw Error('Local contact data exceeds the safe export-header size. No partial file was exported.');
   const response=await fetch('/api/outreach-data/export',{method:'GET',cache:'no-store',headers:{'X-Outreach-Export':'1','X-Outreach-State':encoded}});
   if(!response.ok){const result=await response.json();throw Error(result.error||'Export failed.');}
   const body=await response.text();JSON.parse(body);
   const url=URL.createObjectURL(new Blob([body],{type:'application/json;charset=utf-8'})),link=this.root.ownerDocument.createElement('a');
   link.href=url;link.download='outreach-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   this.navigation?.status('Downloaded outreach-data.json and saved exports/outreach-data.json. Internal project references are included; this file is not anonymous.');
  }catch(error){this.navigation?.status(error.message);}
  finally{button.disabled=false;}
 };
}
