import snapshot from '../../../public/data/snapshot.json';
import {loadFuyaoStock} from '../../../lib/market-data';
import {ProviderError} from '../../../lib/providers/fuyao';
import type {Stock} from '../../../lib/screener';
// Bounded, fixed universe; cache promises to coalesce repeated requests. No credentials in responses.
const cache=new Map<string,{expires:number;value:Promise<Stock>}>();
export async function GET(req:Request){
 const code=new URL(req.url).searchParams.get('code'),base=snapshot.stocks.find(s=>s.code===code);
 if(!base)return Response.json({error:'仅支持当前研究样本。'},{status:400});
 try{let entry=cache.get(base.code);if(!entry||entry.expires<Date.now()){const value=loadFuyaoStock(base as Stock,snapshot.asOf);entry={expires:Date.now()+3600000,value};cache.set(base.code,entry);value.catch(()=>cache.delete(base.code))}return Response.json({stock:await entry.value},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return Response.json({error:e instanceof ProviderError?e.message:'扶摇暂不可用；未生成替代数值。'},{status:502})}
}
