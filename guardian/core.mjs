const PORTALS = ['Creativity','Work','Home','Wellbeing','Relationships','Community','Style'];
const MISSION_STATUSES = ['active','waiting','blocked','approval-needed','completed','paused'];
const LEDGER_STATES = ['PLANNED','ATTEMPTED','BLOCKED','WAITING','APPROVAL_NEEDED','VERIFIED_COMPLETE'];

const initialMissions = [
  {
    id:'hub-core-build', title:'Hub Core Build', outcome:'Build the STAARWAARDD project up',
    portals:['Work'], status:'active', priority:100, timeSensitivity:'high',
    currentState:'Guardian Core V1 implementation has started on an isolated product branch.',
    nextAction:'Implement and verify persistent mission registry plus activity ledger.', blocker:null,
    approvalRequired:false, lastVerifiedUpdate:null
  },
  {
    id:'puppy-search', title:'Puppy Search', outcome:'Find the right Cane Corso × Dogo Argentino puppy in Toronto',
    portals:['Home','Relationships'], status:'active', priority:70, timeSensitivity:'medium',
    currentState:'Monitoring/research mission. Seller contact must be drafted and held for review.',
    nextAction:'Review newly available Toronto matches when a monitoring source supplies them.', blocker:'External listing source is not connected to this runtime yet.',
    approvalRequired:false, lastVerifiedUpdate:null
  },
  {
    id:'rsf-fabric-sourcing', title:'RSF Fabric Sourcing', outcome:'Source high-quality materials for RISING STAARDFORM prototypes',
    portals:['Style','Work','Creativity'], status:'active', priority:65, timeSensitivity:'medium',
    currentState:'Material sourcing mission preserving the established architectural luxury direction.',
    nextAction:'Build a verified shortlist of prototype fabrics and embellishment materials.', blocker:'External supplier/search adapter is not connected to this runtime yet.',
    approvalRequired:false, lastVerifiedUpdate:null
  }
];

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function isoNow(clock=Date){ return new clock().toISOString(); }
function assertPortal(portal){ if(!PORTALS.includes(portal)) throw new Error(`Unknown portal: ${portal}`); }

export function createGuardianCore({clock=Date, timezone='America/Toronto'}={}){
  const missions = new Map(initialMissions.map(m => [m.id,{...clone(m),createdAt:isoNow(clock),updatedAt:isoNow(clock)}]));
  const ledger = [];
  let privateMode = false;

  function log({missionId=null,state,summary,evidence=null,requiresApproval=false}){
    if(!LEDGER_STATES.includes(state)) throw new Error(`Invalid ledger state: ${state}`);
    const entry={id:`evt-${ledger.length+1}`,missionId,state,summary:String(summary||''),evidence,requiresApproval:Boolean(requiresApproval),timestamp:isoNow(clock)};
    ledger.push(entry); return clone(entry);
  }

  function listMissions({portal,status}={}){
    if(portal) assertPortal(portal);
    return [...missions.values()].filter(m => (!portal || m.portals.includes(portal)) && (!status || m.status===status)).sort((a,b)=>b.priority-a.priority).map(clone);
  }

  function getMission(id){ const mission=missions.get(id); return mission ? clone(mission) : null; }

  function updateMission(id,patch={},meta={}){
    const mission=missions.get(id); if(!mission) throw new Error('Mission not found');
    if(patch.status && !MISSION_STATUSES.includes(patch.status)) throw new Error('Invalid mission status');
    if(patch.portals){ patch.portals.forEach(assertPortal); }
    const next={...mission,...clone(patch),id:mission.id,updatedAt:isoNow(clock)};
    if(next.status==='completed' && meta.ledgerState!=='VERIFIED_COMPLETE') throw new Error('Completion requires VERIFIED_COMPLETE evidence');
    if(meta.ledgerState){
      const entry=log({missionId:id,state:meta.ledgerState,summary:meta.summary||`Updated ${mission.title}`,evidence:meta.evidence||null,requiresApproval:next.approvalRequired});
      if(meta.ledgerState==='VERIFIED_COMPLETE') next.lastVerifiedUpdate=entry.timestamp;
    }
    missions.set(id,next); return clone(next);
  }

  function temporalContext(){
    const now=isoNow(clock);
    let local=now;
    try { local=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,dateStyle:'full',timeStyle:'long'}).format(new clock()); } catch {}
    return {now,timezone,local};
  }

  function briefing(){
    const active=listMissions().filter(m=>!['completed','paused'].includes(m.status));
    const approval=active.filter(m=>m.status==='approval-needed' || m.approvalRequired);
    const blocked=active.filter(m=>m.status==='blocked' || m.blocker);
    return {
      temporal:temporalContext(), privateMode,
      priority:active[0]||null,
      activeCount:active.length,
      approvalNeeded:approval,
      blocked,
      missions:active,
      recentActivity:ledger.slice(-10).map(clone)
    };
  }

  function setPrivateMode(enabled){ privateMode=Boolean(enabled); log({state:'VERIFIED_COMPLETE',summary:`Private Mode ${privateMode?'enabled':'disabled'}.`,evidence:{setting:'privateMode',value:privateMode}}); return {privateMode}; }

  initialMissions.forEach(m => log({missionId:m.id,state:'PLANNED',summary:`Mission registered: ${m.title}.`}));
  return {listMissions,getMission,updateMission,log,briefing,temporalContext,setPrivateMode,getLedger:()=>ledger.map(clone)};
}

export { PORTALS, MISSION_STATUSES, LEDGER_STATES };
