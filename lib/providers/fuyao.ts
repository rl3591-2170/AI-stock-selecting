// Server/CLI only. Never import this module into a client component.
export type Receipt<T>={provider:'fuyao';url:string;fetchedAt:string;requestId:string;data:T};
export type Ticker={thscode:string;ticker:string;name:string;asset_type:string};
export type PriceBar={date_ms:number;open_price:number;high_price:number;low_price:number;close_price:number;volume:number;turnover:number};
type Options={key?:string;fetcher?:typeof fetch;sleep?:(ms:number)=>Promise<void>};
export class ProviderError extends Error{
 code:string;requestId:string;
 constructor(code:string,requestId=''){super(`扶摇请求失败：${code}${requestId?`；request_id=${requestId}`:''}`);this.code=code;this.requestId=requestId}
}
export function createFuyao({key=process.env.HITHINK_FINANCE_API_KEY,fetcher=fetch,sleep=(ms)=>new Promise(r=>setTimeout(r,ms))}:Options={}){
 async function get<T>(path:string,query:Record<string,string|number>):Promise<Receipt<T>>{
  if(!key||/your.?api.?key|placeholder|replace.?with/i.test(key))throw new ProviderError('MISSING_KEY');
  if(!path.startsWith('/api/'))throw new ProviderError('INVALID_ENDPOINT');
  const url=new URL(path,'https://fuyao.aicubes.cn');for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
  for(let attempt=0;attempt<3;attempt++){
   let retry=false;
   try{
    const r=await fetcher(url,{headers:{'X-api-key':key},signal:AbortSignal.timeout(20000)});
    if(!r.ok){retry=r.status===429||r.status>=500;throw new ProviderError(`HTTP_${r.status}`)}
    const x=await r.json() as {code?:number;request_id?:string;data?:T};
    if(x.code!==0){retry=x.code===4001||!!(x.code&&x.code>=5000&&x.code<6000);throw new ProviderError(String(x.code??'INVALID_ENVELOPE'),x.request_id)}
    if(x.data==null)throw new ProviderError('EMPTY_DATA',x.request_id);
    return {provider:'fuyao',url:url.toString(),fetchedAt:new Date().toISOString(),requestId:x.request_id||'',data:x.data};
   }catch(e){if(!(e instanceof ProviderError))retry=true;if(!retry||attempt===2)throw e instanceof ProviderError?e:new ProviderError('NETWORK_OR_TIMEOUT');await sleep(500*2**attempt)}
  }
  throw new ProviderError('UNREACHABLE');
 }
 return {
  async resolve(query:string){const receipt=await get<{item:Ticker[]}>('/api/meta/tickers/search',{q:query,asset_type:'a-share',limit:50});if(!Array.isArray(receipt.data.item))throw new ProviderError('INVALID_TICKERS',receipt.requestId);const exact=receipt.data.item.filter(t=>t.asset_type==='a-share'&&(t.ticker===query||t.thscode===query||t.name===query));if(exact.length!==1)throw new ProviderError(exact.length?'AMBIGUOUS_TICKER':'TICKER_NOT_RESOLVED',receipt.requestId);return {...receipt,ticker:exact[0]}},
  async historical(thscode:string,start:string,end:string){const startMs=Date.parse(start+'T00:00:00+08:00'),endMs=Date.parse(end+'T23:59:59+08:00');if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||startMs>endMs)throw new ProviderError('INVALID_DATES');const receipt=await get<{timestamp:number;item:PriceBar[]}>('/api/a-share/prices/historical',{thscode,interval:'1d',start:startMs,end:endMs,adjust:'forward'});const rows=receipt.data.item;if(!Array.isArray(rows)||!rows.length)throw new ProviderError('NO_PRICE_BARS',receipt.requestId);const dates=new Set<number>();for(const b of rows){if(![b.date_ms,b.open_price,b.high_price,b.low_price,b.close_price,b.volume,b.turnover].every(Number.isFinite)||b.date_ms<startMs||b.date_ms>endMs||b.low_price<=0||b.high_price<Math.max(b.open_price,b.close_price)||b.low_price>Math.min(b.open_price,b.close_price)||b.volume<0||b.turnover<0||dates.has(b.date_ms))throw new ProviderError('INVALID_PRICE_BAR',receipt.requestId);dates.add(b.date_ms)}return receipt},
  income:(thscode:string)=>get<{item:Record<string,unknown>[]}>('/api/a-share/financials/income-statements',{thscode,period:'quarterly',start:Date.parse('2025-06-30T00:00:00+08:00'),end:Date.parse('2026-06-30T23:59:59+08:00')}),
  indicators:(thscode:string,report:string)=>get<{thscode:string;report:string;abilities:{ability:string;indicators:{index_id:string;value:string|null}[]}[]}>('/api/a-share/financials/indicators',{thscode,report}),
  institution:(date:string)=>get<{trade_date:string;board_type:string;stock_items:Record<string,unknown>[]}>('/api/a-share/special-data/dragon-tiger-list',{date,board_type:'org'}),
  sectors:(tag:'industry'|'cn_concept')=>get<{timestamp:number;item:{thscode:string;name:string}[]}>('/api/a-share-index/catalog/ths-index-list',{tag}),
 };
}
