import {fields,type Bar,type Stock} from './screener.ts';
import {createFuyao,ProviderError,type PriceBar} from './providers/fuyao.ts';
const mean=(a:number[])=>a.reduce((s,x)=>s+x,0)/a.length;
const pct=(a:number,b:number)=>b>0?(a/b-1)*100:null;
export function derivePrices(raw:PriceBar[],asOf:string){
 const bars:Bar[]=raw.map(b=>({date:new Date(b.date_ms+8*3600000).toISOString().slice(0,10),open:b.open_price,high:b.high_price,low:b.low_price,close:b.close_price,volume:b.volume})).sort((a,b)=>a.date.localeCompare(b.date));
 if(bars.length<65||bars.at(-1)?.date!==asOf||bars.some(b=>b.date>asOf))throw new ProviderError('INSUFFICIENT_OR_STALE_HISTORY');
 const c=bars.map(b=>b.close),v=bars.map(b=>b.volume),last=c.at(-1)!;
 bars.forEach((b,i)=>{b.ma20=i>=19?mean(c.slice(i-19,i+1)):null;b.ma60=i>=59?mean(c.slice(i-59,i+1)):null});
 const tail=c.slice(-61),returns=tail.slice(1).map((x,i)=>x/tail[i]-1),avg=mean(returns);let peak=tail[0],drawdown=0;for(const x of tail){peak=Math.max(peak,x);drawdown=Math.max(drawdown,(1-x/peak)*100)}
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 return {bars:bars.slice(-90),prices:bars.slice(-61).map(({date,close})=>({date,close})),metrics:{price:last,maSpread:pct(mean(c.slice(-20)),mean(c.slice(-60))),maSlope:pct(mean(c.slice(-20)),mean(c.slice(-25,-5))),maDistance:pct(last,mean(c.slice(-20))),return3:pct(last,c.at(-4)!),return5:pct(last,c.at(-6)!),return10:pct(last,c.at(-11)!),return20:pct(last,c.at(-21)!),pullback10:(1-last/Math.max(...c.slice(-10)))*100,volumeRatio:ratio(v.at(-1)!,mean(v.slice(-21,-1))),volume3Ratio:ratio(mean(v.slice(-3)),mean(v.slice(-23,-3))),breakoutDistance:pct(last,Math.max(...bars.slice(-21,-1).map(b=>b.high))),range10:pct(Math.max(...bars.slice(-10).map(b=>b.high)),Math.min(...bars.slice(-10).map(b=>b.low))),volatility:Math.sqrt(returns.reduce((s,x)=>s+(x-avg)**2,0)/(returns.length-1))*Math.sqrt(252)*100,drawdown}};
}
const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))?Number(v):null;
export async function loadFuyaoStock(base:Stock,asOf:string):Promise<Stock>{
 const api=createFuyao(),resolved=await api.resolve(base.code),thscode=resolved.ticker.thscode;
 const [prices,income,financial]=await Promise.all([api.historical(thscode,'2026-01-01',asOf),api.income(thscode),api.indicators(thscode,'2026-2')]);
 const end=Date.parse(asOf+'T23:59:59+08:00');
 const row=(year:number)=>income.data.item.find(r=>r.thscode===thscode&&r.fiscal_year===year&&r.fiscal_period==='Q2'&&r.currency==='CNY'&&typeof r.report_date_ms==='number'&&r.report_date_ms<=end);
 const current=row(2026),prior=row(2025);if(!current)throw new ProviderError('REPORT_NOT_AVAILABLE_AS_OF');
 if(financial.data.thscode!==thscode||financial.data.report!=='2026-2'||!Array.isArray(financial.data.abilities))throw new ProviderError('INVALID_FINANCIAL_SCHEMA');
 const indicators=new Map(financial.data.abilities.flatMap(a=>a.indicators.map(i=>[i.index_id,numeric(i.value)] as const)));
 const revenue=numeric(current.operating_income),profit=numeric(current.parent_holder_net_profit),oldRevenue=numeric(prior?.operating_income),oldProfit=numeric(prior?.parent_holder_net_profit);
 const derived=derivePrices(prices.data.item,asOf);
 const metrics={...base.metrics,...derived.metrics,revenue,profit,revenueGrowth:revenue!==null&&oldRevenue!==null?pct(revenue,oldRevenue):null,profitGrowth:profit!==null&&oldProfit!==null&&oldProfit!==0?(profit-oldProfit)/Math.abs(oldProfit)*100:null,roe:indicators.get('index_weighted_avg_roe')??null,debtRatio:indicators.get('assets_debt_ratio')??null};
 const provenance={...base.provenance};for(const [key,f] of Object.entries(fields)){if(f.source==='prices')provenance[key]={provider:'扶摇前复权日线 / 本地计算',date:asOf,formula:f.raw};if(f.source==='financial'&&key!=='cashContent')provenance[key]={provider:'扶摇财报 · 营业收入口径',date:'2026-06-30',formula:key==='revenueGrowth'?'(operating_income[2026H1] / operating_income[2025H1] - 1) × 100':key==='profitGrowth'?'(parent_holder_net_profit[2026H1] - parent_holder_net_profit[2025H1]) / abs(parent_holder_net_profit[2025H1]) × 100':key==='profit'?'parent_holder_net_profit':f.raw};if(f.source==='valuation')provenance[key]={provider:'东方财富历史估值快照',date:asOf,formula:f.raw}}
 return {...base,...derived,metrics,provenance,disclosedAt:new Date(current.report_date_ms as number).toISOString(),tradeDate:asOf,errors:[],evidence:{resolved,prices,income,financial},sources:{...base.sources,financial:income.url,prices:prices.url}};
}
