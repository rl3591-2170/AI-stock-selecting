import {roster} from '../../../lib/roster';
import {loadOfficialStock,marketContext} from '../../../lib/official-data';
import {ProviderError} from '../../../lib/providers/fuyao';
import type {Stock} from '../../../lib/screener';
const cache=new Map<string,{expires:number;value:Promise<Stock>}>();
export async function GET(req:Request){
 const params=new URL(req.url).searchParams,base=roster.find(s=>s.code===params.get('code'));
 if(!base)return Response.json({error:'仅支持当前50只研究样本。'},{status:400});
 try{const ctx=await marketContext();if(params.get('asOf')&&params.get('asOf')!==ctx.asOf)return Response.json({error:'完整交易日已更新，请刷新整批数据。',code:'ASOF_CHANGED'},{status:409});
 const key=`${base.code}:${ctx.asOf}:${ctx.valuations.data.timestamp}`;let entry=cache.get(key);
 if(!entry||entry.expires<Date.now()){const value=loadOfficialStock(base,ctx);entry={expires:Date.now()+300000,value};cache.set(key,entry);value.catch(()=>{if(cache.get(key)?.value===value)cache.delete(key)});if(cache.size>100)cache.delete(cache.keys().next().value!)}
 return Response.json({stock:await entry.value},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof ProviderError?e.message:'扶摇数据校验失败；未生成替代数值。',stage:'stock-data',code:base.code},{status:502})}
}
