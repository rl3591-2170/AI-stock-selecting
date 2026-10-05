// Read the owner-private Sites bypass credential from hidden stdin; never persist it.
import readline from 'node:readline';
import {writeFileSync} from 'node:fs';
import {roster} from '../lib/roster.ts';
import {initialPlan} from '../lib/screener.ts';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for production verification JSON on stdin (input is hidden).\n');
let text='';const input=await new Promise(resolve=>{process.stdin.on('data',c=>{text+=c.toString();if(text.includes('\n')){process.stdin.pause();resolve(JSON.parse(text.trim()))}})});
const {origin,token}=input;
const headers={'OAI-Sites-Authorization':`Bearer ${token}`};
async function request(path,body){const r=await fetch(origin+path,{headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});let a;try{a=await r.json()}catch{a={error:'NON_JSON_RESPONSE'}}return {status:r.status,data:a};}
const context=await request('/api/market-status');const out={at:new Date().toISOString(),origin,context:{status:context.status,asOf:context.data.asOf,error:context.data.error},stocks:[],ai:null,ifind:null};console.log(out.context);
if(context.status===200){let cursor=0;async function worker(){while(cursor<roster.length){const s=roster[cursor++];const r=await request(`/api/stock-data?code=${s.code}&asOf=${context.data.asOf}`);out.stocks.push({code:s.code,status:r.status,error:r.data.error,hasQuote:typeof r.data.stock?.quote?.price==='number',hasCash:typeof r.data.stock?.metrics?.cashProfitRatio==='number',tradeDate:r.data.stock?.tradeDate});}}
 await Promise.all([worker(),worker()]);console.log({stocks:out.stocks.length,failed:out.stocks.filter(s=>s.status!==200),quoteCoverage:out.stocks.filter(s=>s.hasQuote).length});
 const ai=await request('/api/interpret',{prompt:'把市盈率设成二十到四十倍，别改其他要求。',plan:initialPlan,style:'fundamental',history:[],availableFields:[]});out.ai={status:ai.status,kind:ai.data.kind,mode:ai.data.mode,error:ai.data.error,semanticPass:ai.data.plan?.fundamental.some(r=>r.field==='pe'&&r.op==='>='&&r.value===20)&&ai.data.plan?.fundamental.some(r=>r.field==='pe'&&r.op==='<='&&r.value===40)};console.log(out.ai);
 const ifind=await request('/api/stock-evidence',{provider:'ifind',code:'600519',reportDate:'2026-06-30'});out.ifind={status:ifind.status,hasEvidence:!!ifind.data.evidence,error:ifind.data.error};console.log(out.ifind);
}
writeFileSync('work/v5-production-validation.json',JSON.stringify(out,null,2));
if(out.context.status!==200||out.stocks.length!==50||out.stocks.some(s=>s.status!==200)||out.ai?.semanticPass!==true||out.ifind?.status!==200)process.exitCode=1;
