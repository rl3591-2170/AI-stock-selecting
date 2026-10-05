import snapshot from '../../../public/data/snapshot.json';
import {createFuyao,ProviderError} from '../../../lib/providers/fuyao';
import {institutionalMetrics} from '../../../lib/institution';
// Union of observed dates, then validate each with the provider's trading-day-only endpoint.
const dates=[...new Set(snapshot.stocks.flatMap(s=>s.prices.map(p=>p.date)))].sort().slice(-20);
async function load(){const api=createFuyao(),receipts:Awaited<ReturnType<typeof api.institution>>[]=[];for(const date of dates)receipts.push(await api.institution(date));return {dates,coverage:20,stocks:snapshot.stocks.map(s=>({code:s.code,metrics:institutionalMetrics(s.code,dates,receipts)})),evidence:receipts,note:'完整查询20个交易日机构榜；仅计range_days=1。0表示未见当日榜记录，不代表没有机构交易。未上榜或缺成交金额时，净买入占比未知。'}}
let cached:ReturnType<typeof load>|null=null;
export async function GET(){try{cached??=load().catch(e=>{cached=null;throw e});return Response.json(await cached,{headers:{'Cache-Control':'private, no-store'}})}catch(e){return Response.json({error:e instanceof ProviderError?e.message:'机构榜获取失败，未启用该指标。'},{status:502})}}
