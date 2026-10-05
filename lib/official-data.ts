import {createFuyao,ProviderError,type Receipt} from './providers/fuyao.ts';
import {derivePrices} from './market-data.ts';
import {roster} from './roster.ts';
import {fields,type Stock} from './screener.ts';
export const shanghaiDate=(ms:number)=>new Date(ms+8*3600000).toISOString().slice(0,10);
export function completedDayCutoff(now=Date.now()){
 const local=new Date(now+8*3600000),minutes=local.getUTCHours()*60+local.getUTCMinutes();
 return shanghaiDate(now-(minutes<15*60+30?86400000:0));
}
const num=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))?Number(v):null;
let context:{expires:number;promise:ReturnType<typeof fetchContext>}|null=null;
async function fetchContext(){
 const api=createFuyao(),now=Date.now(),cutoff=completedDayCutoff(now),start=shanghaiDate(now-370*86400000);
 const [history,quotes,valuations]=await Promise.all([api.historical(roster[0].thscode,start,cutoff),api.quotes(roster.map(s=>s.thscode)),api.valuations(roster.map(s=>s.thscode))]);
 const asOf=shanghaiDate(Math.max(...history.data.item.map(b=>b.date_ms)));
 if(asOf>cutoff)throw new ProviderError('INCOMPLETE_TRADING_DAY');
 return {asOf,start,fetchedAt:new Date().toISOString(),quotes,valuations};
}
export function marketContext(){if(!context||context.expires<Date.now()){const promise=fetchContext();context={expires:Date.now()+60000,promise};promise.catch(()=>{if(context?.promise===promise)context=null})}return context.promise}
export const emptyStock=(s:typeof roster[number]):Stock=>({code:s.code,name:s.name,industry:s.industry,metrics:{},errors:['尚未加载授权数据'],sources:{},prices:[],evidencePath:''});
export function latestDisclosed(rows:Record<string,unknown>[],thscode:string,asOf:string){
 const end=Date.parse(asOf+'T23:59:59+08:00');return rows.filter(r=>r.thscode===thscode&&r.currency==='CNY'&&typeof r.report_date_ms==='number'&&r.report_date_ms<=end&&typeof r.period_end_ms==='number'&&r.period_end_ms<=end).sort((a,b)=>Number(b.period_end_ms)-Number(a.period_end_ms));
}
export async function loadOfficialStock(base:typeof roster[number],ctx:Awaited<ReturnType<typeof marketContext>>):Promise<Stock>{
 const api=createFuyao();const [prices,income,cash]=await Promise.all([api.historical(base.thscode,ctx.start,ctx.asOf),api.latestIncome(base.thscode),api.cashflow(base.thscode)]);
 const periods=latestDisclosed(income.data.item,base.thscode,ctx.asOf),current=periods[0];if(!current)throw new ProviderError('REPORT_NOT_AVAILABLE_AS_OF',income.requestId);
 const prior=periods.find(r=>r.fiscal_year===Number(current.fiscal_year)-1&&r.fiscal_period===current.fiscal_period),period=shanghaiDate(Number(current.period_end_ms));
 const report=`${current.fiscal_year}-${String(current.fiscal_period).replace(/Q|FY/g,'')||4}`;
 const financial=await api.indicators(base.thscode,report);
 if(financial.data.thscode!==base.thscode||financial.data.report!==report||!Array.isArray(financial.data.abilities))throw new ProviderError('INVALID_FINANCIAL_SCHEMA',financial.requestId);
 const indicators=new Map(financial.data.abilities.flatMap(a=>a.indicators.map(i=>[i.index_id,num(i.value)] as const)));
 const cashRow=latestDisclosed(cash.data.item,base.thscode,ctx.asOf).find(r=>r.period_end_ms===current.period_end_ms);
 const revenue=num(current.operating_income),profit=num(current.parent_holder_net_profit),totalProfit=num(current.net_profit),ocf=num(cashRow?.act_cash_flow_net),oldRevenue=num(prior?.operating_income),oldProfit=num(prior?.parent_holder_net_profit);
 const valuation=ctx.valuations.data.item.find(r=>r.thscode===base.thscode),quote=ctx.quotes.data.item.find(r=>r.thscode===base.thscode);
 const derived=derivePrices(prices.data.item,ctx.asOf);
 const metrics:Stock['metrics']={...derived.metrics,revenue,profit,revenueGrowth:revenue!==null&&oldRevenue!==null&&oldRevenue>0?(revenue/oldRevenue-1)*100:null,profitGrowth:profit!==null&&oldProfit!==null&&oldProfit!==0?(profit-oldProfit)/Math.abs(oldProfit)*100:null,netMargin:revenue!==null&&revenue>0&&profit!==null?profit/revenue*100:null,roe:indicators.get('index_weighted_avg_roe')??null,debtRatio:indicators.get('assets_debt_ratio')??null,cashProfitRatio:ocf!==null&&totalProfit!==null&&totalProfit>0?ocf/totalProfit:null,operatingCash:ocf,pe:num(valuation?.pe_ttm),pb:num(valuation?.pb_mrq),ps:num(valuation?.ps_ttm)};
 const provenance:NonNullable<Stock['provenance']>={};
 for(const [key,f] of Object.entries(fields))if(metrics[key as keyof typeof fields]!==undefined)provenance[key]={provider:f.source==='prices'?'扶摇前复权日线 / 确定性计算':f.source==='valuation'?'扶摇最新估值快照（批次时间非逐字段更新时间）':'扶摇财报 / 披露期核验',date:f.source==='prices'?ctx.asOf:f.source==='valuation'?(ctx.valuations.data.timestamp?new Date(ctx.valuations.data.timestamp).toISOString():'上游未提供'):period,formula:f.raw};
 return {...emptyStock(base),...derived,metrics,provenance,reportDate:period,disclosedAt:shanghaiDate(Number(current.report_date_ms)),tradeDate:ctx.asOf,errors:[],sources:{prices:prices.url,financial:income.url,valuation:ctx.valuations.url,cashflow:cash.url},quote:quote?{price:num(quote.last_price),changePct:num(quote.price_change_ratio_pct),batchTime:ctx.quotes.data.timestamp}:undefined,evidence:{prices,income,cash,financial,valuation:{...ctx.valuations,data:{timestamp:ctx.valuations.data.timestamp,item:valuation?[valuation]:[]}},quote:{...ctx.quotes,data:{timestamp:ctx.quotes.data.timestamp,item:quote?[quote]:[]}}}};
}
