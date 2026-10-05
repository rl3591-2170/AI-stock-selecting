/** Server-only iFinD MCP transport. Preserve source output; do not infer field mappings. */
export type IfindResult={provider:'ifind';tool:string;query:string;fetchedAt:string;content:unknown[]};
export function createIfind({token=process.env.IFIND_API_TOKEN,fetcher=fetch}:{token?:string;fetcher?:typeof fetch}={}){
 const endpoint='https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-stock-mcp';
 let session='',id=0;
 async function request(method:string,params?:unknown,notification=false):Promise<Record<string,unknown>>{
  if(!token)throw Error('IFIND_NOT_CONFIGURED');
  const r=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:token,...(session?{'Mcp-Session-Id':session}:{})},signal:AbortSignal.timeout(25000),body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:++id}),method,...(params?{params}:{})})});
  if(!r.ok)throw Error(`IFIND_HTTP_${r.status}`);
  const newSession=r.headers.get('Mcp-Session-Id');if(newSession)session=newSession;
  const raw=await r.text();if(notification&&!raw.trim())return {};
  let decoded:Record<string,unknown>;
  try{if(r.headers.get('content-type')?.includes('text/event-stream')){const blocks=raw.split(/\r?\n\r?\n/).map(b=>b.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n')).filter(Boolean);const messages=blocks.filter(x=>x!=='[DONE]').map(x=>JSON.parse(x));decoded=messages.find(x=>x.id===id);if(!decoded)throw Error()}else decoded=JSON.parse(raw)}catch{throw Error('IFIND_INVALID_RESPONSE')}
  if(decoded.error)throw Error('IFIND_RPC_ERROR');return decoded;
 }
 async function init(){await request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'stock-lens',version:'3.1'}});await request('notifications/initialized',{},true)}
 return {
  async financials(query:string):Promise<IfindResult>{
   if(typeof query!=='string'||query.length>200)throw Error('IFIND_INVALID_QUERY');await init();
   const response=await request('tools/call',{name:'get_stock_financials',arguments:{query}});
   const result=response.result as {isError?:boolean;content?:unknown[]}|undefined;
   if(!result||result.isError||!Array.isArray(result.content)||!result.content.length)throw Error('IFIND_TOOL_FAILED');
   return {provider:'ifind',tool:'get_stock_financials',query,fetchedAt:new Date().toISOString(),content:result.content};
  },
  async listTools(){await init();const r=await request('tools/list',{});const data=r.result as {tools?:{name:string}[]}|undefined;if(!Array.isArray(data?.tools))throw Error('IFIND_INVALID_TOOLS');return data.tools.map(t=>t.name)},
 };
}
