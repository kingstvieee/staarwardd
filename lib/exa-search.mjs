// Optional Exa search provider for Guardian research. No client-side API key.
const EXA_ENDPOINT = 'https://api.exa.ai/search';
export async function exaSearch(query, options = {}) {
  const key = options.apiKey ?? process.env.EXA_API_KEY;
  if (!key) return {available:false, sources:[], reason:'EXA_API_KEY not configured'};
  const q = String(query || '').trim().slice(0,500);
  if (!q) return {available:false, sources:[], reason:'Empty query'};
  const timeout = Math.max(1000, Math.min(Number(options.timeoutMs) || 8000, 15000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(EXA_ENDPOINT, {
      method:'POST',
      signal:controller.signal,
      headers:{'x-api-key':key, 'Content-Type':'application/json'},
      body:JSON.stringify({query:q, type:'auto', numResults:Math.max(1,Math.min(Number(options.numResults)||5,10)), contents:{highlights:{maxCharacters:1000}}})
    });
    if (!response.ok) return {available:false,sources:[],reason:`Exa HTTP ${response.status}`};
    const data = await response.json();
    const seen = new Set();
    const sources = (Array.isArray(data.results)?data.results:[]).flatMap(item => {
      if (typeof item.url !== 'string' || !/^https?:\/\//i.test(item.url) || seen.has(item.url)) return [];
      seen.add(item.url);
      return [{title:String(item.title||new URL(item.url).hostname).slice(0,140),url:item.url,highlights:Array.isArray(item.highlights)?item.highlights.map(x=>String(x).slice(0,1000)).slice(0,3):[]}];
    });
    return {available:true,sources};
  } catch (e) {
    return {available:false,sources:[],reason:e.name==='AbortError'?'Exa timed out':'Exa unavailable'};
  } finally { clearTimeout(timer); }
}
