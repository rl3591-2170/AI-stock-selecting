import {roster} from '../../../lib/roster';
import {loadOfficialStock,marketContext} from '../../../lib/official-data';
import {ProviderError} from '../../../lib/providers/fuyao';
import {createIfind} from '../../../lib/providers/ifind';
export async function POST(req:Request){
 let body:unknown;try{const text=await req.text();if(text.length>300)return Response.json({error:'请求过长。'},{status:400});body=JSON.parse(text)}catch{return Response.json({error:'请求格式无效。'},{status:400})}
 if(!body||typeof body!=='object')return Response.json({error:'请求格式无效。'},{status:400});const {code,provider,reportDate}=body as {code?:string;provider?:string;reportDate?:string};const stock=roster.find(s=>s.code===code);
 if(!stock||!['fuyao','ifind'].includes(provider||'')||reportDate&&!/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(reportDate))return Response.json({error:'请选择当前样本及有效报告期。'},{status:400});
 try{if(provider==='ifind'){const period=reportDate?`${reportDate}报告期`:'最新已披露报告期';const evidence=await createIfind().financials(`${stock.name}（${stock.code}）${period}加权净资产收益率、资产负债率、归母净利润，列出单位、报告期和披露日期`);return Response.json({evidence,role:'supplement',note:'iFinD原始财务证据，供核对报告期与单位；不自动覆盖扶摇筛选数据。'},{headers:{'Cache-Control':'private, no-store'}})}
 const s=await loadOfficialStock(stock,await marketContext());return Response.json({evidence:s.evidence,role:'primary-verification',note:`扶摇日线 ${s.tradeDate}、财务 ${s.reportDate}、最新估值。当前执行结果不因单股核验而静默改变。`},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof ProviderError?e.message:e instanceof Error&&e.message==='IFIND_HTTP_522'?'iFinD官方接口连接超时（HTTP 522），请稍后重试；扶摇筛选结果不受影响。':e instanceof Error&&/^IFIND_[A-Z_0-9]+$/.test(e.message)?e.message:'数据源网络或格式错误，未生成替代数据。'},{status:502})}
}
