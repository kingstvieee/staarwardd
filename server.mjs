import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public/', import.meta.url));
await loadEnv();
const port = Number(process.env.PORT || 3000);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webm':'video/webm', '.json':'application/json' };

export function demoPlan(input) {
  const q = String(input || '').trim();
  const lower = q.toLowerCase();
  const domains = [];
  const find = (words, domain) => words.some(w => lower.includes(w)) && domains.push(domain);
  find(['work','meeting','email','deadline','project','presentation','client','focus','schedule','conflict','communication'], 'Work');
  find(['creative','creativity','write','paint','music','idea','design','media','content','diggitstaar','publish'], 'Creativity');
  find(['home','grocer','meal','clean','repair','laundry','kitchen','device','routine','security','arrival','departure','staar access','household'], 'Home');
  find(['wellbeing','wellness','health','walk','sleep','stress','exercise','meditat'], 'Wellbeing');
  find(['relationship','partner','friend','family','date','commitment','memory'], 'Relationships');
  find(['community','volunteer','neighbour','event','accessible','accessibility','local','place'], 'Community');
  find(['style','outfit','wardrobe','wear','fitting','mirror','rising staardform'], 'Style');
  if (!domains.length) domains.push('Work', 'Wellbeing');
  const unique = [...new Set(domains)];
  const sensitive = /send|email|message|contact|invite|book|buy|purchase|cancel|delete|share|publish|pay|order|post|register|rsvp/.test(lower);
  const label = q || 'Create a balanced plan for my day';
  const now = unique.slice(0, 2).map((domain, index) => portalTask(domain, 'now', label, sensitive && index === 0));
  const today = unique.map((domain, index) => portalTask(domain, 'today', label, sensitive && index === 0));
  const week = unique.map(domain => portalTask(domain, 'week', label, false));
  const coordination = buildCoordination(unique, label, sensitive);
  return { id: `demo-${hash(lower)}`, summary: `A calm, coordinated plan across ${unique.join(' + ')}.`, domains: unique, sensitive, coordination, now, today, week };
}

function buildCoordination(domains, request, sensitive) {
  const signalNames = {
    Work:'schedule and priority constraints',Creativity:'production requirements',Home:'household and arrival state',Wellbeing:'permission-scoped routine context',Relationships:'people and commitment context',Community:'location and accessibility needs',Style:'occasion, wardrobe and fitting needs'
  };
  const exchanges = domains.slice(1).map((domain, index) => ({
    from:domains[index],to:domain,signal:signalNames[domains[index]]
  }));
  return {
    detected:`Relevant context: ${String(request).replace(/^\w+ context:\s*/i,'').slice(0,180)}`,
    agents:domains,
    exchanges,
    decision:sensitive ? 'Prepared only — explicit approval required before external action.' : 'Advice and preparation ready — no external action taken.'
  };
}

