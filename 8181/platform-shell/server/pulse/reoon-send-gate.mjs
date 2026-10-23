/** Shared, fail-closed preflight. Never trusts browser verification flags. */
export function createReoonSendGate(reoon,catalog){
 return async request=>{
  const results=[];
  for(const person of request.recipients){
   try{
    await catalog.register({module:`/${request.module}`,recordId:request.recordId,name:person.name||person.email,email:person.email,...(person.origin==='added'?{provenance:'manual-contact-entry'}:{})},[person.email]);
    const [result]=await reoon.verify([person.email],{refresh:true});
    const age=Date.now()-Date.parse(result?.checkedAt);
    const freshPower=result?.email===person.email&&result.provider==='Reoon'&&result.mode==='power'&&Number.isFinite(age)&&age>=-60000&&age<=30*86400000;
    const disposable=freshPower&&result.status==='disposable'&&!['is_disabled','is_spamtrap','has_inbox_full'].some(flag=>result.raw?.[flag]===true);
    const consented=Array.isArray(request.disposableOverride)&&request.disposableOverride.includes(person.email);
    const allowed=freshPower&&((result.deliverable===true&&['safe','role_account','catch_all'].includes(result.status))||(disposable&&consented));
    results.push({...result,email:person.email,allowed,disposable,error:allowed?'':`Reoon: ${result?.status||'not verified'} — sending blocked.`});
   }catch(error){results.push({email:person.email,allowed:false,status:'unavailable',error:error.message});}
  }
  return results;
 };
}
