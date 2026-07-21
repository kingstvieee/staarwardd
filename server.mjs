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
  find(['work','meeting','email','deadline','project','presentation','client','focus'], 'Work');
  find(['creative','creativity','write','paint','music','idea','design'], 'Creativity');
  find(['home','grocer','meal','clean','repair','laundry','kitchen'], 'Home');
  find(['wellbeing','wellness','health','walk','sleep','stress','exercise','meditat'], 'Wellbeing');
  find(['relationship','partner','friend','family','date'], 'Relationships');
  find(['community','volunteer','neighbour','event'], 'Community');
  find(['style','outfit','wardrobe','wear'], 'Style');
  if (!domains.length) domains.push('Work', 'Wellbeing');
  const unique = [...new Set(domains)];
  const primary = unique[0];
  const sensitive = /send|email|message|contact|invite|book|buy|purchase|cancel|delete|share|publish|pay|order|post|register|rsvp/.test(lower);
  const label = q || 'Create a balanced plan for my day';
  const now = unique.slice(0, 2).map((domain, index) => portalTask(domain, 'now', label, sensitive && index === 0));
  const today = unique.map((domain, index) => portalTask(domain, 'today', label, sensitive && index === 0));
  const week = [
    portalTask(primary, 'week', label, false),
    ...(primary === 'Wellbeing' ? [] : [portalTask('Wellbeing', 'week', label, false)])
  ];
  return { id: `demo-${hash(lower)}`, summary: `A calm, coordinated plan across ${unique.join(' + ')}.`, domains: unique, sensitive, now, today, week };
}

const portalPlaybooks = {
  Work:{now:['Choose the leverage point','Name the smallest useful deliverable and protect one uninterrupted 20-minute start.','Start focus'],today:['Triage the workday','Sort must-do, should-do, and later work; then finish the highest-value deliverable first.','Mark ready'],week:['Protect deep work','Reserve one 60-minute block for the work that changes the week.','Schedule block']},
  Creativity:{now:['Capture the living idea','Write the idea in one sentence, choose its form, and make an intentionally rough first move.','Begin draft'],today:['Build a creative container','Set one constraint, one reference, and one finish line so inspiration can become form.','Save ritual'],week:['Complete one shareable version','Protect a focused making session and define what finished enough means.','Schedule studio time']},
  Home:{now:['Create visible calm','Reset the one surface or room that will make the whole home feel lighter.','Start reset'],today:['Close the household loop','Sequence food, cleanup, laundry, and supplies so each task supports the next.','Add home rhythm'],week:['Prevent the next pile-up','Choose one repeatable 30-minute reset and assign it a realistic day.','Schedule reset']},
  Wellbeing:{now:['Regulate before optimizing','Take water, three slower breaths, and a brief movement break before the next demand.','Begin reset'],today:['Protect the energy floor','Pair focused effort with food, hydration, movement, and a realistic stop time.','Add recovery'],week:['Build recovery into the plan','Choose three realistic moments for movement, rest, or quiet.','Add rhythm']},
  Relationships:{now:['Name the real connection need','Choose whether this moment needs listening, appreciation, repair, a boundary, or simple presence.','Open compass'],today:['Prepare a human message','Draft a warm, specific note in your voice; keep sending behind explicit approval.','Review message'],week:['Create a dependable connection ritual','Choose one person, one meaningful question, and one realistic time to reconnect.','Schedule check-in']},
  Community:{now:['Choose your circle of impact','Match one local need with your available time, energy, skills, and access needs.','Open impact map'],today:['Shortlist a grounded contribution','Compare one event, one organization, and one neighbour-scale action before committing.','Build shortlist'],week:['Make belonging repeatable','Protect one sustainable contribution and leave recovery space around it.','Add community rhythm']},
  Style:{now:['Build the outfit formula','Choose the occasion, silhouette, anchor piece, layer, and finishing detail using your existing wardrobe first.','Open outfit studio'],today:['Prepare the complete look','Lay out clothing, shoes, accessories, grooming, and a weather-aware backup.','Save look'],week:['Edit the wardrobe with intention','Create keep, tailor, repair, restyle, and release groups before considering a purchase.','Start wardrobe edit']}
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
    required:['summary','domains','sensitive','now','today','week'],
    properties:{
      summary:{type:'string'},
      domains:{type:'array',items:{type:'string',enum:['Work','Creativity','Home','Wellbeing','Relationships','Community','Style']}},
      sensitive:{type:'boolean'},
      now:{type:'array',items:taskSchema()},
      today:{type:'array',items:taskSchema()},
      week:{type:'array',items:taskSchema()}
    }
  };
  const request = {
    model:process.env.OPENAI_MODEL || 'gpt-5.6',
    instructions:[
      'You are StaarWardd, an accurate and calm whole-life planning guardian.',
      'Turn the request into a concise, realistic cross-domain plan.',
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
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(port,'0.0.0.0',()=>console.log(`StaarWardd is ready at http://localhost:${port}`));


