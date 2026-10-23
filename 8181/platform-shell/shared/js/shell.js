import {workspaces} from '/apps/registry.js';
import {EmailVerification,OpportunityPlatformApp,PipelineView,SidebarController} from '/shared/js/platform-app.js';
import {contactSnapshotUrl,hydrateContactRows} from '/shared/js/contact-registry.js';
import {PlatformNavigation} from '/shared/js/navigation.js';
import {ModuleLoader} from '/shared/js/module-loader.js';
import {installListedProjectViews} from '/modules/listed-projects/profile.js';
import {installInvestorOutreach} from '/modules/investors-jv/outreach.js';
import {installInvestorSectors} from '/modules/investors-jv/sectors.js';
import {installOutreachExport} from '/shared/js/outreach-export.js';
import {installProjectPicker} from '/modules/investors-jv/project-picker.js';
import {installOfferHistory} from '/modules/investors-jv/offer-history.js';

installListedProjectViews({OpportunityPlatformApp,PipelineView});
installInvestorOutreach({OpportunityPlatformApp,PlatformNavigation});
installInvestorSectors({OpportunityPlatformApp,PipelineView,SidebarController});
installOutreachExport({OpportunityPlatformApp,PlatformNavigation});
installProjectPicker({OpportunityPlatformApp,PlatformNavigation});
installOfferHistory({OpportunityPlatformApp,PlatformNavigation});

const loader=new ModuleLoader({records:()=>import('/data/records.js'),snapshotUrl:contactSnapshotUrl,hydrate:hydrateContactRows});
async function loadModule(path){
 const rows=await loader.load(path);
 if(path!=='/investors-jv')return rows;
 try{
  const response=await fetch('/api/jev/investors-jv/results',{cache:'no-store'});
  if(!response.ok)return rows;
  const payload=await response.json(),results=payload.results||{};
  return rows.map(row=>results[row.id]?{...row,...results[row.id]}:row);
 }catch{return rows;}
}
const navigation=new PlatformNavigation({root:document.querySelector('#app'),workspaces,loadModule});

document.addEventListener('reoon-results-updated',()=>{
 const app=navigation.app;if(!app)return;
 // Background cache synchronization must not replace the links being clicked.
 app.sidebar.refreshVerificationSignals();
 document.querySelectorAll('[data-reoon-email]').forEach(item=>{
  const result=EmailVerification.result(item.dataset.reoonEmail);
  if(EmailVerification.pending.has(EmailVerification.normalize(item.dataset.reoonEmail))){item.disabled=true;item.textContent='Verifying automatically…';const label=item.previousElementSibling;if(label?.classList.contains('reoon-result'))label.textContent=EmailVerification.label(item.dataset.reoonEmail);return;}
  if(!result&&item.dataset.reoonBusy)return;
  item.disabled=!!result&&!EmailVerification.stale(result);
  item.textContent=result?(EmailVerification.stale(result)?'Recheck with Reoon (uses credit)':'Reoon result saved'):'Verify with Reoon';
  const label=item.previousElementSibling;if(label?.classList.contains('reoon-result'))label.textContent=EmailVerification.label(item.dataset.reoonEmail);
 });
});
navigation.start().catch(()=>navigation.status('Navigation could not start. Browser storage may be full or unavailable. Your saved data has not been changed.'));
EmailVerification.sync().catch(()=>{});
EmailVerification.request('/api/reoon/status').then(status=>EmailVerification.setConnection(status)).catch(error=>EmailVerification.setConnection({connected:false,error:error.message}));
window.addEventListener('focus',()=>{EmailVerification.sync().catch(()=>{});});
