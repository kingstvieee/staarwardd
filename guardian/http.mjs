import { createGuardianCore } from './core.mjs';

// Single process-level Guardian brain. All portal/API views read the same state.
export const guardian = createGuardianCore({timezone:'America/Toronto'});

export async function handleGuardianApi(req,res,{json,bodyJson}){
  const url = new URL(req.url,'http://guardian.local');
  const path = url.pathname;

  if(req.method==='GET' && path==='/api/guardian/briefing'){
    return json(res,200,{guardian:'core-v1',...guardian.briefing()});
  }

  if(req.method==='GET' && path==='/api/guardian/missions'){
    const portal=url.searchParams.get('portal')||undefined;
    const status=url.searchParams.get('status')||undefined;
    try { return json(res,200,{missions:guardian.listMissions({portal,status})}); }
    catch(e){ return json(res,400,{error:e.message}); }
  }

  if(req.method==='GET' && path.startsWith('/api/guardian/missions/')){
    const id=decodeURIComponent(path.slice('/api/guardian/missions/'.length));
    const mission=guardian.getMission(id);
    return mission ? json(res,200,{mission}) : json(res,404,{error:'Mission not found'});
  }

  if(req.method==='GET' && path==='/api/guardian/activity'){
    return json(res,200,{activity:guardian.getLedger()});
  }

  if(req.method==='POST' && path==='/api/guardian/private-mode'){
    const body=await bodyJson(req);
    if(typeof body.enabled!=='boolean') return json(res,400,{error:'enabled must be boolean'});
    return json(res,200,guardian.setPrivateMode(body.enabled));
  }

  if(req.method==='PATCH' && path.startsWith('/api/guardian/missions/')){
    const id=decodeURIComponent(path.slice('/api/guardian/missions/'.length));
    const body=await bodyJson(req);
    const {patch={},ledgerState,summary,evidence}=body;
    try {
      const mission=guardian.updateMission(id,patch,{ledgerState,summary,evidence});
      return json(res,200,{mission,briefing:guardian.briefing()});
    } catch(e){
      const status=e.message==='Mission not found'?404:400;
      return json(res,status,{error:e.message});
    }
  }

  return false;
}