export function scenarioPlan() {
  const domains = ['Work','Style','Relationships','Home'];
  const plan = {
    id:'scenario-founder-evening',
    summary:'Guardian found a four-way evening conflict and prepared a coordinated recovery plan without contacting anyone or changing any service.',
    domains,
    sensitive:true,
    coordination:{
      detected:'The investor meeting may run 45 minutes late, overlapping the 6:30 PM fitting, the 8:00 PM anniversary dinner, gift delivery, and the home arrival routine.',
      agents:domains,
      exchanges:[
        {from:'Work',to:'Style',signal:'meeting delay and revised fitting window'},
        {from:'Style',to:'Relationships',signal:'outfit-ready time and dinner travel buffer'},
        {from:'Relationships',to:'Home',signal:'revised arrival time and delivery watch window'}
      ],
      decision:'Four adjustments prepared — explicit approval required before messages or schedule changes.'
    },
    now:[
      {domain:'Work',title:'Protect the investor meeting',detail:'Keep the pitch on track and reserve a firm close time so downstream commitments can be recalculated.',time:'Now · 2 min',action:'Lock meeting boundary',sensitive:false},
      {domain:'Style',title:'Prepare stylist timing message',detail:'Draft a request to shift the fitting and ask the stylist to prepare the selected look before arrival.',time:'Now · approval',action:'Review stylist message',sensitive:true},
      {domain:'Relationships',title:'Protect the anniversary promise',detail:'Hold the dinner reservation and prepare a warm update only if the revised travel buffer becomes unsafe.',time:'Now · approval',action:'Review dinner update',sensitive:true}
    ],
    today:[
      {domain:'Home',title:'Delay the arrival routine',detail:'Prepare lights, entry, security and temperature to activate at the revised arrival time; no device state has been changed.',time:'Today · approval',action:'Review home adjustment',sensitive:true},
      {domain:'Relationships',title:'Watch the gift delivery window',detail:'Keep the delivery status visible and prepare a backup handoff plan without changing the order.',time:'Before dinner',action:'Track delivery',sensitive:false},
      {domain:'Style',title:'Stage the complete look',detail:'Place the approved outfit, shoes, accessories and grooming sequence into one fitting-room flow.',time:'Before departure',action:'Open fitting flow',sensitive:false}
    ],
    week:[
      {domain:'Work',title:'Prevent the next collision',detail:'Add a protected transition window between high-stakes work and personal commitments.',time:'This week',action:'Build buffer rule',sensitive:false},
      {domain:'Home',title:'Save an arrival exception',detail:'Prepare a reusable late-arrival routine that always asks before security or device changes.',time:'This week',action:'Prepare exception',sensitive:false}
    ]
  };
  return {
    plan,
    statePatch:{
      scenario:'founder-evening',updatedAt:'demo-sequence',
      work:{meeting:'Investor pitch',status:'running-late',protectedClose:'6:20 PM'},
      style:{fitting:'RISING STAARDFORM look',status:'shift-prepared',revisedWindow:'6:40 PM'},
      relationships:{commitment:'Anniversary dinner',status:'protected',reservation:'8:00 PM',giftDelivery:'watching'},
      home:{security:'secure',arrivalRoutine:'prepared-delay',revisedArrival:'After 7:00 PM'}
    }
  };
}

const portalPlaybooks = {
  Work:{now:['Open the Guardian briefing','Bring schedule, projects, meetings and communications into one conflict scan before choosing the next move.','Open briefing'],today:['Resolve the cross-portal conflict','Protect the priority commitment and prepare updates wherever another portal is affected.','Prepare coordination'],week:['Stabilize the command centre','Reserve focus, meeting and follow-up windows around the work that changes the week.','Build command week']},
  Creativity:{now:['Open the DIGGITSTAAR production lane','Choose the media format, intended audience and next concrete artifact before generating anything.','Enter studio'],today:['Move creation through review','Sequence concept, media, design, AI creation and human review into one production workflow.','Build pipeline'],week:['Prepare an approval-ready release','Complete one coherent version and keep publishing behind an explicit approval gate.','Prepare release']},
  Home:{now:['Read the household state','Check relevant rooms, devices, security and arrival or departure state before proposing automation.','View home state'],today:['Coordinate the living environment','Prepare device routines, household needs and Guardian automation without changing anything outside permission.','Prepare routine'],week:['Strengthen STAAR Access','Review accessible controls, security exceptions and repeatable household automations.','Review STAAR Access']},
  Wellbeing:{now:['Regulate before optimizing','Take water, three slower breaths, and a brief movement break before the next demand.','Begin reset'],today:['Protect the energy floor','Pair focused effort with food, hydration, movement, and a realistic stop time.','Add recovery'],week:['Build recovery into the plan','Choose three realistic moments for movement, rest, or quiet.','Add rhythm']},
  Relationships:{now:['Open the person, not a prompt','Bring the relevant person, shared context, commitment and current communication need into view.','Open person context'],today:['Prepare a human communication','Draft in the user’s voice from real relationship context; keep sending behind explicit approval.','Review communication'],week:['Protect living commitments','Connect meaningful plans and memories to a realistic time without flattening the relationship into tasks.','Review commitments']},
  Community:{now:['Open the real-world connection layer','Match Toronto places, events and opportunities to location, energy and accessibility needs.','Explore nearby'],today:['Compare accessible possibilities','Evaluate the practical fit of local discovery before travel, registration or commitment.','Build local shortlist'],week:['Extend belonging sustainably','Connect one local experience to a longer-term community path, with recovery and access considered.','Shape community path']},
  Style:{now:['Step into the fitting room','Use the illuminated racks, mirror, occasion and real wardrobe context to build the silhouette.','Open fitting mirror'],today:['Complete the physical look','Coordinate garments, fit, shoes, accessories and grooming with Guardian Stylist interaction.','Save fitting'],week:['Develop the wardrobe world','Refine real wardrobe gaps and RISING STAARDFORM pieces without turning the portal into an advertisement.','Plan wardrobe']}
};

