import snapshot from '../../../public/data/snapshot.json';
import {createFuyao,ProviderError} from '../../../lib/providers/fuyao';
import {createIfind} from '../../../lib/providers/ifind';
// Deliberately fixed universe and queries: this endpoint is not an arbitrary paid-API proxy.
export async function POST(req:Request){
 let body:unknown;try{const text=await req.text();if(text.length>300)return Response.json({error:'请求过长。'},{status:400});body=JSON.parse(text)}catch{return Response.json({error:'请求格式无效。'},{status:400})}
 if(!body||typeof body!=='object')return Response.json({error:'请求格式无效。'},{status:400});
 const {code,provider}=body as {code?:string;provider?:string};
 const stock=snapshot.stocks.find(s=>s.code===code);if(!stock||!['fuyao','ifind'].includes(provider||''))return Response.json({error:'请选择当前样本中的股票和数据源。'},{status:400});
 try{
  if(provider==='ifind'){
   const evidence=await createIfind().financials(`${stock.name}（${stock.code}）2026年半年报加权净资产收益率、资产负债率、归母净利润，列出报告期、单位和披露日期`);
   return Response.json({evidence,role:'supplement',note:'iFinD原始补充证据，尚未自动映射为筛选数值；需核对报告期、单位和字段。'},{headers:{'Cache-Control':'no-store'}});
  }
  const api=createFuyao();const resolved=await api.resolve(stock.code);
  const prices=await api.historical(resolved.ticker.thscode,'2026-01-01',snapshot.asOf);
  const financial=await api.indicators(resolved.ticker.thscode,'2026-2');
  if(financial.data.thscode!==resolved.ticker.thscode||financial.data.report!=='2026-2'||!Array.isArray(financial.data.abilities))throw new ProviderError('INVALID_FINANCIAL_SCHEMA',financial.requestId);
  return Response.json({evidence:{resolved,prices,financial},role:'primary-verification',note:'扶摇授权原始证据；本次取数不静默替换已执行的历史快照。批量切源需完成口径与覆盖率核验。'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const detail=e instanceof ProviderError?e.message:e instanceof Error&&/^IFIND_[A-Z_0-9]+$/.test(e.message)?e.message:'NETWORK_OR_PROVIDER_ERROR';return Response.json({error:`数据源验证失败（${detail}）。当前筛选快照未改变，未生成替代数值。`},{status:502,headers:{'Cache-Control':'no-store'}})}
}
