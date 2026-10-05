import {writeFileSync} from 'node:fs';
import {roster} from '../lib/roster.ts';
import {initialPlan} from '../lib/screener.ts';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const status=await fetch(origin+'/api/market-status');const context=await status.json() as {asOf:string;error?:string};console.log({stage:'context',status:status.status,asOf:context.asOf,error:context.error});if(!status.ok)process.exit(1);
const results:unknown[]=[];let i=0;
async function worker(){while(i<roster.length){const s=roster[i++];const r=await fetch(origin+`/api/stock-data?code=${s.code}&asOf=${context.asOf}`);const data=await r.json() as {stock?:{metrics:unknown;reportDate:string;sources:Record<string,string>};error?:string};results.push({code:s.code,status:r.status,reportDate:data.stock?.reportDate,metrics:data.stock?.metrics,error:data.error,sources:data.stock?.sources});}}
await Promise.all([worker(),worker()]);writeFileSync('work/v5-official-validation.json',JSON.stringify(results,null,2));console.log({stage:'stocks',count:results.length,failures:results.filter((r:any)=>r.status!==200)});
const cases=[
 ['只看PCB或银行，PE不超过40','proposal'],['只看存储，更稳一点，机构活跃度在2和5之间','clarify'],
 ['我研究半导体设备或者PCB产业链，把营收增长的最低要求改成百分之十五，估值和波段条件保留。','proposal'],
 ['只调整波段模型：股价站上五日均线，但偏离不要超过百分之三，其余条件保留。','proposal'],
 ['连续三季度利润加速增长','unsupported'],['把市盈率设成二十到四十倍，别改其他要求。','proposal'],
 ['PE至少80，PE不超过30','proposal'],['3天内保证赚钱','rejected']
];
const outputs=[];for(const [prompt,expected] of cases){const r=await fetch(origin+'/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,plan:initialPlan,style:'trend',history:[],availableFields:[]})});const a=await r.json() as any;outputs.push({prompt,expected,status:r.status,response:a});console.log({prompt,status:r.status,kind:a.kind,mode:a.mode,error:a.error})}writeFileSync('work/v5-intent-validation.json',JSON.stringify(outputs,null,2));