function portalTask(domain, horizon, request, requiresApproval) {
  const [title, detail, defaultAction] = portalPlaybooks[domain][horizon];
  return {domain,title,detail:`${detail} Request focus: “${request}”`,time:horizon === 'now' ? 'Now · 20 min' : horizon === 'today' ? 'Today' : 'This week',action:requiresApproval ? 'Review action' : defaultAction,sensitive:Boolean(requiresApproval)};
}
function hash(s){ let h=2166136261; for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return (h>>>0).toString(36); }

async function loadEnv(){
  try { const raw=await readFile(new URL('./.env', import.meta.url),'utf8'); for(const line of raw.split(/\r?\n/)){ const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,''); } } catch {}
}

async function aiPlan(input) {
  if (!process.env.OPENAI_API_KEY || process.env.STAARWARDD_DEMO_ONLY === '1' || process.env.STARWARD_DEMO_ONLY === '1' || process.env.BLESSYNC_DEMO_ONLY === '1') return null;
  const schema = {
    type:'object',
    additionalProperties:false,
    required:['summary','domains','sensitive','coordination','now','today','week'],
    properties:{
      summary:{type:'string'},
      domains:{type:'array',items:{type:'string',enum:['Work','Creativity','Home','Wellbeing','Relationships','Community','Style']}},
      sensitive:{type:'boolean'},
      coordination:{
        type:'object',additionalProperties:false,required:['detected','agents','exchanges','decision'],
        properties:{
          detected:{type:'string'},
          agents:{type:'array',items:{type:'string',enum:['Work','Creativity','Home','Wellbeing','Relationships','Community','Style']}},
          exchanges:{type:'array',items:{type:'object',additionalProperties:false,required:['from','to','signal'],properties:{from:{type:'string'},to:{type:'string'},signal:{type:'string'}}}},
          decision:{type:'string'}
        }
      },
      now:{type:'array',items:taskSchema()},
      today:{type:'array',items:taskSchema()},
      week:{type:'array',items:taskSchema()}
    }
  };
  const request = {
    model:process.env.OPENAI_MODEL || 'gpt-5.6',
    instructions:[
      'You are StaarWardd, an accurate and calm whole-life planning guardian.',
      'Follow this orchestration rule: detect context, activate only relevant portal agents, exchange necessary information across those portals, then advise, prepare, or act only according to permission.',
      'In coordination, agents must match domains exactly. Describe each necessary cross-portal exchange; return no exchanges for a single-domain request.',
      'Do not force the user into a portal or expose an unrelated portal. Turn the request into a concise, realistic cross-domain plan.',
      'Home includes STAAR Access, devices, routines, security, household state, arrival and departure intelligence. Creativity includes DIGGITSTAAR production. Style is a wardrobe and fitting environment integrating RISING STAARDFORM.',
      'Wellbeing may coordinate permission-scoped context but must not diagnose or pretend to replace professional care.',
      'Use web search only when the answer depends on current or externally verifiable facts.',
      'Never guess current facts. If a fact cannot be verified, say so plainly in the summary or task detail.',
      'Flag external communication, purchases, deletion, bookings, payments, publishing, sharing, or account changes as sensitive.',
      'Never claim an action was executed. Human approval is mandatory before every sensitive action.'
    ].join(' '),
    input,
    tools:[{type:'web_search'}],
    include:['web_search_call.action.sources'],
    text:{format:{type:'json_schema',name:'staarwardd_plan',strict:true,schema}}
  };
  const response = await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(request)
  });
  if(!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status})${errorBody ? ': ' + errorBody.slice(0,180) : ''}`);
  }
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI returned no plan text.');
  return {
    plan:{id:`ai-${Date.now()}`, ...JSON.parse(text)},
    sources:responseSources(data),
    webSearched:Boolean(data.output?.some(item => item.type === 'web_search_call'))
  };
}

function responseSources(data) {
  const sources = [];
  const seen = new Set();
  const add = (item) => {
    const url = item?.url;
    if (!url || seen.has(url)) return;
    seen.add(url);
    let title = item.title || item.name || '';
    if (!title) {
      try { title = new URL(url).hostname.replace(/^www./, ''); }
      catch { title = 'Source'; }
    }
    sources.push({title:String(title).slice(0,140),url});
  };
  for (const output of data.output || []) {
    if (output.type === 'web_search_call') {
      for (const source of output.action?.sources || []) add(source);
    }
    if (output.type === 'message') {
      for (const content of output.content || []) {
        for (const annotation of content.annotations || []) {
          if (annotation.type === 'url_citation') add(annotation);
        }
      }
    }
  }
  return sources.slice(0,5);
}

function taskSchema(){
  return {
    type:'object',
    additionalProperties:false,
    required:['domain','title','detail','time','action','sensitive'],
    properties:{
      domain:{type:'string',enum:['Work','Creativity','Home','Wellbeing','Relationships','Community','Style']},
      title:{type:'string'},
      detail:{type:'string'},
      time:{type:'string'},
      action:{type:'string'},
      sensitive:{type:'boolean'}
    }
  };
}

export const server = http.createServer(async (req,res)=>{
  try {
    if(req.method==='GET' && req.url==='/api/status') { const live=Boolean(process.env.OPENAI_API_KEY) && process.env.STAARWARDD_DEMO_ONLY !== '1' && process.env.STARWARD_DEMO_ONLY !== '1' && process.env.BLESSYNC_DEMO_ONLY !== '1'; return json(res,200,{mode:live?'openai':'demo',model:live?(process.env.OPENAI_MODEL||'gpt-5.6'):null,webSearch:live,voice:'browser',guardian:'cinematic-css'}); }
    if(req.method==='POST' && req.url==='/api/scenario') { const result=scenarioPlan(); return json(res,200,{mode:'scenario',plan:result.plan,statePatch:result.statePatch,sources:[],webSearched:false}); }
    if(req.method==='POST' && req.url==='/api/plan') { const body=await bodyJson(req); const input=String(body.input||'').slice(0,2000); if(!input.trim()) return json(res,400,{error:'Please enter a request.'}); try { const result=await aiPlan(input); return json(res,200,result?{mode:'openai',plan:result.plan,sources:result.sources,webSearched:result.webSearched}:{mode:'demo',plan:demoPlan(input),sources:[],webSearched:false}); } catch(e){ return json(res,200,{mode:'demo-fallback',warning:e.message,plan:demoPlan(input),sources:[],webSearched:false}); } }
    if(req.method!=='GET' && req.method!=='HEAD') return json(res,405,{error:'Method not allowed'});
    const requestPath=req.url.split('?')[0];
    let path=requestPath==='/'?'index.html':decodeURIComponent(requestPath.slice(1)); path=normalize(path).replace(/^(\.\.[\\/])+/, '');
    const file=join(root,path); if(!file.startsWith(root)) return json(res,403,{error:'Forbidden'});
    const extension=extname(file).toLowerCase();
    if((extension==='.mp4' || extension==='.webm') && req.headers.range) {
      const info=await stat(file);
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match) { res.writeHead(416,{'Content-Range':`bytes */${info.size}`}); return res.end(); }
      const start=match[1] ? Number(match[1]) : 0;
      const end=match[2] ? Math.min(Number(match[2]),info.size-1) : info.size-1;
      if(!Number.isFinite(start) || !Number.isFinite(end) || start<0 || end<start || start>=info.size) { res.writeHead(416,{'Content-Range':`bytes */${info.size}`}); return res.end(); }
      res.writeHead(206,{'Content-Type':types[extension],'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1,'Cache-Control':'no-store'});
      if(req.method==='HEAD') return res.end();
      createReadStream(file,{start,end}).pipe(res);
      return;
    }
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extension]||'application/octet-stream','Content-Length':data.length,'Accept-Ranges':extension==='.mp4'||extension==='.webm'?'bytes':'none','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch(e){
    if(e.code==='ENOENT'){
      const requestPath=String(req.url||'/').split('?')[0];
      if(extname(requestPath)) return json(res,404,{error:'Not found'});
      try{const data=await readFile(join(root,'index.html'));res.writeHead(200,{'Content-Type':types['.html']});res.end(data);}catch{json(res,404,{error:'Not found'});}
    } else json(res,500,{error:'Server error'});
  }
});
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function bodyJson(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>1e6)reject(new Error('Body too large'));});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject);});}
if(process.argv[1]===fileURLToPath(import.meta.url) || process.env.VERCEL === '1') server.listen(port,'0.0.0.0',()=>console.log(`StaarWardd is ready at http://localhost:${port}`));


